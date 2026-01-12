const { IBApi, Contract, Order, OrderAction, OrderType } = require('@stoqey/ib');
const logger = require('../../utils/logger');
const EventEmitter = require('events');

class TWSClient extends EventEmitter {
    constructor() {
        super();
        this.ib = null;
        this.connected = false;
        this.accountId = process.env.TWS_ACCOUNT_ID;
        this.positions = new Map();
        this.orders = new Map();
        this.accountSummary = {};
        this.nextOrderId = 1;
        this.connectionPromise = null;
    }

    /**
     * Connect to TWS Gateway
     */
    async connect() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        if (this.connected) {
            logger.info('Already connected to TWS Gateway');
            return true;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                logger.info('Connecting to Interactive Brokers TWS Gateway...');

                const config = {
                    clientId: parseInt(process.env.IB_CLIENT_ID) || 2,
                    host: process.env.IB_HOST || 'tws-gateway',
                    port: parseInt(process.env.IB_PORT) || 4004
                };

                logger.info(`Connecting to TWS: ${config.host}:${config.port} (clientId: ${config.clientId})`);

                this.ib = new IBApi(config);
                
                // Set up event handlers
                this.setupEventHandlers();
                
                // Connect with timeout
                const timeout = setTimeout(() => {
                    this.connectionPromise = null;
                    reject(new Error('Connection timeout - TWS Gateway did not respond within 30 seconds'));
                }, 30000);

                this.ib.on('connected', () => {
                    clearTimeout(timeout);
                    this.connected = true;
                    logger.info('✅ Successfully connected to TWS Gateway');
                    this.connectionPromise = null;
                    
                    // Request next valid order ID
                    this.ib.reqIds();
                    
                    // Request account updates
                    if (this.accountId) {
                        this.ib.reqAccountUpdates(true, this.accountId);
                    }
                    
                    resolve(true);
                });

                this.ib.on('error', (err, code, reqId) => {
                    if (!this.connected && code !== 2104 && code !== 2106 && code !== 2158) {
                        clearTimeout(timeout);
                        this.connectionPromise = null;
                        reject(new Error(`TWS Connection error: ${err.message} (code: ${code})`));
                    }
                });

                // Initiate connection
                this.ib.connect();
                
            } catch (error) {
                this.connectionPromise = null;
                logger.error('Failed to connect to TWS:', error);
                reject(error);
            }
        });

        return this.connectionPromise;
    }

    /**
     * Set up event handlers for TWS API
     */
    setupEventHandlers() {
        // Connection events
        this.ib.on('disconnected', () => {
            this.connected = false;
            logger.warn('Disconnected from TWS Gateway');
            this.emit('disconnected');
        });

        // Error handling
        this.ib.on('error', (err, code, reqId) => {
            // Ignore informational messages
            if (code === 2104 || code === 2106 || code === 2158) {
                logger.debug(`TWS Info (${code}): ${err.message}`);
                return;
            }
            
            logger.error(`TWS Error (${code}): ${err.message} [reqId: ${reqId}]`);
            this.emit('error', { error: err, code, reqId });
        });

        // Next valid order ID
        this.ib.on('nextValidId', (orderId) => {
            this.nextOrderId = orderId;
            logger.info(`Next valid order ID: ${orderId}`);
        });

        // Position updates
        this.ib.on('position', (account, contract, pos, avgCost) => {
            const key = `${contract.symbol}-${contract.secType}`;
            this.positions.set(key, {
                account,
                symbol: contract.symbol,
                secType: contract.secType,
                position: pos,
                averageCost: avgCost,
                contract
            });
            logger.debug(`Position update: ${contract.symbol} - ${pos} @ ${avgCost}`);
        });

        this.ib.on('positionEnd', () => {
            logger.debug('Position updates complete');
            this.emit('positionsUpdated', Array.from(this.positions.values()));
        });

        // Account updates
        this.ib.on('accountSummary', (reqId, account, tag, value, currency) => {
            this.accountSummary[tag] = { value, currency };
            logger.debug(`Account ${account}: ${tag} = ${value} ${currency}`);
        });

        // Order status updates
        this.ib.on('orderStatus', (orderId, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld, mktCapPrice) => {
            const orderInfo = {
                orderId,
                status,
                filled,
                remaining,
                avgFillPrice,
                lastFillPrice
            };
            this.orders.set(orderId, orderInfo);
            logger.info(`Order ${orderId} status: ${status} (filled: ${filled}, remaining: ${remaining})`);
            this.emit('orderStatus', orderInfo);
        });

        // Open orders
        this.ib.on('openOrder', (orderId, contract, order, orderState) => {
            logger.debug(`Open order ${orderId}: ${contract.symbol} ${order.action} ${order.totalQuantity}`);
        });

        // Execution reports
        this.ib.on('execDetails', (reqId, contract, execution) => {
            logger.info(`Execution: ${contract.symbol} ${execution.side} ${execution.shares} @ ${execution.price}`);
            this.emit('execution', { contract, execution });
        });
    }

    /**
     * Place a market order
     */
    async placeMarketOrder(symbol, action, quantity, secType = 'STK', exchange = 'SMART') {
        if (!this.connected) {
            await this.connect();
        }

        try {
            // Create contract
            const contract = {
                symbol: symbol.toUpperCase(),
                secType: secType,
                exchange: exchange,
                currency: 'USD'
            };

            // Create market order
            const order = {
                orderType: OrderType.MKT,
                action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
                totalQuantity: quantity,
                transmit: true
            };

            const orderId = this.nextOrderId++;

            logger.info(`Placing ${action} market order: ${quantity} ${symbol} (OrderID: ${orderId})`);

            // Place order
            this.ib.placeOrder(orderId, contract, order);

            return {
                success: true,
                orderId,
                symbol,
                action,
                quantity,
                orderType: 'MARKET'
            };

        } catch (error) {
            logger.error('Failed to place market order:', error);
            throw error;
        }
    }

    /**
     * Place a limit order
     */
    async placeLimitOrder(symbol, action, quantity, limitPrice, secType = 'STK', exchange = 'SMART') {
        if (!this.connected) {
            await this.connect();
        }

        try {
            const contract = {
                symbol: symbol.toUpperCase(),
                secType: secType,
                exchange: exchange,
                currency: 'USD'
            };

            const order = {
                orderType: OrderType.LMT,
                action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
                totalQuantity: quantity,
                lmtPrice: limitPrice,
                transmit: true
            };

            const orderId = this.nextOrderId++;

            logger.info(`Placing ${action} limit order: ${quantity} ${symbol} @ $${limitPrice} (OrderID: ${orderId})`);

            this.ib.placeOrder(orderId, contract, order);

            return {
                success: true,
                orderId,
                symbol,
                action,
                quantity,
                limitPrice,
                orderType: 'LIMIT'
            };

        } catch (error) {
            logger.error('Failed to place limit order:', error);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId) {
        if (!this.connected) {
            throw new Error('Not connected to TWS Gateway');
        }

        try {
            logger.info(`Cancelling order ${orderId}`);
            this.ib.cancelOrder(orderId);
            this.orders.delete(orderId);
            return { success: true, orderId };
        } catch (error) {
            logger.error(`Failed to cancel order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Get current positions
     */
    async getPositions() {
        if (!this.connected) {
            await this.connect();
        }

        // Request position updates
        this.ib.reqPositions();

        // Return current positions
        return Array.from(this.positions.values());
    }

    /**
     * Get account summary
     */
    async getAccountSummary() {
        if (!this.connected) {
            await this.connect();
        }

        // Request account summary
        const reqId = Math.floor(Math.random() * 10000);
        this.ib.reqAccountSummary(reqId, 'All', '$LEDGER');

        return this.accountSummary;
    }

    /**
     * Get open orders
     */
    async getOpenOrders() {
        if (!this.connected) {
            await this.connect();
        }

        this.ib.reqOpenOrders();
        return Array.from(this.orders.values());
    }

    /**
     * Disconnect from TWS
     */
    async disconnect() {
        if (this.ib && this.connected) {
            logger.info('Disconnecting from TWS Gateway...');
            this.ib.disconnect();
            this.connected = false;
        }
    }

    /**
     * Check connection status
     */
    isConnected() {
        return this.connected;
    }
}

// Export singleton instance
module.exports = new TWSClient();
