const express = require('express');
const router = express.Router();
const { getHistoricalData, getCurrentPrice, getMultipleQuotes } = require('../../services/market/dataFetcher');
const twsClient = require('../../services/ibkr/twsClient');
const logger = require('../../utils/logger');

// Search for stock symbols
router.get('/search/:pattern', async (req, res) => {
    try {
        const { pattern } = req.params;
        
        logger.info(`Symbol search for: ${pattern}`);
        
        const results = await twsClient.searchSymbols(pattern);
        
        res.json({
            pattern,
            results,
            count: results.length
        });
        
    } catch (error) {
        logger.error('Symbol search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get historical data
router.get('/history/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { timeframe = 'daily', limit = 100 } = req.query;
        
        const data = await getHistoricalData(ticker, timeframe, parseInt(limit));
        
        res.json(data);
        
    } catch (error) {
        logger.error('Historical data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current price
router.get('/quote/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        
        const quote = await getCurrentPrice(ticker);
        
        res.json(quote);
        
    } catch (error) {
        logger.error('Quote error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get multiple quotes
router.post('/quotes', async (req, res) => {
    try {
        const { tickers } = req.body;
        
        if (!tickers || !Array.isArray(tickers)) {
            return res.status(400).json({ error: 'Invalid tickers array' });
        }
        
        if (tickers.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 tickers per request' });
        }
        
        const quotes = await getMultipleQuotes(tickers);
        
        res.json({ count: quotes.length, quotes });
        
    } catch (error) {
        logger.error('Multiple quotes error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
