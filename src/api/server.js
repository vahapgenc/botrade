const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('../../config/settings');
const logger = require('../utils/logger');
const { errorHandler } = require('../utils/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'connected'
    });
});

// API Routes (to be added in next steps)
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/technical', require('./routes/technical'));
app.use('/api/market', require('./routes/market'));
app.use('/api/fundamental', require('./routes/fundamental'));

// Static files for dashboard (optional)
app.use(express.static(path.join(__dirname, '../web/public')));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
function startServer() {
    const PORT = config.port;
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Express server running on port ${PORT}`);
        logger.info(`   Health endpoint: http://localhost:${PORT}/health`);
        logger.info(`   API base: http://localhost:${PORT}/api`);
    });
}

module.exports = { app, startServer };
