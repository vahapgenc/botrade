const config = require('../config/settings');
const http = require('http');

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

console.log('✅ Docker environment validated');
console.log('\n📝 Next: Run Prisma migrations');
console.log('   docker-compose exec app npx prisma migrate dev --name init');

// Create a simple health check server
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(config.port, '0.0.0.0', () => {
    console.log(`\n✅ Health check server listening on port ${config.port}`);
    console.log(`   Health endpoint: http://localhost:${config.port}/health`);
});
