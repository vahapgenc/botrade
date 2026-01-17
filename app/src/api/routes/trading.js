const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');
const { AppError } = require('../../utils/errorHandler');
const orderService = require('../../services/ibkr/orderService');
const twsClient = require('../../services/ibkr/twsClient');

// GET /api/trading/status - Check TWS connection status
router.get('/status', asyncHandler(async (req, res) => {
    logger.info('Trading status API called');
    
    const status = await orderService.checkTradingStatus();
    
    res.json({
        success: true,
        ...status
    });
}));

// GET /api/trading/positions - Get current positions
router.get('/positions', asyncHandler(async (req, res) => {
    logger.info('Get positions API called');
    
    const positions = await orderService.getPositions();
    
    res.json({
        success: true,
        count: positions.length,
        positions
    });
}));

// GET /api/trading/account - Get account summary
router.get('/account', asyncHandler(async (req, res) => {
    logger.info('Get account summary API called');
    
    const summary = await orderService.getAccountSummary();
    
    res.json({
        accountId: summary.accountId || process.env.TWS_ACCOUNT_ID || '',
        accountName: summary.accountId || 'Paper Trading Account',
        netLiquidation: summary.netLiquidation || 0,
        cashBalance: summary.cashBalance || 0,
        buyingPower: summary.buyingPower || 0,
        currency: summary.currency || 'USD'
    });
}));

// GET /api/trading/orders - Get open orders
router.get('/orders', asyncHandler(async (req, res) => {
    logger.info('Get open orders API called');
    
    const orders = await orderService.getOpenOrders();
    
    res.json({
        success: true,
        count: orders.length,
        orders
    });
}));

// GET /api/trading/orders/history - Get order history
router.get('/orders/history', asyncHandler(async (req, res) => {
    logger.info('Get order history API called');
    
    const history = orderService.getOrderHistory();
    
    res.json({
        success: true,
        count: history.length,
        orders: history
    });
}));

// POST /api/trading/execute - Execute a single trade (stock or option)
router.post('/execute', asyncHandler(async (req, res) => {
    const { symbol, action, quantity, orderType, limitPrice, confidence, secType, strike, expiry, optionType } = req.body;
    
    if (!symbol || !action || !quantity) {
        throw new AppError('Missing required fields: symbol, action, quantity', 400);
    }
    
    if (!['BUY', 'SELL'].includes(action.toUpperCase())) {
        throw new AppError('Action must be BUY or SELL', 400);
    }
    
    // Validate options parameters if it's an option order
    if (secType === 'OPT' && (!strike || !expiry || !optionType)) {
        throw new AppError('Options orders require strike, expiry, and optionType', 400);
    }
    
    logger.info(`Trade execution requested: ${action} ${quantity} ${symbol}${secType === 'OPT' ? ` ${strike}${optionType} ${expiry}` : ''}`);
    
    const result = await orderService.executeTrade({
        symbol,
        action: action.toUpperCase(),
        quantity: parseInt(quantity),
        orderType: orderType || 'MARKET',
        limitPrice: limitPrice ? parseFloat(limitPrice) : null,
        confidence: confidence || 100,
        secType: secType || 'STK',
        strike: strike ? parseFloat(strike) : null,
        expiry: expiry || null,
        optionType: optionType || null
    });
    
    res.json(result);
}));

// POST /api/trading/execute/batch - Execute multiple trades
router.post('/execute/batch', asyncHandler(async (req, res) => {
    const { trades } = req.body;
    
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
        throw new AppError('trades must be a non-empty array', 400);
    }
    
    logger.info(`Batch trade execution requested: ${trades.length} trades`);
    
    const results = await orderService.executeBatchTrades(trades);
    
    res.json({
        success: true,
        count: results.length,
        results
    });
}));

// DELETE /api/trading/orders/:orderId - Cancel an order
router.delete('/orders/:orderId', asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    if (!orderId) {
        throw new AppError('Order ID is required', 400);
    }
    
    logger.info(`Order cancellation requested: ${orderId}`);
    
    const result = await orderService.cancelOrder(parseInt(orderId));
    
    res.json(result);
}));

// GET /api/trading/decisions - Get recent AI decisions
router.get('/decisions', asyncHandler(async (req, res) => {
    logger.info('Decisions API called');
    
    // This will be populated by your AI decision engine
    res.json({
        message: 'AI Decisions API - Integrate with AI engine',
        decisions: []
    });
}));

module.exports = router;
