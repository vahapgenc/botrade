const express = require('express');
const router = express.Router();
const bot = require('../../bot');
const logger = require('../../utils/logger');
// Lazy load autoTrader to avoid circular dependency
// const autoTrader = require('../../services/trading/autoTrader');

// GET /api/bot/status
router.get('/status', (req, res) => {
    try {
        const status = bot.getStatus();
        res.json(status);
    } catch (error) {
        logger.error('Error getting bot status', error);
        res.status(500).json({ error: 'Failed to get bot status' });
    }
});

// POST /api/bot/start
router.post('/start', (req, res) => {
    try {
        bot.start();
        res.json({ message: 'Bot started successfully', status: bot.getStatus() });
    } catch (error) {
        logger.error('Error starting bot', error);
        res.status(500).json({ error: 'Failed to start bot' });
    }
});

// POST /api/bot/stop
router.post('/stop', (req, res) => {
    try {
        bot.stop();
        res.json({ message: 'Bot stopped successfully', status: bot.getStatus() });
    } catch (error) {
        logger.error('Error stopping bot', error);
        res.status(500).json({ error: 'Failed to stop bot' });
    }
});

// POST /api/bot/run-now
router.post('/run-now', async (req, res) => {
    try {
        // We can access autoTrader via require here if needed, or rely on bot.executeCycle()
        // If we want to check isRunning, we can check bot.getStatus().running
        const status = bot.getStatus();
        if (status.running) {
            return res.status(400).json({ error: 'Trading cycle is already running' });
        }
        
        // Trigger async but don't wait for completion to avoid timeout
        // Pass "true" to force execution even if market is closed
        bot.executeCycle(true).catch(err => logger.error('Manual run error:', err));
        
        res.json({ message: 'Manual trading cycle triggered', status: bot.getStatus() });
    } catch (error) {
        logger.error('Error executing manual run', error);
        res.status(500).json({ error: 'Failed to trigger manual run' });
    }
});

// GET /api/bot/logs
router.get('/logs', (req, res) => {
    try {
        const logs = logger.getRecentLogs ? logger.getRecentLogs() : [];
        res.json(logs);
    } catch (error) {
        // Don't log this error to avoid infinite loops if logging fails
        console.error('Error fetching logs', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;

module.exports = router;
