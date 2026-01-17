const twsClient = require('./twsClient');
const logger = require('../../utils/logger');
const prisma = require('../../database/prisma');

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
            
            logger.info(`Retrieved ${positions.length} positions from IBKR`);
            return positions;

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
