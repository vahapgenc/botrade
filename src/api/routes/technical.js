const express = require('express');
const router = express.Router();
const { analyzeTechnicals } = require('../../services/technical/technicalAnalyzer');
const { getHistoricalData, extractPriceArrays } = require('../../services/market/dataFetcher');
const logger = require('../../utils/logger');

router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { timeframe = 'daily', limit = 250 } = req.query;
        
        logger.info(`Technical analysis request for ${ticker} (${timeframe})`);
        
        // Fetch market data
        const marketData = await getHistoricalData(ticker, timeframe, parseInt(limit));
        
        // Extract price arrays
        const priceData = extractPriceArrays(marketData);
        
        // Perform technical analysis
        const analysis = await analyzeTechnicals(priceData);
        
        res.json({
            ticker,
            timeframe,
            dataPoints: marketData.dataPoints,
            lastUpdate: marketData.fetchedAt,
            analysis
        });
        
    } catch (error) {
        logger.error('Technical analysis error:', error);
        
        if (error.message.includes('API')) {
            res.status(503).json({ 
                error: 'Market data service unavailable',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
