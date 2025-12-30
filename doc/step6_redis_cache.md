# STEP 6: Redis Caching Layer

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-5 completed
- ✅ Sentiment engine working
- ✅ Redis container running in Docker

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 7**

---

## 🎯 Objectives
1. Install Redis client for Node.js
2. Create cache utility module
3. Implement get/set/delete operations
4. Add TTL (Time To Live) for auto-expiration
5. Integrate caching with sentiment engine
6. Add fallback for Redis unavailable

---

## ⏱️ Estimated Duration
**2-3 hours**

---

## 📝 Implementation Steps

### 6.1 Install Redis Client
```bash
npm install redis
```

### 6.2 Verify Redis Container Running
```bash
docker-compose ps
# Expected: botrade-redis shows "Up" and "healthy"

# Test Redis directly
docker-compose exec redis redis-cli ping
# Expected: PONG
```

### 6.3 Create Cache Utility
Create `src/services/cache/cacheManager.js`:

```javascript
const redis = require('redis');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

let client = null;
let connected = false;

// In-memory fallback cache
const memoryCache = new Map();

async function initCache() {
    try {
        client = redis.createClient({
            url: config.redis.url,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Redis reconnection failed after 10 attempts');
                        return new Error('Max reconnection attempts reached');
                    }
                    return retries * 100; // Exponential backoff
                }
            }
        });

        client.on('error', (err) => {
            logger.error('Redis client error:', err);
            connected = false;
        });

        client.on('connect', () => {
            logger.info('Redis client connected');
            connected = true;
        });

        client.on('ready', () => {
            logger.info('✅ Redis cache ready');
            connected = true;
        });

        await client.connect();
        
    } catch (error) {
        logger.warn('⚠️  Redis unavailable, using memory cache fallback');
        logger.error('Redis init error:', error);
        client = null;
        connected = false;
    }
}

async function get(key) {
    // Try Redis first
    if (connected && client) {
        try {
            const value = await client.get(key);
            if (value) {
                logger.debug(`Cache HIT (Redis): ${key}`);
                return JSON.parse(value);
            }
        } catch (error) {
            logger.error(`Redis GET error for ${key}:`, error);
        }
    }
    
    // Fallback to memory cache
    if (memoryCache.has(key)) {
        const cached = memoryCache.get(key);
        // Check if expired
        if (cached.expiry > Date.now()) {
            logger.debug(`Cache HIT (Memory): ${key}`);
            return cached.value;
        } else {
            memoryCache.delete(key);
        }
    }
    
    logger.debug(`Cache MISS: ${key}`);
    return null;
}

async function set(key, value, ttlSeconds = 3600) {
    // Try Redis first
    if (connected && client) {
        try {
            await client.setEx(key, ttlSeconds, JSON.stringify(value));
            logger.debug(`Cache SET (Redis): ${key} (TTL: ${ttlSeconds}s)`);
        } catch (error) {
            logger.error(`Redis SET error for ${key}:`, error);
        }
    }
    
    // Always set in memory cache as fallback
    memoryCache.set(key, {
        value: value,
        expiry: Date.now() + (ttlSeconds * 1000)
    });
    logger.debug(`Cache SET (Memory): ${key} (TTL: ${ttlSeconds}s)`);
}

async function del(key) {
    // Delete from Redis
    if (connected && client) {
        try {
            await client.del(key);
            logger.debug(`Cache DELETE (Redis): ${key}`);
        } catch (error) {
            logger.error(`Redis DELETE error for ${key}:`, error);
        }
    }
    
    // Delete from memory cache
    memoryCache.delete(key);
    logger.debug(`Cache DELETE (Memory): ${key}`);
}

async function clear() {
    // Clear Redis
    if (connected && client) {
        try {
            await client.flushDb();
            logger.info('Redis cache cleared');
        } catch (error) {
            logger.error('Redis CLEAR error:', error);
        }
    }
    
    // Clear memory cache
    memoryCache.clear();
    logger.info('Memory cache cleared');
}

async function disconnect() {
    if (client && connected) {
        try {
            await client.quit();
            logger.info('Redis client disconnected');
        } catch (error) {
            logger.error('Redis disconnect error:', error);
        }
    }
}

// Clean up expired memory cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, cached] of memoryCache.entries()) {
        if (cached.expiry <= now) {
            memoryCache.delete(key);
            logger.debug(`Memory cache expired: ${key}`);
        }
    }
}, 60000); // Every 1 minute

module.exports = {
    initCache,
    get,
    set,
    del,
    clear,
    disconnect
};
```

### 6.4 Update Sentiment Engine with Caching
Update `src/services/sentiment/sentimentEngine.js`:

```javascript
const { fetchVIX } = require('./vixFetcher');
const { fetchFearGreed } = require('./fearGreedFetcher');
const { get, set } = require('../cache/cacheManager');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

async function getMarketSentiment(forceRefresh = false) {
    try {
        const cacheKey = 'market_sentiment';
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = await get(cacheKey);
            if (cached) {
                logger.info('Returning cached market sentiment');
                return cached;
            }
        }
        
        logger.info('Fetching fresh market sentiment...');
        
        // Fetch all indicators in parallel
        const [vix, fearGreed] = await Promise.all([
            fetchVIX(),
            fetchFearGreed()
        ]);
        
        // Calculate composite score
        const compositeScore = calculateComposite(vix, fearGreed);
        
        const result = {
            timestamp: new Date(),
            vix,
            fearGreed,
            composite: compositeScore,
            cached: false
        };
        
        // Cache the result
        await set(cacheKey, result, config.cache.sentimentTTL);
        
        logger.info(`Market sentiment complete. Composite: ${compositeScore.score} (${compositeScore.interpretation})`);
        return result;
        
    } catch (error) {
        logger.error('Sentiment engine error:', error);
        throw error;
    }
}

function calculateComposite(vix, fearGreed) {
    // Weighted average: VIX 40%, Fear & Greed 60%
    const vixContribution = (100 - vix.signalStrength) * 0.4;
    const fearGreedContribution = fearGreed.currentValue * 0.6;
    
    const weightedScore = vixContribution + fearGreedContribution;
    
    let interpretation, signal, confidence;
    if (weightedScore < 30) {
        interpretation = 'EXTREME_BEARISH';
        signal = 'STRONG_BUY';
        confidence = 80;
    } else if (weightedScore < 45) {
        interpretation = 'BEARISH';
        signal = 'BUY';
        confidence = 65;
    } else if (weightedScore < 55) {
        interpretation = 'NEUTRAL';
        signal = 'HOLD';
        confidence = 50;
    } else if (weightedScore < 70) {
        interpretation = 'BULLISH';
        signal = 'SELL';
        confidence = 65;
    } else {
        interpretation = 'EXTREME_BULLISH';
        signal = 'STRONG_SELL';
        confidence = 80;
    }
    
    return {
        score: Math.round(weightedScore),
        interpretation,
        signal,
        confidence,
        recommendation: getCompositeRecommendation(interpretation)
    };
}

function getCompositeRecommendation(interpretation) {
    const recommendations = {
        EXTREME_BEARISH: 'Extreme fear in market - strong contrarian buy opportunity',
        BEARISH: 'Fear present - consider buying dips',
        NEUTRAL: 'Balanced market sentiment - follow individual stock signals',
        BULLISH: 'Greed present - consider taking profits',
        EXTREME_BULLISH: 'Extreme greed - strong contrarian sell signal'
    };
    return recommendations[interpretation];
}

module.exports = { getMarketSentiment };
```

### 6.5 Update Main Index to Initialize Cache
Update `src/index.js`:

```javascript
const config = require('../config/settings');
const logger = require('./utils/logger');
const { testConnection, disconnect: disconnectDb } = require('./database/prisma');
const { initCache, disconnect: disconnectCache } = require('./services/cache/cacheManager');
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
    
    // Initialize Redis cache
    await initCache();
    
    // Start Express server
    startServer();
    
    logger.info('✅ All systems initialized');
    logger.info('📝 Next: Proceed to STEP 7 (Technical Indicators)');
}

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await disconnectDb();
    await disconnectCache();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await disconnectDb();
    await disconnectCache();
    process.exit(0);
});

initialize().catch(error => {
    logger.error('Initialization failed:', error);
    process.exit(1);
});
```

### 6.6 Create Cache Test File
Create `tests/test-cache.js`:

```javascript
const { initCache, get, set, del, clear } = require('../src/services/cache/cacheManager');
const logger = require('../src/utils/logger');

async function runTests() {
    console.log('🧪 Testing Cache Manager...\n');
    
    try {
        // Test 1: Initialize cache
        console.log('Test 1: Initialize Cache');
        await initCache();
        console.log('✅ Cache initialized\n');
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Redis connection
        
        // Test 2: Set and Get
        console.log('Test 2: Set and Get');
        const testData = { ticker: 'AAPL', price: 180.50, timestamp: new Date() };
        await set('test_key', testData, 60);
        const retrieved = await get('test_key');
        console.log('Stored:', testData);
        console.log('Retrieved:', retrieved);
        if (JSON.stringify(testData) === JSON.stringify(retrieved)) {
            console.log('✅ Set/Get test passed\n');
        } else {
            throw new Error('Retrieved data does not match stored data');
        }
        
        // Test 3: Cache Miss
        console.log('Test 3: Cache Miss');
        const missing = await get('nonexistent_key');
        if (missing === null) {
            console.log('✅ Cache miss handled correctly\n');
        } else {
            throw new Error('Expected null for missing key');
        }
        
        // Test 4: Delete
        console.log('Test 4: Delete');
        await del('test_key');
        const afterDelete = await get('test_key');
        if (afterDelete === null) {
            console.log('✅ Delete test passed\n');
        } else {
            throw new Error('Key still exists after delete');
        }
        
        // Test 5: TTL Expiration (short TTL for testing)
        console.log('Test 5: TTL Expiration');
        await set('expiring_key', { test: 'data' }, 2); // 2 second TTL
        const beforeExpiry = await get('expiring_key');
        console.log('Before expiry:', beforeExpiry);
        console.log('Waiting 3 seconds for expiration...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const afterExpiry = await get('expiring_key');
        console.log('After expiry:', afterExpiry);
        if (beforeExpiry && afterExpiry === null) {
            console.log('✅ TTL expiration test passed\n');
        } else {
            throw new Error('TTL expiration did not work as expected');
        }
        
        // Test 6: Clear cache
        console.log('Test 6: Clear Cache');
        await set('key1', 'value1');
        await set('key2', 'value2');
        await clear();
        const after Clear1 = await get('key1');
        const afterClear2 = await get('key2');
        if (afterClear1 === null && afterClear2 === null) {
            console.log('✅ Clear cache test passed\n');
        } else {
            throw new Error('Cache not cleared properly');
        }
        
        console.log('🎉 All cache tests passed!');
        console.log('📝 You can now proceed to STEP 7');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 7, verify ALL items:

- [ ] Redis package installed (`redis` in package.json)
- [ ] `src/services/cache/cacheManager.js` created
- [ ] `src/services/sentiment/sentimentEngine.js` updated with caching
- [ ] `src/index.js` updated to initialize cache
- [ ] `tests/test-cache.js` created
- [ ] Redis container running and healthy
- [ ] All cache tests pass: `node tests/test-cache.js`
- [ ] Sentiment API uses cache (first call slow, second call fast)
- [ ] Memory fallback works if Redis unavailable

---

## 🧪 Testing

```bash
# Test 1: Run cache tests
node tests/test-cache.js
# Expected: All 6 tests pass

# Test 2: Test sentiment caching
curl http://localhost:3000/api/sentiment
# Note the response time

# Wait 1 second, then call again
curl http://localhost:3000/api/sentiment
# Expected: Much faster response, cached data

# Test 3: Check Redis directly
docker-compose exec redis redis-cli
> KEYS *
> GET market_sentiment
> TTL market_sentiment
> EXIT

# Test 4: Test with Redis down
docker-compose stop redis
node tests/test-cache.js
# Expected: Falls back to memory cache, still passes

# Restart Redis
docker-compose start redis
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: "Redis connection refused"
**Solution:**
```bash
# Check Redis container is running
docker-compose ps redis
# Expected: Up and healthy

# If not running, start it
docker-compose up -d redis

# Check logs
docker-compose logs redis
```

### Issue 2: "Memory cache not working"
**Solution:**
Already implemented as fallback. Check logs for "using memory cache fallback" message.

### Issue 3: "Cache returns stale data"
**Solution:**
1. Check TTL is set correctly (default 3600s = 1 hour)
2. Force refresh by passing `?refresh=true` in API call
3. Manually clear cache: `docker-compose exec redis redis-cli FLUSHDB`

---

## 📊 Cache Configuration

Default TTLs (in `config/settings.js`):
```javascript
cache: {
    sentimentTTL: 3600,  // 1 hour
    analysisTTL: 1800,   // 30 minutes
    newsTTL: 1800        // 30 minutes
}
```

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step7_technical_indicators.md`

---

**Last Updated:** December 30, 2025
