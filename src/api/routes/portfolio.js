const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');
const { prisma } = require('../../database/prisma');

// GET /api/portfolio - Get current portfolio positions
router.get('/', asyncHandler(async (req, res) => {
    logger.info('Portfolio API called');
    
    const positions = await prisma.portfolio.findMany({
        where: { status: 'OPEN' },
        orderBy: { entryDate: 'desc' }
    });
    
    res.json({
        positions: positions,
        totalPositions: positions.length
    });
}));

// GET /api/portfolio/history - Get trade history
router.get('/history', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    const trades = await prisma.tradeHistory.findMany({
        orderBy: { exitDate: 'desc' },
        take: limit
    });
    
    res.json({
        trades: trades,
        count: trades.length
    });
}));

// GET /api/portfolio/performance - Get performance metrics
router.get('/performance', asyncHandler(async (req, res) => {
    const trades = await prisma.tradeHistory.findMany({
        where: {
            exitDate: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
        }
    });
    
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.realizedPnL > 0).length;
    const losses = trades.filter(t => t.realizedPnL < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const avgWin = wins > 0 
        ? trades.filter(t => t.realizedPnL > 0).reduce((sum, t) => sum + t.realizedPnL, 0) / wins 
        : 0;
    const avgLoss = losses > 0 
        ? trades.filter(t => t.realizedPnL < 0).reduce((sum, t) => sum + t.realizedPnL, 0) / losses 
        : 0;
    
    res.json({
        period: '30 days',
        totalTrades,
        wins,
        losses,
        winRate: totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0,
        totalPnL: totalPnL.toFixed(2),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        profitFactor: avgLoss !== 0 ? (Math.abs(avgWin / avgLoss)).toFixed(2) : 0
    });
}));

module.exports = router;
