const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');

// GET /api/sentiment - Get market sentiment data
router.get('/', asyncHandler(async (req, res) => {
    logger.info('Sentiment API called');
    
    // Placeholder - will be implemented in Step 5
    res.json({
        message: 'Sentiment API - Coming in Step 5',
        vix: null,
        fearGreed: null,
        composite: null
    });
}));

module.exports = router;
