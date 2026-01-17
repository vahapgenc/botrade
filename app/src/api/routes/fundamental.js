const express = require('express');
const router = express.Router();
const { getFundamentals } = require('../../services/fundamental/fundamentalAnalyzer');
const twsClient = require('../../services/ibkr/twsClient');
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

// Get company calendar (earnings, dividends, splits) - useful for AI predictions
router.get('/:ticker/calendar', async (req, res) => {
    try {
        const { ticker } = req.params;
        
        logger.info(`Calendar request for ${ticker}`);
        
        const calendar = await twsClient.getCompanyCalendar(ticker);
        
        res.json({
            ticker,
            calendar,
            upcomingEvents: getUpcomingEvents(calendar),
            fetchedAt: new Date()
        });
        
    } catch (error) {
        logger.error('Calendar fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch calendar',
            details: error.message 
        });
    }
});

// Helper function to get upcoming events
function getUpcomingEvents(calendar) {
    const now = new Date();
    const allEvents = [
        ...calendar.earnings.map(e => ({ ...e, type: 'earnings' })),
        ...calendar.dividends.map(e => ({ ...e, type: 'dividend' })),
        ...calendar.splits.map(e => ({ ...e, type: 'split' }))
    ];
    
    return allEvents
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 10); // Next 10 events
}

module.exports = router;
