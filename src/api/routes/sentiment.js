const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');
const { getMarketSentiment } = require('../../services/sentiment/sentimentEngine');

// GET /api/sentiment - Get market sentiment data
router.get('/', asyncHandler(async (req, res) => {
    logger.info('Sentiment API called');
    
    const sentiment = await getMarketSentiment();
    
    res.json(sentiment);
}));

module.exports = router;
