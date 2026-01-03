const axios = require('axios');
const https = require('https');
const logger = require('../../utils/logger');

class IBKRClient {
    constructor() {
        this.baseURL = process.env.IBKR_API_URL || 'https://localhost:5000/v1/api';
        this.accountId = process.env.IBKR_ACCOUNT_ID;
        this.authenticated = false;
        this.sessionId = null;
        
        // Create axios instance with SSL verification disabled for localhost
        this.client = axios.create({
            baseURL: this.baseURL,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // Required for self-signed certs on localhost
            }),
            withCredentials: true, // Required for session cookies
            timeout: 30000
        });
        
        // Add response interceptor for session handling
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    logger.warn('Session expired, need to re-authenticate');
                    this.authenticated = false;
                }
                return Promise.reject(error);
            }
        );
    }
    
    async connect() {
        try {
            if (this.authenticated) {
                logger.info('Already authenticated with IBKR Client Portal');
                return true;
            }
            
            logger.info('Authenticating with IBKR Client Portal API...');
            
            // Step 1: Check if already authenticated (session exists)
            try {
                const statusResponse = await this.client.get('/iserver/auth/status');
                
                if (statusResponse.data.authenticated) {
                    logger.info('✅ Already authenticated with existing session');
                    this.authenticated = true;
                    this.sessionId = statusResponse.data.sessionId;
                    return true;
                }
            } catch (error) {
                logger.info('No existing session, need to authenticate');
            }
            
            // Step 2: Initialize session (tickle)
            logger.info('Initializing session...');
            await this.client.post('/tickle');
            
            // Step 3: SSO Validate (for paper trading or already logged in via browser)
            logger.info('Validating SSO...');
            const ssoResponse = await this.client.get('/sso/validate');
            
            if (ssoResponse.data.authenticated) {
                logger.info('✅ SSO authenticated');
                this.authenticated = true;
                return true;
            }
            
            // Step 4: Re-authenticate
            logger.info('Re-authenticating session...');
            const reauthResponse = await this.client.post('/iserver/reauthenticate');
            
            if (reauthResponse.data.message === 'triggered') {
                logger.info('✅ Re-authentication triggered');
                
                // Wait a moment for re-auth
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check status again
                const finalStatus = await this.client.get('/iserver/auth/status');
                
                if (finalStatus.data.authenticated) {
                    this.authenticated = true;
                    logger.info('✅ Connected to IBKR Client Portal successfully');
                    return true;
                }
            }
            
            throw new Error('Authentication failed. Please login via Client Portal Gateway web interface first.');
            
        } catch (error) {
            logger.error('IBKR Client Portal connection error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Client Portal Gateway. Make sure it is running on https://localhost:5000');
            }
            
            throw error;
        }
    }
    
    async getPositions() {
        try {
            if (!this.authenticated) {
                throw new Error('Not authenticated. Call connect() first.');
            }
            
            const response = await this.client.get(`/portfolio/${this.accountId}/positions/0`);
            
            const positions = response.data.map(pos => ({
                account: this.accountId,
                symbol: pos.ticker || pos.contractDesc,
                conid: pos.conid,
                position: pos.position,
                avgCost: pos.avgCost,
                marketPrice: pos.mktPrice,
                marketValue: pos.mktValue,
                unrealizedPnL: pos.unrealizedPnL,
                realizedPnL: pos.realizedPnL
            }));
            
            logger.info(`Retrieved ${positions.length} positions`);
            return positions;
            
        } catch (error) {
            logger.error('Error fetching positions:', error.message);
            throw error;
        }
    }
    
    async getPosition(symbol) {
        const positions = await this.getPositions();
        return positions.find(pos => pos.symbol === symbol) || null;
    }
    
    async placeOrder(symbol, action, quantity, orderType = 'MKT', limitPrice = null) {
        try {
            if (!this.authenticated) {
                throw new Error('Not authenticated. Call connect() first.');
            }
            
            logger.info(`Placing ${action} order: ${symbol} x ${quantity} @ ${orderType}`);
            
            // Step 1: Search for contract ID (conid)
            const searchResponse = await this.client.get(`/iserver/secdef/search`, {
                params: { symbol }
            });
            
            if (!searchResponse.data || searchResponse.data.length === 0) {
                throw new Error(`Symbol ${symbol} not found`);
            }
            
            const conid = searchResponse.data[0].conid;
            logger.info(`Found conid ${conid} for ${symbol}`);
            
            // Step 2: Place order
            const orderPayload = {
                conid: conid,
                orderType: orderType,
                side: action, // BUY or SELL
                quantity: quantity,
                tif: 'DAY' // Time in force
            };
            
            if (orderType === 'LMT' && limitPrice) {
                orderPayload.price = limitPrice;
            }
            
            const orderResponse = await this.client.post(
                `/iserver/account/${this.accountId}/orders`,
                { orders: [orderPayload] }
            );
            
            // Step 3: Confirm order if needed
            if (orderResponse.data && orderResponse.data.length > 0) {
                const orderData = orderResponse.data[0];
                
                if (orderData.id) {
                    // Order confirmed with warnings - accept
                    const confirmResponse = await this.client.post(
                        `/iserver/reply/${orderData.id}`,
                        { confirmed: true }
                    );
                    
                    logger.info(`✅ Order placed: ID ${confirmResponse.data.order_id}`);
                    
                    return {
                        orderId: confirmResponse.data.order_id,
                        symbol,
                        action,
                        quantity,
                        orderType,
                        limitPrice,
                        status: 'SUBMITTED',
                        timestamp: new Date()
                    };
                }
            }
            
            logger.info(`✅ Order placed successfully`);
            return {
                orderId: orderResponse.data[0]?.order_id || 'pending',
                symbol,
                action,
                quantity,
                orderType,
                limitPrice,
                status: 'SUBMITTED',
                timestamp: new Date()
            };
            
        } catch (error) {
            logger.error('Order placement error:', error.message);
            throw error;
        }
    }
    
    async placeOptionsOrder(symbol, right, strike, expiry, action, quantity, orderType = 'MKT', limitPrice = null) {
        try {
            if (!this.authenticated) {
                throw new Error('Not authenticated. Call connect() first.');
            }
            
            logger.info(`Placing ${action} options order: ${symbol} ${right} ${strike} exp ${expiry} x ${quantity}`);
            
            // Step 1: Search for options contract
            const searchResponse = await this.client.get(`/iserver/secdef/search`, {
                params: { 
                    symbol,
                    secType: 'OPT'
                }
            });
            
            if (!searchResponse.data || searchResponse.data.length === 0) {
                throw new Error(`Options for ${symbol} not found`);
            }
            
            // Find matching strike and expiry
            const optionContract = searchResponse.data.find(opt => 
                opt.strike === strike && 
                opt.right === right &&
                opt.expiry === expiry
            );
            
            if (!optionContract) {
                throw new Error(`Options contract not found for ${symbol} ${right} ${strike} ${expiry}`);
            }
            
            const conid = optionContract.conid;
            logger.info(`Found options conid ${conid}`);
            
            // Step 2: Place order
            const orderPayload = {
                conid: conid,
                orderType: orderType,
                side: action,
                quantity: quantity,
                tif: 'DAY'
            };
            
            if (orderType === 'LMT' && limitPrice) {
                orderPayload.price = limitPrice;
            }
            
            const orderResponse = await this.client.post(
                `/iserver/account/${this.accountId}/orders`,
                { orders: [orderPayload] }
            );
            
            // Handle confirmation if needed
            if (orderResponse.data && orderResponse.data[0]?.id) {
                const confirmResponse = await this.client.post(
                    `/iserver/reply/${orderResponse.data[0].id}`,
                    { confirmed: true }
                );
                
                return {
                    orderId: confirmResponse.data.order_id,
                    symbol,
                    right,
                    strike,
                    expiry,
                    action,
                    quantity,
                    orderType,
                    limitPrice,
                    status: 'SUBMITTED',
                    timestamp: new Date()
                };
            }
            
            return {
                orderId: orderResponse.data[0]?.order_id || 'pending',
                symbol,
                right,
                strike,
                expiry,
                action,
                quantity,
                orderType,
                limitPrice,
                status: 'SUBMITTED',
                timestamp: new Date()
            };
            
        } catch (error) {
            logger.error('Options order placement error:', error.message);
            throw error;
        }
    }
    
    async cancelOrder(orderId) {
        try {
            await this.client.delete(`/iserver/account/${this.accountId}/order/${orderId}`);
            logger.info(`Order ${orderId} cancelled`);
            return true;
        } catch (error) {
            logger.error('Order cancellation error:', error.message);
            throw error;
        }
    }
    
    async getOrders() {
        try {
            if (!this.authenticated) {
                throw new Error('Not authenticated. Call connect() first.');
            }
            
            const response = await this.client.get(`/iserver/account/orders`);
            
            const orders = response.data.orders || [];
            return orders.map(order => ({
                orderId: order.orderId,
                symbol: order.ticker,
                action: order.side,
                quantity: order.totalSize,
                filled: order.filledQuantity,
                remaining: order.remainingQuantity,
                status: order.status,
                orderType: order.orderType
            }));
            
        } catch (error) {
            logger.error('Error fetching orders:', error.message);
            return [];
        }
    }
    
    async getOrder(orderId) {
        const orders = await this.getOrders();
        return orders.find(order => order.orderId === orderId) || null;
    }
    
    disconnect() {
        if (this.authenticated) {
            logger.info('Logging out from IBKR Client Portal...');
            this.client.post('/logout').catch(err => {
                logger.warn('Logout error:', err.message);
            });
            this.authenticated = false;
        }
    }
    
    isConnected() {
        return this.authenticated;
    }
}

// Singleton instance
const ibkrClient = new IBKRClient();

module.exports = ibkrClient;
