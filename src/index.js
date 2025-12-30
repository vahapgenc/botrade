const config = require('../config/settings');
const logger = require('./utils/logger');
const { testConnection } = require('./database/prisma');
const http = require('http');

async function initialize() {
    logger.info('🚀 Trading Bot Initializing...');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    logger.info(`Port: ${config.port}`);
    logger.info(`IBKR Host: ${config.ibkr.host}:${config.ibkr.port}`);

    // Validate critical environment variables
    const requiredVars = ['FMP_API_KEY', 'OPENAI_API_KEY'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        logger.warn('Missing optional environment variables:', { missing });
        logger.warn('Some features may not work until API keys are configured');
    }

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        logger.error('Database connection failed');
        process.exit(1);
    }

    logger.info('✅ All systems initialized');
    logger.info('📝 Next: Proceed to STEP 4 (Express Server)');

    // Create a simple health check server
    const server = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'healthy', 
                database: 'connected',
                timestamp: new Date().toISOString() 
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(config.port, '0.0.0.0', () => {
        logger.info(`Health check server listening on port ${config.port}`);
        logger.info(`Health endpoint: http://localhost:${config.port}/health`);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

initialize().catch(error => {
    logger.error('Initialization failed:', error);
    process.exit(1);
});
