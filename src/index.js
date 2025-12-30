const config = require('../config/settings');
const logger = require('./utils/logger');
const { testConnection, disconnect } = require('./database/prisma');
const { startServer } = require('./api/server');

async function initialize() {
    logger.info('🚀 Trading Bot Initializing...');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    
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
    
    // Start Express server
    startServer();
    
    logger.info('✅ All systems initialized');
    logger.info('📝 Next: Proceed to STEP 5 (Sentiment Engine)');
}

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await disconnect();
    process.exit(0);
});

initialize().catch(error => {
    logger.error('Initialization failed:', error);
    process.exit(1);
});
