const config = require('../config/settings');

console.log('🚀 Trading Bot Initializing...');
console.log(`Environment: ${config.env}`);
console.log(`Port: ${config.port}`);

// Validate critical environment variables
const requiredVars = ['FMP_API_KEY', 'OPENAI_API_KEY', 'DATABASE_URL'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please configure .env file before continuing');
    process.exit(1);
}

console.log('✅ Environment validated');
console.log('\n📝 Next: Proceed to STEP 2 (Database Setup)');
