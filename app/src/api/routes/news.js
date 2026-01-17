const express = require('express');
const router = express.Router();
const { 
    getNewsForTicker, 
    getNewsByTopics, 
    getLatestMarketNews, 
    getSentimentSignal,
    getNewsAnalysis // Legacy
} = require('../../services/news/newsAnalyzer');
const logger = require('../../utils/logger');

// Get news for a specific ticker with sentiment analysis
router.get('/ticker/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { limit = 50, sort = 'LATEST', timeFrom, timeTo } = req.query;
        
        logger.info(`News request for ${ticker}`);
        
        const news = await getNewsForTicker(ticker, {
            limit: parseInt(limit),
            sort,
            timeFrom,
            timeTo
        });
        
        res.json(news);
        
    } catch (error) {
        logger.error('News fetch error:', error);
        
        if (error.message.includes('rate limit')) {
            res.status(429).json({ 
                error: 'Rate limit exceeded',
                details: error.message,
                note: 'Alpha Vantage free tier: 25 requests/day'
            });
        } else if (error.message.includes('not configured')) {
            res.status(500).json({ 
                error: 'API key not configured',
                details: 'ALPHA_VANTAGE_API_KEY environment variable is missing',
                solution: 'Get free key at https://www.alphavantage.co/support/#api-key'
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Get news by topics (e.g., technology, earnings, ipo)
router.get('/topics', async (req, res) => {
    try {
        const { topics, limit = 50, sort = 'LATEST', timeFrom, timeTo } = req.query;
        
        if (!topics) {
            return res.status(400).json({ 
                error: 'topics query parameter required',
                example: '/api/news/topics?topics=technology,earnings',
                availableTopics: [
                    'blockchain', 'earnings', 'ipo', 'mergers_and_acquisitions',
                    'financial_markets', 'economy_fiscal', 'economy_monetary', 'economy_macro',
                    'energy_transportation', 'finance', 'life_sciences', 'manufacturing',
                    'real_estate', 'retail_wholesale', 'technology'
                ]
            });
        }
        
        const topicsArray = topics.split(',').map(t => t.trim());
        logger.info(`News request for topics: ${topicsArray.join(', ')}`);
        
        const news = await getNewsByTopics(topicsArray, {
            limit: parseInt(limit),
            sort,
            timeFrom,
            timeTo
        });
        
        res.json(news);
        
    } catch (error) {
        logger.error('News topics fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get latest market news
router.get('/market/latest', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        logger.info('Latest market news request');
        
        const news = await getLatestMarketNews({ limit: parseInt(limit) });
        
        res.json(news);
        
    } catch (error) {
        logger.error('Market news fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get trading signal based on news sentiment
router.get('/signal/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { limit = 50 } = req.query;
        
        logger.info(`News signal request for ${ticker}`);
        
        const signal = await getSentimentSignal(ticker, { limit: parseInt(limit) });
        
        res.json(signal);
        
    } catch (error) {
        logger.error('News signal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Legacy endpoint for backward compatibility
router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { companyName, lookbackDays = 7 } = req.query;
        
        logger.info(`Legacy news analysis request for ${ticker}`);
        
        const analysis = await getNewsAnalysis(
            ticker, 
            companyName || ticker, 
            parseInt(lookbackDays)
        );
        
        res.json(analysis);
        
    } catch (error) {
        logger.error('News analysis error:', error);
        
        if (error.message.includes('rate limit')) {
            res.status(429).json({ 
                error: 'Rate limit exceeded',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;

