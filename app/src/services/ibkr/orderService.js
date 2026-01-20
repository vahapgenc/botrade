const twsClient = require('./twsClient');
const logger = require('../../utils/logger');
const { prisma } = require('../../database/prisma');

class OrderService {
    constructor() {
        this.orderHistory = [];
    }

    /**
     * Execute a trade based on AI decision
     */
    async executeTrade(tradeData) {
        const { symbol, action, quantity, orderType = 'MARKET', limitPrice = null, confidence, secType = 'STK', strike = null, expiry = null, optionType = null } = tradeData;

        try {
            logger.info(`Executing trade: ${action} ${quantity} ${symbol} (confidence: ${confidence}%)${secType === 'OPT' ? ` ${strike}${optionType} ${expiry}` : ''}`);

            // Validate minimum confidence
            const minConfidence = parseInt(process.env.MIN_CONFIDENCE) || 70;
            if (confidence < minConfidence) {
                logger.warn(`Trade rejected: Confidence ${confidence}% below minimum ${minConfidence}%`);
                return {
                    success: false,
                    reason: `Confidence below minimum threshold (${confidence}% < ${minConfidence}%)`
                };
            }

            // Connect to TWS if not connected
            if (!twsClient.isConnected()) {
                await twsClient.connect();
            }

            // Place order based on type
            let orderResult;
            
            if (secType === 'OPT') {
                // Options order
                if (!strike || !expiry || !optionType) {
                    throw new Error('Options orders require strike, expiry, and optionType');
                }
                orderResult = await twsClient.placeOptionOrder(
                    symbol, action, quantity, strike, expiry, optionType, 
                    orderType, limitPrice
                );
            } else {
                // Stock order
                if (orderType === 'LIMIT' && limitPrice) {
                    orderResult = await twsClient.placeLimitOrder(symbol, action, quantity, limitPrice);
                } else {
                    orderResult = await twsClient.placeMarketOrder(symbol, action, quantity);
                }
            }

            // Record order in database
            await this.recordOrder({
                ...orderResult,
                confidence,
                timestamp: new Date()
            });

            logger.info(`✅ Trade executed successfully: Order ${orderResult.orderId}`);

            return {
                success: true,
                order: orderResult
            };

        } catch (error) {
            logger.error('Failed to execute trade:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute multiple trades (batch)
     */
    async executeBatchTrades(trades) {
        logger.info(`Executing batch of ${trades.length} trades`);
        
        const results = [];
        for (const trade of trades) {
            const result = await this.executeTrade(trade);
            results.push(result);
            
            // Small delay between orders
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    /**
     * Get current positions from IBKR
     */
    async getPositions() {
        try {
            if (!twsClient.isConnected()) {
                await twsClient.connect();
            }

            const positions = await twsClient.getPositions();

            // Fetch executions from TWS api to find entry time
            let executions = [];
            try {
                executions = await twsClient.getExecutions({}); 
            } catch (execError) {
                logger.warn('Failed to fetch executions from TWS:', execError);
            }

            // Create a map of latest execution for each symbol
            const executionMap = new Map();
            if (executions && executions.length > 0) {
                executions.forEach(data => {
                    const symbol = data.symbol;
                    // We want the execution relevant to the current position
                    // For simplicity, we take the latest execution for that symbol
                    if (!executionMap.has(symbol) || data.time > executionMap.get(symbol).time) {
                        executionMap.set(symbol, data);
                    }
                });
            }

            // Fetch additional details from database (like entry date for older positions)
            try {
                const dbPositions = await prisma.portfolio.findMany({
                    where: {
                        status: 'OPEN'
                    }
                });

                // Create a map for quick lookup
                const dbPosMap = new Map(dbPositions.map(p => [p.ticker, p]));

                // Merge TWS data with DB data
                const enrichedPositions = positions.map(pos => {
                    const dbPos = dbPosMap.get(pos.symbol);
                    const lastExec = executionMap.get(pos.symbol);
                    
                    // Prefer TWS execution time if available (today's trades), otherwise DB entry date
                    let entryDate = null;
                    if (lastExec && lastExec.time) {
                        // TWS time format: 20230501  10:00:00
                        // Convert to ISO string for consistent frontend parsing
                        const t = lastExec.time;
                        if (t.length >= 8) {
                           const year = t.substring(0, 4);
                           const month = t.substring(4, 6);
                           const day = t.substring(6, 8);
                           // Basic date
                           let isoStr = `${year}-${month}-${day}`;
                           // Add time if available
                           if (t.length > 8) {
                               const timePart = t.substring(9).trim(); // Remove space
                               isoStr += `T${timePart}`;
                           }
                           entryDate = isoStr;
                        } else {
                           entryDate = lastExec.time;
                        }
                    } else if (dbPos) {
                        entryDate = dbPos.entryDate;
                    }

                    return {
                        ...pos,
                        entryDate: entryDate,
                        dbId: dbPos ? dbPos.id : null
                    };
                });
                
                logger.info(`Retrieved ${positions.length} positions from IBKR`);
                return enrichedPositions;
            } catch (dbError) {
                logger.warn('Failed to fetch positions from DB, returning TWS data only:', dbError);
                return positions;
            }

        } catch (error) {
            logger.error('Failed to get positions:', error);
            throw error;
        }
    }

    /**
     * Get account summary
     */
    async getAccountSummary() {
        try {
            if (!twsClient.isConnected()) {
                await twsClient.connect();
            }

            const summary = await twsClient.getAccountSummary();
            return summary;

        } catch (error) {
            logger.error('Failed to get account summary:', error);
            throw error;
        }
    }

    /**
     * Get open orders
     */
    async getOpenOrders() {
        try {
            if (!twsClient.isConnected()) {
                await twsClient.connect();
            }

            const orders = await twsClient.getOpenOrders();
            return orders;

        } catch (error) {
            logger.error('Failed to get open orders:', error);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId) {
        try {
            if (!twsClient.isConnected()) {
                await twsClient.connect();
            }

            const result = await twsClient.cancelOrder(orderId);
            
            logger.info(`Order ${orderId} cancelled`);
            return result;

        } catch (error) {
            logger.error(`Failed to cancel order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Record order in database
     */
    async recordOrder(orderData) {
        try {
            // You can extend this to save to your Prisma database
            this.orderHistory.push({
                ...orderData,
                recordedAt: new Date()
            });

            logger.debug(`Order recorded: ${orderData.orderId}`);
            
            // TODO: Save to Prisma database if needed
            // await prisma.order.create({ data: orderData });

        } catch (error) {
            logger.error('Failed to record order:', error);
        }
    }

    /**
     * Get order history
     */
    getOrderHistory() {
        return this.orderHistory;
    }

    /**
     * Check if ready to trade
     */
    async checkTradingStatus() {
        try {
            const isConnected = twsClient.isConnected();
            
            if (!isConnected) {
                await twsClient.connect();
            }

            return {
                connected: twsClient.isConnected(),
                accountId: process.env.TWS_ACCOUNT_ID,
                ready: true
            };

        } catch (error) {
            logger.error('Trading status check failed:', error);
            return {
                connected: false,
                ready: false,
                error: error.message
            };
        }
    }
}

module.exports = new OrderService();
