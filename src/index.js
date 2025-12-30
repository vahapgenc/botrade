const config = require('../config/settings');
const { testConnection } = require('./database/prisma');
const http = require('http');

async function initialize() {
    console.log('🐳 Botrade starting in Docker...');
    console.log(`Environment: ${config.env}`);
    console.log(`Port: ${config.port}`);
    console.log(`IBKR Host: ${config.ibkr.host}:${config.ibkr.port}`);

    // Validate critical environment variables
    const requiredVars = ['FMP_API_KEY', 'OPENAI_API_KEY'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.warn('⚠️  Missing optional environment variables:', missing);
        console.warn('Some features may not work until API keys are configured');
    }

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('❌ Database connection failed');
        process.exit(1);
    }

    console.log('✅ All systems initialized');
    console.log('\n📝 Next: Proceed to STEP 3 (Logging System)');

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
        console.log(`\n✅ Health check server listening on port ${config.port}`);
        console.log(`   Health endpoint: http://localhost:${config.port}/health`);
    });
}

initialize();
