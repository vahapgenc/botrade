require('dotenv').config();

module.exports = {
    // API Keys
    api: {
        fmp: process.env.FMP_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        polygon: process.env.POLYGON_API_KEY,
        newsapi: process.env.NEWSAPI_KEY
    },
    
    // IBKR
    ibkr: {
        host: process.env.IB_HOST || 'localhost',
        port: parseInt(process.env.IB_PORT) || 7497,
        clientId: parseInt(process.env.IB_CLIENT_ID) || 1
    },
    
    // Database
    database: {
        url: process.env.DATABASE_URL
    },
    
    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    
    // Portfolio Settings
    portfolio: {
        initialBudget: 100000,
        maxPositionPct: parseInt(process.env.MAX_POSITION_PCT) || 10,
        maxSectorExposure: 50,
        maxTotalExposure: 80,
        reserveCashPct: 20,
        maxRiskPerTradePct: 2
    },
    
    // Cache Settings
    cache: {
        sentimentTTL: 3600,  // 1 hour
        analysisTTL: 1800,   // 30 minutes
        newsTTL: 1800        // 30 minutes
    },
    
    // Trading Settings
    trading: {
        minConfidence: parseInt(process.env.MIN_CONFIDENCE) || 70,
        maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES) || 10,
        maxDailyLossPct: 5,
        stopLossMultiplier: 2  // 2x ATR
    },
    
    // Environment
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000
};
