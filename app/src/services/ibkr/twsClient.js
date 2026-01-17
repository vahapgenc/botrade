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
        this.requestQueue = [];
        this.activeRequests = 0;
        this.maxConcurrentRequests = 3; // Limit concurrent requests to prevent crashes

        // Prevent crash on unhandled error events
        this.on('error', (err) => {
            logger.error('Unhandled TWSClient error:', err);
        });
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

        // Error handling with crash prevention
        this.ib.on('error', (err, code, reqId) => {
            // Ignore informational messages
            if (code === 2104 || code === 2106 || code === 2158) {
                logger.debug(`TWS Info (${code}): ${err.message}`);
                return;
            }
            
            // Prevent crashes on stream errors
            if (err.message && err.message.includes('write after end')) {
                logger.error(`TWS Stream Error: Connection closed unexpectedly. Reconnecting...`);
                this.connected = false;
                this.connectionPromise = null;
                return;
            }
            
            logger.error(`TWS Error (${code}): ${err.message} [reqId: ${reqId}]`);
            this.emit('error', { error: err, code, reqId });
        });

        // Handle uncaught stream errors
        this.ib.on('close', () => {
            logger.warn('TWS connection closed');
            this.connected = false;
            this.connectionPromise = null;
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
     * Place an option order
     */
    async placeOptionOrder(symbol, action, quantity, strike, expiry, optionType, orderType = 'LMT', limitPrice = null, secType = 'OPT', exchange = 'SMART') {
        if (!this.connected) {
            await this.connect();
        }

        try {
            // Create options contract
            const contract = {
                symbol: symbol.toUpperCase(),
                secType: secType,
                exchange: exchange,
                currency: 'USD',
                lastTradeDateOrContractMonth: expiry, // Format: YYYYMMDD
                strike: parseFloat(strike),
                right: optionType.toUpperCase() // 'C' for Call, 'P' for Put
            };

            const order = {
                action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
                totalQuantity: quantity,
                transmit: true
            };

            if (orderType === 'LMT') {
                order.orderType = OrderType.LMT;
                order.lmtPrice = limitPrice;
            } else {
                order.orderType = OrderType.MKT;
            }

            const orderId = this.nextOrderId++;

            logger.info(`Placing ${action} ${orderType} option order: ${quantity} ${symbol} ${expiry} ${strike}${optionType} @ ${limitPrice || 'MKT'} (OrderID: ${orderId})`);

            this.ib.placeOrder(orderId, contract, order);

            return {
                success: true,
                orderId,
                symbol,
                action,
                quantity,
                strike,
                expiry,
                optionType,
                limitPrice,
                orderType
            };

        } catch (error) {
            logger.error('Failed to place option order:', error);
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
     * Get account summary with detailed information
     */
    async getAccountSummary() {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve) => {
            const reqId = Math.floor(Math.random() * 10000);
            const summaryData = {};
            
            const summaryHandler = (id, account, tag, value, currency) => {
                if (id === reqId) {
                    summaryData[tag] = { value: parseFloat(value) || value, currency };
                }
            };
            
            const summaryEndHandler = (id) => {
                if (id === reqId) {
                    this.ib.removeListener('accountSummary', summaryHandler);
                    this.ib.removeListener('accountSummaryEnd', summaryEndHandler);
                    resolve({
                        accountId: this.accountId || summaryData.AccountCode?.value || '',
                        netLiquidation: summaryData.NetLiquidation?.value || 0,
                        cashBalance: summaryData.CashBalance?.value || summaryData.TotalCashValue?.value || 0,
                        buyingPower: summaryData.BuyingPower?.value || 0,
                        currency: summaryData.NetLiquidation?.currency || 'USD'
                    });
                }
            };
            
            this.ib.on('accountSummary', summaryHandler);
            this.ib.on('accountSummaryEnd', summaryEndHandler);
            
            // Request key account values
            this.ib.reqAccountSummary(reqId, 'All', 'NetLiquidation,TotalCashValue,BuyingPower,CashBalance');
            
            // Timeout after 5 seconds
            setTimeout(() => {
                this.ib.removeListener('accountSummary', summaryHandler);
                this.ib.removeListener('accountSummaryEnd', summaryEndHandler);
                resolve({
                    accountId: this.accountId || '',
                    netLiquidation: this.accountSummary.NetLiquidation?.value || 0,
                    cashBalance: this.accountSummary.CashBalance?.value || 0,
                    buyingPower: this.accountSummary.BuyingPower?.value || 0,
                    currency: 'USD'
                });
            }, 5000);
        });
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
     * Get historical market data from IBKR
     */
    async getHistoricalData(ticker, durationDays = 250, barSize = '1 day') {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);
            const historicalData = [];

            // Create stock contract
            const contract = {
                symbol: ticker,
                secType: 'STK',
                exchange: 'SMART',
                currency: 'USD'
            };

            // Set up listeners
            const dataHandler = (id, date, open, high, low, close, volume) => {
                if (id === reqId && date) {
                    // Convert date format (IBKR returns format: YYYYMMDD or YYYYMMDD HH:mm:ss)
                    let dateStr = date.toString();
                    if (dateStr.length === 8) {
                        // Format: YYYYMMDD -> YYYY-MM-DD
                        dateStr = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
                    } else {
                        // Contains time, extract date
                        dateStr = dateStr.split(' ')[0];
                        if (dateStr.length === 8) {
                            dateStr = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
                        }
                    }

                    historicalData.push({
                        date: dateStr,
                        timestamp: new Date(dateStr).getTime(),
                        open: parseFloat(open),
                        high: parseFloat(high),
                        low: parseFloat(low),
                        close: parseFloat(close),
                        volume: parseInt(volume)
                    });
                }
            };

            const endHandler = (id) => {
                if (id === reqId) {
                    this.ib.removeListener('historicalData', dataHandler);
                    this.ib.removeListener('historicalDataEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    resolve(historicalData);
                }
            };

            const errorHandler = (err, code, id) => {
                if (id === reqId) {
                    this.ib.removeListener('historicalData', dataHandler);
                    this.ib.removeListener('historicalDataEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    reject(new Error(`IBKR Error (${code}): ${err.message}`));
                }
            };

            this.ib.on('historicalData', dataHandler);
            this.ib.on('historicalDataEnd', endHandler);
            this.ib.on('error', errorHandler);

            // Calculate duration string
            const duration = `${durationDays} D`;
            
            // Request historical data
            // endDateTime: empty string means current time
            // durationStr: how far back to go
            // barSizeSetting: '1 day', '1 hour', etc.
            // whatToShow: 'TRADES', 'MIDPOINT', 'BID', 'ASK'
            // useRTH: 1 = regular trading hours only, 0 = include extended hours
            // formatDate: 1 = yyyymmdd{space}{space}hh:mm:dd, 2 = system date format
            this.ib.reqHistoricalData(
                reqId,
                contract,
                '', // endDateTime (empty = now)
                duration, // duration
                barSize, // barSize
                'TRADES', // whatToShow
                1, // useRTH (regular trading hours)
                1, // formatDate
                false, // keepUpToDate
                [] // chartOptions
            );

            // Timeout after 30 seconds
            setTimeout(() => {
                this.ib.removeListener('historicalData', dataHandler);
                this.ib.removeListener('historicalDataEnd', endHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error('IBKR historical data request timeout'));
            }, 30000);
        });
    }

    /**
     * Get news articles from IBKR
     * First gets contract ID, then fetches news for that contract
     */
    async getNewsArticles(ticker, options = {}) {
        if (!this.connected) {
            await this.connect();
        }

        const { limit = 50 } = options;

        // First, get the contract ID for the ticker
        let conId;
        try {
            const contractDetails = await this.getContractDetails(ticker);
            conId = contractDetails.conId;
            if (!conId) {
                logger.warn(`Could not get contract ID for ${ticker}, news may be unavailable`);
                return [];
            }
        } catch (error) {
            logger.error(`Failed to get contract details for ${ticker}:`, error.message);
            return [];
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);
            const newsArticles = [];

            // Set up listeners for news articles
            const newsHandler = (id, time, providerCode, articleId, headline, extraData) => {
                if (id === reqId) {
                    // Convert timestamp to date
                    const date = new Date(time * 1000); // IBKR returns Unix timestamp in seconds
                    
                    newsArticles.push({
                        articleId,
                        headline,
                        providerCode,
                        publishedAt: date.toISOString(),
                        timestamp: time,
                        extraData
                    });

                    // Limit the number of articles
                    if (newsArticles.length >= limit) {
                        this.ib.removeListener('historicalNews', newsHandler);
                        this.ib.removeListener('historicalNewsEnd', endHandler);
                        this.ib.removeListener('error', errorHandler);
                        resolve(newsArticles);
                    }
                }
            };

            const endHandler = (id, hasMore) => {
                if (id === reqId) {
                    this.ib.removeListener('historicalNews', newsHandler);
                    this.ib.removeListener('historicalNewsEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    resolve(newsArticles);
                }
            };

            const errorHandler = (err, code, id) => {
                if (id === reqId) {
                    this.ib.removeListener('historicalNews', newsHandler);
                    this.ib.removeListener('historicalNewsEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    
                    // Code 10197 means "No news available"
                    if (code === 10197) {
                        resolve([]);
                    } else {
                        reject(new Error(`IBKR News Error (${code}): ${err.message}`));
                    }
                }
            };

            this.ib.on('historicalNews', newsHandler);
            this.ib.on('historicalNewsEnd', endHandler);
            this.ib.on('error', errorHandler);

            // Request historical news with contract ID
            // Provider codes: BRFG+BRFUPDN (free default), BZ+FLY (requires subscription)
            try {
                this.ib.reqHistoricalNews(
                    reqId,
                    conId, // Contract ID (required)
                    'BRFG+BRFUPDN', // Free default providers
                    '', // startDateTime (empty = latest)
                    '', // endDateTime (empty = now)
                    limit, // totalResults
                    [] // historicalNewsOptions
                );
            } catch (err) {
                this.ib.removeListener('historicalNews', newsHandler);
                this.ib.removeListener('historicalNewsEnd', endHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error(`Failed to request news: ${err.message}`));
            }

            // Timeout after 15 seconds
            setTimeout(() => {
                this.ib.removeListener('historicalNews', newsHandler);
                this.ib.removeListener('historicalNewsEnd', endHandler);
                this.ib.removeListener('error', errorHandler);
                
                // Return whatever we got so far
                if (newsArticles.length > 0) {
                    resolve(newsArticles);
                } else {
                    reject(new Error('IBKR news request timeout'));
                }
            }, 15000);
        });
    }

    /**
     * Get contract details including contract ID
     */
    async getContractDetails(ticker) {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);

            const contract = {
                symbol: ticker,
                secType: 'STK',
                exchange: 'SMART',
                currency: 'USD'
            };

            const detailsHandler = (id, contractDetails) => {
                if (id === reqId) {
                    this.ib.removeListener('contractDetails', detailsHandler);
                    this.ib.removeListener('contractDetailsEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    
                    resolve({
                        conId: contractDetails.contract.conId,
                        symbol: contractDetails.contract.symbol,
                        exchange: contractDetails.contract.exchange,
                        longName: contractDetails.longName,
                        industry: contractDetails.industry,
                        category: contractDetails.category
                    });
                }
            };

            const endHandler = (id) => {
                if (id === reqId) {
                    this.ib.removeListener('contractDetails', detailsHandler);
                    this.ib.removeListener('contractDetailsEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    reject(new Error('No contract details found'));
                }
            };

            const errorHandler = (err, code, id) => {
                if (id === reqId) {
                    this.ib.removeListener('contractDetails', detailsHandler);
                    this.ib.removeListener('contractDetailsEnd', endHandler);
                    this.ib.removeListener('error', errorHandler);
                    reject(new Error(`IBKR Contract Error (${code}): ${err.message}`));
                }
            };

            this.ib.on('contractDetails', detailsHandler);
            this.ib.on('contractDetailsEnd', endHandler);
            this.ib.on('error', errorHandler);

            try {
                this.ib.reqContractDetails(reqId, contract);
            } catch (err) {
                this.ib.removeListener('contractDetails', detailsHandler);
                this.ib.removeListener('contractDetailsEnd', endHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error(`Failed to request contract details: ${err.message}`));
            }

            setTimeout(() => {
                this.ib.removeListener('contractDetails', detailsHandler);
                this.ib.removeListener('contractDetailsEnd', endHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error('Contract details request timeout'));
            }, 10000);
        });
    }

    /**
     * Get real-time market data (quote) from IBKR
     */
    async getMarketData(ticker) {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);
            const tickData = {
                ticker,
                price: null,
                bid: null,
                ask: null,
                volume: null,
                dayHigh: null,
                dayLow: null,
                previousClose: null
            };

            // Create stock contract
            const contract = {
                symbol: ticker,
                secType: 'STK',
                exchange: 'SMART',
                currency: 'USD'
            };

            // Set up listeners for tick data
            const tickPriceHandler = (id, tickType, price, attribs) => {
                if (id === reqId) {
                    switch (tickType) {
                        case 1: // Bid
                            tickData.bid = price;
                            break;
                        case 2: // Ask
                            tickData.ask = price;
                            break;
                        case 4: // Last
                            tickData.price = price;
                            break;
                        case 6: // High
                            tickData.dayHigh = price;
                            break;
                        case 7: // Low
                            tickData.dayLow = price;
                            break;
                        case 9: // Close (previous close)
                            tickData.previousClose = price;
                            break;
                    }
                }
            };

            const tickSizeHandler = (id, tickType, size) => {
                if (id === reqId) {
                    if (tickType === 8) { // Volume
                        tickData.volume = size;
                    }
                }
            };

            this.ib.on('tickPrice', tickPriceHandler);
            this.ib.on('tickSize', tickSizeHandler);

            // Request market data
            this.ib.reqMarketDataType(3); // 3 = Delayed Data
            this.ib.reqMktData(reqId, contract, '', false, false, []);

            // Wait for data to arrive, then cancel and resolve
            setTimeout(() => {
                this.ib.cancelMktData(reqId);
                this.ib.removeListener('tickPrice', tickPriceHandler);
                this.ib.removeListener('tickSize', tickSizeHandler);

                // Calculate change if we have both current price and previous close
                if (tickData.price && tickData.previousClose) {
                    tickData.change = tickData.price - tickData.previousClose;
                    tickData.changePercent = ((tickData.change / tickData.previousClose) * 100);
                }

                // Use last price if no bid/ask
                if (!tickData.price && tickData.bid && tickData.ask) {
                    tickData.price = (tickData.bid + tickData.ask) / 2;
                }

                if (tickData.price) {
                    resolve(tickData);
                } else {
                    reject(new Error('No price data received from IBKR'));
                }
            }, 2000); // Wait 2 seconds for data
        });
    }

    /**
     * Get fundamental data from IBKR
     * reportType can be: 'snapshot', 'ReportsFinSummary', 'ReportRatios', 'ReportsFinStatements', 'RESC', 'CalendarReport'
     */
    async getFundamentalData(ticker, reportType = 'snapshot') {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);

            // Create stock contract
            const contract = {
                symbol: ticker,
                secType: 'STK',
                exchange: 'SMART',
                currency: 'USD'
            };

            // Set up listener for fundamental data
            const fundamentalDataHandler = (id, data) => {
                if (id === reqId) {
                    this.ib.removeListener('fundamentalData', fundamentalDataHandler);
                    this.ib.removeListener('error', errorHandler);
                    
                    try {
                        // Data comes as XML string, parse it
                        resolve(data);
                    } catch (error) {
                        reject(new Error(`Failed to parse fundamental data: ${error.message}`));
                    }
                }
            };

            const errorHandler = (err, code, id) => {
                if (id === reqId) {
                    this.ib.removeListener('fundamentalData', fundamentalDataHandler);
                    this.ib.removeListener('error', errorHandler);
                    reject(new Error(`IBKR Fundamental Error (${code}): ${err.message}`));
                }
            };

            this.ib.on('fundamentalData', fundamentalDataHandler);
            this.ib.on('error', errorHandler);

            // Request fundamental data
            try {
                this.ib.reqFundamentalData(reqId, contract, reportType, []);
            } catch (err) {
                this.ib.removeListener('fundamentalData', fundamentalDataHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error(`Failed to request fundamental data: ${err.message}`));
            }

            // Timeout after 10 seconds
            setTimeout(() => {
                this.ib.removeListener('fundamentalData', fundamentalDataHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error('IBKR fundamental data request timeout'));
            }, 10000);
        });
    }

    /**
     * Get company calendar (earnings, dividends, splits, etc.) from IBKR
     */
    async getCompanyCalendar(ticker) {
        if (!this.connected) {
            await this.connect();
        }

        try {
            // CalendarReport includes earnings dates, ex-dividend dates, etc.
            const calendarData = await this.getFundamentalData(ticker, 'CalendarReport');
            
            // Parse XML data to extract calendar events
            const events = this.parseCalendarData(calendarData);
            
            return events;
        } catch (error) {
            throw new Error(`Failed to get calendar: ${error.message}`);
        }
    }

    /**
     * Parse calendar XML data to extract events
     */
    parseCalendarData(xmlData) {
        const events = {
            earnings: [],
            dividends: [],
            splits: []
        };

        try {
            // Extract earnings dates (format: YYYY-MM-DD)
            const earningsMatch = xmlData.match(/<EarningsDate>([^<]+)<\/EarningsDate>/g);
            if (earningsMatch) {
                earningsMatch.forEach(match => {
                    const date = match.replace(/<\/?EarningsDate>/g, '');
                    if (date && date !== 'N/A') {
                        events.earnings.push({
                            date,
                            type: 'earnings',
                            description: 'Earnings Report'
                        });
                    }
                });
            }

            // Extract dividend dates
            const dividendMatch = xmlData.match(/<ExDividendDate>([^<]+)<\/ExDividendDate>/g);
            if (dividendMatch) {
                dividendMatch.forEach(match => {
                    const date = match.replace(/<\/?ExDividendDate>/g, '');
                    if (date && date !== 'N/A') {
                        events.dividends.push({
                            date,
                            type: 'dividend',
                            description: 'Ex-Dividend Date'
                        });
                    }
                });
            }

            // Extract dividend amounts
            const dividendAmountMatch = xmlData.match(/<DividendAmount>([^<]+)<\/DividendAmount>/g);
            if (dividendAmountMatch && events.dividends.length > 0) {
                dividendAmountMatch.forEach((match, index) => {
                    const amount = match.replace(/<\/?DividendAmount>/g, '');
                    if (events.dividends[index]) {
                        events.dividends[index].amount = parseFloat(amount);
                    }
                });
            }

            // Extract split information
            const splitMatch = xmlData.match(/<SplitDate>([^<]+)<\/SplitDate>/g);
            if (splitMatch) {
                splitMatch.forEach(match => {
                    const date = match.replace(/<\/?SplitDate>/g, '');
                    if (date && date !== 'N/A') {
                        events.splits.push({
                            date,
                            type: 'split',
                            description: 'Stock Split'
                        });
                    }
                });
            }

            return events;
        } catch (error) {
            logger.warn(`Failed to parse calendar data: ${error.message}`);
            return events;
        }
    }

    /**
     * Search for stock symbols matching a pattern
     */
    async searchSymbols(pattern) {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);
            const matchingSymbols = [];

            // Set up listener for symbol samples
            const symbolSamplesHandler = (id, contractDescriptions) => {
                if (id === reqId) {
                    this.ib.removeListener('symbolSamples', symbolSamplesHandler);
                    this.ib.removeListener('error', errorHandler);

                    // Format the results
                    const results = contractDescriptions.map(desc => ({
                        symbol: desc.contract.symbol,
                        secType: desc.contract.secType,
                        primaryExchange: desc.contract.primaryExch,
                        currency: desc.contract.currency,
                        description: desc.derivativeSecTypes?.join(', ') || '',
                        conId: desc.contract.conId
                    }));

                    resolve(results);
                }
            };

            const errorHandler = (err, code, id) => {
                if (id === reqId) {
                    this.ib.removeListener('symbolSamples', symbolSamplesHandler);
                    this.ib.removeListener('error', errorHandler);
                    reject(new Error(`IBKR Symbol Search Error (${code}): ${err.message}`));
                }
            };

            this.ib.on('symbolSamples', symbolSamplesHandler);
            this.ib.on('error', errorHandler);

            // Request matching symbols
            try {
                this.ib.reqMatchingSymbols(reqId, pattern);
            } catch (err) {
                this.ib.removeListener('symbolSamples', symbolSamplesHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error(`Failed to search symbols: ${err.message}`));
            }

            // Timeout after 10 seconds
            setTimeout(() => {
                this.ib.removeListener('symbolSamples', symbolSamplesHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error('Symbol search timeout'));
            }, 10000);
        });
    }

    /**
     * Get option chain for a stock symbol
     */
    async getOptionChain(ticker, exchange = 'SMART') {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);
            const contractReqId = reqId + 1;
            let underlyingConId = null;

            // Step 1: Get the underlying contract's conId
            const contract = {
                symbol: ticker,
                secType: 'STK',
                exchange: exchange,
                currency: 'USD'
            };

            const optionChainData = {
                expirations: new Set(),
                strikes: new Set(),
                multiplier: '',
                exchange: '',
                underlyingConId: 0,
                tradingClass: ''
            };

            // Handler for contract details (to get conId)
            const contractDetailsHandler = (id, contractDetails) => {
                if (id === contractReqId) {
                    underlyingConId = contractDetails.contract.conId;
                    logger.info(`Found ConId for ${ticker}: ${underlyingConId}`);
                }
            };

            const contractDetailsEndHandler = (id) => {
                if (id === contractReqId) {
                    this.ib.removeListener('contractDetails', contractDetailsHandler);
                    this.ib.removeListener('contractDetailsEnd', contractDetailsEndHandler);

                    if (!underlyingConId) {
                        this.ib.removeListener('error', errorHandler);
                        reject(new Error(`Could not find contract for ${ticker}`));
                        return;
                    }

                    // Step 2: Now request option parameters with the conId
                    logger.info(`Fetching option parameters for ${ticker} (conId: ${underlyingConId})...`);
                    
                    try {
                        // Use empty string for exchange to get all venues
                        this.ib.reqSecDefOptParams(reqId, ticker, '', 'STK', underlyingConId);
                    } catch (err) {
                        this.ib.removeListener('securityDefinitionOptionParameter', secDefOptParamHandler);
                        this.ib.removeListener('securityDefinitionOptionParameterEnd', secDefOptParamEndHandler);
                        this.ib.removeListener('error', errorHandler);
                        reject(new Error(`Failed to request option parameters: ${err.message}`));
                    }
                }
            };

            // Handler for option chain parameters
            const secDefOptParamHandler = (id, exchange, returnedUnderlyingConId, tradingClass, multiplier, expirations, strikes) => {
                if (id === reqId) {
                    logger.info(`Received option params for ${tradingClass} on ${exchange}: ${expirations.length} expirations, ${strikes.length} strikes`);
                    
                    optionChainData.exchange = exchange;
                    optionChainData.underlyingConId = returnedUnderlyingConId;
                    optionChainData.multiplier = multiplier;
                    optionChainData.tradingClass = tradingClass;
                    
                    expirations.forEach(exp => optionChainData.expirations.add(exp));
                    strikes.forEach(strike => optionChainData.strikes.add(strike));
                }
            };

            const secDefOptParamEndHandler = (id) => {
                if (id === reqId) {
                    this.ib.removeListener('securityDefinitionOptionParameter', secDefOptParamHandler);
                    this.ib.removeListener('securityDefinitionOptionParameterEnd', secDefOptParamEndHandler);
                    this.ib.removeListener('error', errorHandler);

                    if (optionChainData.expirations.size === 0) {
                        reject(new Error(`No option data found for ${ticker}`));
                        return;
                    }

                    // Convert sets to sorted arrays
                    const result = {
                        ticker,
                        exchange: optionChainData.exchange,
                        underlyingConId: optionChainData.underlyingConId,
                        multiplier: optionChainData.multiplier,
                        tradingClass: optionChainData.tradingClass,
                        expirations: Array.from(optionChainData.expirations).sort(),
                        strikes: Array.from(optionChainData.strikes).sort((a, b) => a - b),
                        fetchedAt: new Date()
                    };

                    logger.info(`✅ Option chain for ${ticker}: ${result.expirations.length} expirations, ${result.strikes.length} strikes`);
                    resolve(result);
                }
            };

            const errorHandler = (err, code, id) => {
                if (id === reqId || id === contractReqId) {
                    this.ib.removeListener('contractDetails', contractDetailsHandler);
                    this.ib.removeListener('contractDetailsEnd', contractDetailsEndHandler);
                    this.ib.removeListener('securityDefinitionOptionParameter', secDefOptParamHandler);
                    this.ib.removeListener('securityDefinitionOptionParameterEnd', secDefOptParamEndHandler);
                    this.ib.removeListener('error', errorHandler);
                    reject(new Error(`IBKR Error (${code}): ${err.message || err}`));
                }
            };

            // Set up all listeners
            this.ib.on('contractDetails', contractDetailsHandler);
            this.ib.on('contractDetailsEnd', contractDetailsEndHandler);
            this.ib.on('securityDefinitionOptionParameter', secDefOptParamHandler);
            this.ib.on('securityDefinitionOptionParameterEnd', secDefOptParamEndHandler);
            this.ib.on('error', errorHandler);

            // Start by requesting contract details to get conId
            try {
                logger.info(`Searching for ${ticker} contract details...`);
                this.ib.reqContractDetails(contractReqId, contract);
            } catch (err) {
                this.ib.removeListener('contractDetails', contractDetailsHandler);
                this.ib.removeListener('contractDetailsEnd', contractDetailsEndHandler);
                this.ib.removeListener('securityDefinitionOptionParameter', secDefOptParamHandler);
                this.ib.removeListener('securityDefinitionOptionParameterEnd', secDefOptParamEndHandler);
                this.ib.removeListener('error', errorHandler);
                reject(new Error(`Failed to request contract details: ${err.message}`));
            }

            // Timeout after 20 seconds (need more time for two-step process)
            setTimeout(() => {
                this.ib.removeListener('contractDetails', contractDetailsHandler);
                this.ib.removeListener('contractDetailsEnd', contractDetailsEndHandler);
                this.ib.removeListener('securityDefinitionOptionParameter', secDefOptParamHandler);
                this.ib.removeListener('securityDefinitionOptionParameterEnd', secDefOptParamEndHandler);
                this.ib.removeListener('error', errorHandler);
                
                // Return partial data if we got something
                if (optionChainData.expirations.size > 0) {
                    resolve({
                        ticker,
                        exchange: optionChainData.exchange,
                        underlyingConId: optionChainData.underlyingConId,
                        multiplier: optionChainData.multiplier,
                        tradingClass: optionChainData.tradingClass,
                        expirations: Array.from(optionChainData.expirations).sort(),
                        strikes: Array.from(optionChainData.strikes).sort((a, b) => a - b),
                        fetchedAt: new Date()
                    });
                } else {
                    reject(new Error(`Option chain request timeout for ${ticker}`));
                }
            }, 20000);
        });
    }

    /**
     * Get option contract details for specific strike and expiration
     */
    async getOptionContract(ticker, expiration, strike, right = 'C', exchange = 'SMART') {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const reqId = Math.floor(Math.random() * 10000);

            // Create option contract
            const contract = {
                symbol: ticker,
                secType: 'OPT',
                exchange: exchange,
                currency: 'USD',
                lastTradeDateOrContractMonth: expiration.replace(/-/g, ''), // Format: YYYYMMDD
                strike: strike,
                right: right, // 'C' for call, 'P' for put
                multiplier: '100'
            };

            const tickData = {
                bid: null,
                ask: null,
                last: null,
                bidSize: null,
                askSize: null,
                volume: null,
                impliedVol: null,
                delta: null,
                gamma: null,
                theta: null,
                vega: null
            };

            // Set up listeners for option tick data
            const tickPriceHandler = (id, tickType, price, attribs) => {
                if (id === reqId) {
                    switch (tickType) {
                        case 1: tickData.bid = price; break;
                        case 2: tickData.ask = price; break;
                        case 4: tickData.last = price; break;
                    }
                }
            };

            const tickSizeHandler = (id, tickType, size) => {
                if (id === reqId) {
                    switch (tickType) {
                        case 0: tickData.bidSize = size; break;
                        case 3: tickData.askSize = size; break;
                        case 8: tickData.volume = size; break;
                    }
                }
            };

            const tickOptionComputationHandler = (id, tickType, tickAttrib, impliedVol, delta, optPrice, pvDividend, gamma, vega, theta, undPrice) => {
                if (id === reqId) {
                    tickData.impliedVol = impliedVol;
                    tickData.delta = delta;
                    tickData.gamma = gamma;
                    tickData.theta = theta;
                    tickData.vega = vega;
                }
            };

            this.ib.on('tickPrice', tickPriceHandler);
            this.ib.on('tickSize', tickSizeHandler);
            this.ib.on('tickOptionComputation', tickOptionComputationHandler);

            // Request market data
            this.ib.reqMarketDataType(3); // 3 = Delayed Data
            this.ib.reqMktData(reqId, contract, '', false, false, []);

            // Wait for data then resolve
            setTimeout(() => {
                this.ib.cancelMktData(reqId);
                this.ib.removeListener('tickPrice', tickPriceHandler);
                this.ib.removeListener('tickSize', tickSizeHandler);
                this.ib.removeListener('tickOptionComputation', tickOptionComputationHandler);

                resolve({
                    ticker,
                    expiration,
                    strike,
                    right,
                    bid: tickData.bid,
                    ask: tickData.ask,
                    last: tickData.last,
                    bidSize: tickData.bidSize,
                    askSize: tickData.askSize,
                    volume: tickData.volume,
                    impliedVolatility: tickData.impliedVol,
                    delta: tickData.delta,
                    gamma: tickData.gamma,
                    theta: tickData.theta,
                    vega: tickData.vega,
                    midPrice: (tickData.bid && tickData.ask) ? (tickData.bid + tickData.ask) / 2 : null
                });
            }, 3000); // Wait 3 seconds for data
        });
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
