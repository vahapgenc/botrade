const express = require('express');
const router = express.Router();
const { getFundamentals } = require('../../services/fundamental/fundamentalAnalyzer');
const logger = require('../../utils/logger');

router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        
        logger.info(`Fundamental analysis request for ${ticker}`);
        
        const fundamentals = await getFundamentals(ticker);
        
        res.json(fundamentals);
        
    } catch (error) {
        logger.error('Fundamental analysis error:', error);
        
        if (error.message.includes('No')) {
            res.status(404).json({ 
                error: 'Company not found or insufficient data',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
