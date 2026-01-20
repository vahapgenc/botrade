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
    // Skip logging for frequently polled endpoints to avoid flooding logs
    if (req.path === '/api/bot/status' || req.path === '/api/bot/logs') {
        return next();
    }
    
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

// API Routes (Loaded in startServer to avoid blocking startup)
function setupRoutes() {
    console.log('Loading /api/ai...');
    app.use('/api/ai', require('./routes/ai'));
    console.log('Loading /api/sentiment...');
    app.use('/api/sentiment', require('./routes/sentiment'));
    console.log('Loading /api/analysis...');
    app.use('/api/analysis', require('./routes/analysis'));
    console.log('Loading /api/trading...');
    app.use('/api/trading', require('./routes/trading'));
    console.log('Loading /api/portfolio...');
    app.use('/api/portfolio', require('./routes/portfolio'));
    console.log('Loading /api/technical...');
    app.use('/api/technical', require('./routes/technical'));
    console.log('Loading /api/market...');
    app.use('/api/market', require('./routes/market'));
    console.log('Loading /api/fundamental...');
    app.use('/api/fundamental', require('./routes/fundamental'));
    console.log('Loading /api/news...');
    app.use('/api/news', require('./routes/news'));
    console.log('Loading /api/watchlist...');
    app.use('/api/watchlist', require('./routes/watchlist'));
    console.log('Loading /api/options...');
    app.use('/api/options', require('./routes/options'));
    console.log('Loading /api/bot...');
    app.use('/api/bot', require('./routes/bot'));
    console.log('Routes loaded.');
}

// Dashboard routes - BEFORE 404 handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/dashboard.html'));
});

app.get('/dashboard.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/dashboard.js'));
});

app.get('/ai-order.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/ai-order.html'));
});

app.get('/ai-order.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/ai-order.js'));
});

app.get('/ai-data.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/ai-data.html'));
});

app.get('/ai-data.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/ai-data.js'));
});

app.get('/watchlist.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/watchlist.html'));
});

app.get('/watchlist.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/watchlist.js'));
});

app.get('/options.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/options.html'));
});

app.get('/options.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/options.js'));
});

// Static files for dashboard
app.use(express.static(path.join(__dirname, '../web')));



// Start server
function startServer() {
    setupRoutes();

    // 404 handler - MUST BE AFTER all other routes
    app.use((req, res) => {
        // Only send 404 if not a known API route
        res.status(404).json({ error: 'Route not found' });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    const PORT = config.port;
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Express server running on port ${PORT}`);
        logger.info(`   Health endpoint: http://localhost:${PORT}/health`);
        logger.info(`   API base: http://localhost:${PORT}/api`);
    });
}

module.exports = { app, startServer };
