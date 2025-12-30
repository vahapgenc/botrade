# STEP 4: Express Server & API Routes

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1 completed and verified
- ✅ STEP 2 completed and verified  
- ✅ STEP 3 completed and verified
- ✅ Logger utility working

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 5**

---

## 🎯 Objectives
1. Set up Express.js web server
2. Create REST API routes structure
3. Add middleware (JSON parsing, CORS, error handling)
4. Create health check endpoint
5. Test API endpoints

---

## ⏱️ Estimated Duration
**3-4 hours**

---

## 📝 Implementation Steps

### 4.1 Install Express and Middleware
```bash
npm install express cors
```

**Expected Output:**
```
added 3 packages, and audited 147 packages in 4s
```

### 4.2 Create Express Server
Create `src/api/server.js`:

```javascript
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
```

### 4.3 Create Placeholder API Route Files
Create `src/api/routes/sentiment.js`:

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');

// GET /api/sentiment - Get market sentiment data
router.get('/', asyncHandler(async (req, res) => {
    logger.info('Sentiment API called');
    
    // Placeholder - will be implemented in Step 5
    res.json({
        message: 'Sentiment API - Coming in Step 5',
        vix: null,
        fearGreed: null,
        composite: null
    });
}));

module.exports = router;
```

Create `src/api/routes/analysis.js`:

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');

// GET /api/analysis/:ticker - Get technical analysis for a ticker
router.get('/:ticker', asyncHandler(async (req, res) => {
    const { ticker } = req.params;
    const { timeframe } = req.query;
    
    logger.info(`Analysis API called for ${ticker}`);
    
    // Placeholder - will be implemented in Step 7
    res.json({
        message: 'Technical Analysis API - Coming in Step 7',
        ticker: ticker,
        timeframe: timeframe || '1day',
        indicators: null
    });
}));

module.exports = router;
```

Create `src/api/routes/trading.js`:

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');
const { AppError } = require('../../utils/errorHandler');

// GET /api/trading/decisions - Get recent AI decisions
router.get('/decisions', asyncHandler(async (req, res) => {
    logger.info('Decisions API called');
    
    // Placeholder - will be implemented in Step 11
    res.json({
        message: 'AI Decisions API - Coming in Step 11',
        decisions: []
    });
}));

// POST /api/trading/execute - Execute a trade
router.post('/execute', asyncHandler(async (req, res) => {
    const { ticker, action, quantity } = req.body;
    
    if (!ticker || !action || !quantity) {
        throw new AppError('Missing required fields', 400);
    }
    
    logger.info(`Trade execution requested: ${action} ${quantity} ${ticker}`);
    
    // Placeholder - will be implemented in Step 12
    res.json({
        message: 'Trade Execution API - Coming in Step 12',
        status: 'pending',
        ticker,
        action,
        quantity
    });
}));

module.exports = router;
```

Create `src/api/routes/portfolio.js`:

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');
const { prisma } = require('../../database/prisma');

// GET /api/portfolio - Get current portfolio positions
router.get('/', asyncHandler(async (req, res) => {
    logger.info('Portfolio API called');
    
    const positions = await prisma.portfolio.findMany({
        where: { status: 'OPEN' },
        orderBy: { entryDate: 'desc' }
    });
    
    res.json({
        positions: positions,
        totalPositions: positions.length
    });
}));

// GET /api/portfolio/history - Get trade history
router.get('/history', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    const trades = await prisma.tradeHistory.findMany({
        orderBy: { exitDate: 'desc' },
        take: limit
    });
    
    res.json({
        trades: trades,
        count: trades.length
    });
}));

// GET /api/portfolio/performance - Get performance metrics
router.get('/performance', asyncHandler(async (req, res) => {
    const trades = await prisma.tradeHistory.findMany({
        where: {
            exitDate: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
        }
    });
    
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.realizedPnL > 0).length;
    const losses = trades.filter(t => t.realizedPnL < 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const avgWin = wins > 0 
        ? trades.filter(t => t.realizedPnL > 0).reduce((sum, t) => sum + t.realizedPnL, 0) / wins 
        : 0;
    const avgLoss = losses > 0 
        ? trades.filter(t => t.realizedPnL < 0).reduce((sum, t) => sum + t.realizedPnL, 0) / losses 
        : 0;
    
    res.json({
        period: '30 days',
        totalTrades,
        wins,
        losses,
        winRate: totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(2) : 0,
        totalPnL: totalPnL.toFixed(2),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        profitFactor: avgLoss !== 0 ? (Math.abs(avgWin / avgLoss)).toFixed(2) : 0
    });
}));

module.exports = router;
```

### 4.4 Update Main Index File
Update `src/index.js`:

```javascript
const config = require('../config/settings');
const logger = require('./utils/logger');
const { testConnection, disconnect } = require('./database/prisma');
const { startServer } = require('./api/server');

async function initialize() {
    logger.info('🚀 Trading Bot Initializing...');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    
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
```

### 4.5 Update Dockerfile
Update `Dockerfile` to expose port 3000:

```dockerfile
# Expose port
EXPOSE 3000
```

### 4.6 Update docker-compose.yml
Ensure port mapping is correct:

```yaml
app:
  ports:
    - "3000:3000"
```

---

## ✅ Completion Checklist

Before proceeding to STEP 5, verify ALL items:

- [ ] Express installed (`express` in package.json)
- [ ] `src/api/server.js` created with middleware
- [ ] `src/api/routes/sentiment.js` created
- [ ] `src/api/routes/analysis.js` created
- [ ] `src/api/routes/trading.js` created
- [ ] `src/api/routes/portfolio.js` created
- [ ] `src/index.js` updated to start server
- [ ] Server starts without errors
- [ ] Health endpoint returns 200 OK: `http://localhost:3000/health`
- [ ] Portfolio API returns empty array: `http://localhost:3000/api/portfolio`
- [ ] All placeholder routes return expected JSON

---

## 🧪 Testing

```bash
# Test 1: Start the server
npm run dev
# Expected: Server starts on port 3000

# Test 2: Health check endpoint
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...,"memory":{...},"database":"connected"}

# Test 3: Sentiment API (placeholder)
curl http://localhost:3000/api/sentiment
# Expected: {"message":"Sentiment API - Coming in Step 5",...}

# Test 4: Portfolio API (real data)
curl http://localhost:3000/api/portfolio
# Expected: {"positions":[],"totalPositions":0}

# Test 5: Portfolio performance API
curl http://localhost:3000/api/portfolio/performance
# Expected: {"period":"30 days","totalTrades":0,...}

# Test 6: Analysis API with ticker
curl http://localhost:3000/api/analysis/AAPL
# Expected: {"message":"Technical Analysis API - Coming in Step 7","ticker":"AAPL",...}

# Test 7: Test error handling (invalid route)
curl http://localhost:3000/invalid
# Expected: {"error":"Route not found"}
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: "Cannot find module './routes/sentiment'"
**Solution:**
```bash
# Ensure all route files are created in correct location
dir src\api\routes
# Expected: sentiment.js, analysis.js, trading.js, portfolio.js
```

### Issue 2: "Port 3000 is already in use"
**Solution:**
```bash
# Option 1: Kill process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Option 2: Change port in .env
# Add: PORT=3001
```

### Issue 3: "Database connection failed" in health check
**Solution:**
1. Verify database is running: `docker-compose ps`
2. Test connection: `docker-compose exec postgres psql -U admin -d botrade -c "\dt"`
3. Check DATABASE_URL in .env matches docker-compose.yml

### Issue 4: CORS errors in browser
**Solution:**
Already handled with `cors` middleware. If issues persist:
```javascript
// In server.js, use specific CORS config
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
```

---

## 📊 Progress Tracking

**Current Status:** 🔴 NOT STARTED

- [ ] Started: YYYY-MM-DD
- [ ] Express installed: YYYY-MM-DD
- [ ] Server file created: YYYY-MM-DD
- [ ] Route files created: YYYY-MM-DD
- [ ] Tests passing: YYYY-MM-DD
- [ ] **COMPLETED:** YYYY-MM-DD

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step5_sentiment_engine.md`

**DO NOT proceed until:**
- ✅ All completion checklist items are done
- ✅ All tests pass
- ✅ Server responding to all API endpoints

---

## 📚 API Documentation

### Health Check
```
GET /health
Response: { status, timestamp, uptime, memory, database }
```

### Sentiment API
```
GET /api/sentiment
Response: { vix, fearGreed, composite }
```

### Analysis API
```
GET /api/analysis/:ticker?timeframe=1day
Response: { ticker, timeframe, indicators }
```

### Portfolio API
```
GET /api/portfolio
Response: { positions, totalPositions }

GET /api/portfolio/history?limit=50
Response: { trades, count }

GET /api/portfolio/performance
Response: { totalTrades, wins, losses, winRate, totalPnL, avgWin, avgLoss, profitFactor }
```

### Trading API
```
GET /api/trading/decisions
Response: { decisions }

POST /api/trading/execute
Body: { ticker, action, quantity }
Response: { status, ticker, action, quantity }
```

---

**Last Updated:** December 30, 2025
