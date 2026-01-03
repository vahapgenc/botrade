const express = require('express');
const router = express.Router();
const ibkrClient = require('../../services/ibkr/ibkrClient');
const { executeAIDecision } = require('../../services/ibkr/orderExecutor');
const { makeAIDecision } = require('../../services/ai/aiEngine');
const logger = require('../../utils/logger');

// Connect to IBKR
router.post('/connect', async (req, res) => {
    try {
        logger.info('Connecting to IBKR Client Portal via API request...');
        const result = await ibkrClient.connect();
        res.json({ 
            connected: result, 
            message: 'Connected to IBKR Client Portal',
            account: process.env.IBKR_ACCOUNT_ID,
            authenticated: result
        });
    } catch (error) {
        logger.error('IBKR Client Portal connect error:', error);
        res.status(500).json({ 
            error: error.message,
            hint: 'Make sure Client Portal Gateway is running and you have authenticated through the web interface'
        });
    }
});

// Check connection status
router.get('/status', async (req, res) => {
    try {
        const connected = ibkrClient.isConnected();
        res.json({
            connected,
            authenticated: connected,
            account: process.env.IBKR_ACCOUNT_ID,
            apiUrl: process.env.IBKR_API_URL,
            message: connected ? 'Connected to IBKR Client Portal' : 'Not connected to IBKR Client Portal'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disconnect from IBKR
router.post('/disconnect', (req, res) => {
    try {
        ibkrClient.disconnect();
        res.json({ message: 'Disconnected from IBKR' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current positions
router.get('/positions', async (req, res) => {
    try {
        if (!ibkrClient.isConnected()) {
            return res.status(400).json({ 
                error: 'Not connected to IBKR Client Portal',
                hint: 'Call POST /api/ibkr/connect first'
            });
        }
        
        // Get positions from Client Portal API
        const positions = await ibkrClient.getPositions();
        
        res.json({ 
            count: positions.length, 
            positions,
            totalValue: positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0)
        });
    } catch (error) {
        logger.error('Error fetching positions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get position for specific symbol
router.get('/positions/:symbol', (req, res) => {
    try {
        const { symbol } = req.params;
        const position = ibkrClient.getPosition(symbol.toUpperCase());
        
        if (!position) {
            return res.json({
                symbol: symbol.toUpperCase(),
                position: 0,
                message: 'No position in this symbol'
            });
        }
        
        res.json(position);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        if (!ibkrClient.isConnected()) {
            return res.status(400).json({ 
                error: 'Not connected to IBKR Client Portal',
                hint: 'Call POST /api/ibkr/connect first'
            });
        }
        
        const orders = await ibkrClient.getOrders();
        res.json({
            count: orders.length,
            orders
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Place stock order manually
router.post('/order/stock', async (req, res) => {
    try {
        const { symbol, action, quantity, orderType, limitPrice } = req.body;
        
        if (!symbol || !action || !quantity) {
            return res.status(400).json({ 
                error: 'symbol, action, and quantity required',
                example: {
                    symbol: 'AAPL',
                    action: 'BUY',
                    quantity: 10,
                    orderType: 'MKT'
                }
            });
        }
        
        if (!['BUY', 'SELL'].includes(action.toUpperCase())) {
            return res.status(400).json({ error: 'action must be BUY or SELL' });
        }
        
        if (!ibkrClient.isConnected()) {
            return res.status(400).json({ 
                error: 'Not connected to IBKR',
                hint: 'Call POST /api/ibkr/connect first'
            });
        }
        
        const order = await ibkrClient.placeOrder(
            symbol.toUpperCase(), 
            action.toUpperCase(), 
            parseInt(quantity), 
            orderType || 'MKT', 
            limitPrice ? parseFloat(limitPrice) : null
        );
        
        res.json({
            success: true,
            order,
            message: `${action} order placed for ${quantity} shares of ${symbol}`
        });
        
    } catch (error) {
        logger.error('Order placement error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Place options order manually
router.post('/order/options', async (req, res) => {
    try {
        const { symbol, right, strike, expiry, action, quantity, orderType, limitPrice } = req.body;
        
        if (!symbol || !right || !strike || !expiry || !action || !quantity) {
            return res.status(400).json({ 
                error: 'All fields required: symbol, right, strike, expiry, action, quantity',
                example: {
                    symbol: 'AAPL',
                    right: 'C',
                    strike: 250,
                    expiry: '20260221',
                    action: 'BUY',
                    quantity: 1,
                    orderType: 'LMT',
                    limitPrice: 5.50
                }
            });
        }
        
        if (!ibkrClient.isConnected()) {
            return res.status(400).json({ 
                error: 'Not connected to IBKR',
                hint: 'Call POST /api/ibkr/connect first'
            });
        }
        
        const order = await ibkrClient.placeOptionsOrder(
            symbol.toUpperCase(),
            right.toUpperCase(),
            parseFloat(strike),
            expiry,
            action.toUpperCase(),
            parseInt(quantity),
            orderType || 'LMT',
            limitPrice ? parseFloat(limitPrice) : null
        );
        
        res.json({
            success: true,
            order,
            message: `${action} options order placed`
        });
        
    } catch (error) {
        logger.error('Options order placement error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel order
router.delete('/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!ibkrClient.isConnected()) {
            return res.status(400).json({ 
                error: 'Not connected to IBKR'
            });
        }
        
        await ibkrClient.cancelOrder(parseInt(orderId));
        
        res.json({
            success: true,
            message: `Order ${orderId} cancelled`
        });
        
    } catch (error) {
        logger.error('Order cancellation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Execute AI decision (full workflow: analyze + execute)
router.post('/execute', async (req, res) => {
    try {
        const { ticker, companyName, tradingType } = req.body;
        
        if (!ticker || !companyName) {
            return res.status(400).json({ 
                error: 'ticker and companyName required',
                example: {
                    ticker: 'AAPL',
                    companyName: 'Apple Inc.',
                    tradingType: 'STOCK'
                }
            });
        }
        
        if (!ibkrClient.isConnected()) {
            return res.status(400).json({ 
                error: 'Not connected to IBKR',
                hint: 'Call POST /api/ibkr/connect first'
            });
        }
        
        logger.info(`Full AI execution workflow for ${ticker}...`);
        
        // Step 1: Get AI decision
        logger.info('Step 1: Getting AI decision...');
        const aiDecision = await makeAIDecision(ticker.toUpperCase(), companyName, tradingType || 'STOCK');
        
        // Step 2: Execute the decision
        logger.info('Step 2: Executing trade...');
        const execution = await executeAIDecision(aiDecision);
        
        res.json({
            success: true,
            aiDecision: {
                ticker: aiDecision.ticker,
                decision: aiDecision.decision,
                confidence: aiDecision.confidence,
                timeHorizon: aiDecision.timeHorizon,
                reasoning: aiDecision.reasoning,
                targetPrice: aiDecision.targetPrice,
                stopLoss: aiDecision.stopLoss
            },
            execution: {
                executed: execution.executed,
                action: execution.action,
                quantity: execution.quantity,
                reason: execution.reason,
                previousPosition: execution.previousPosition,
                newPosition: execution.newPosition
            }
        });
        
    } catch (error) {
        logger.error('Execution workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
