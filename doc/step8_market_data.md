# STEP 8: Market Data Fetcher

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-7 completed
- ✅ Technical indicators working
- ✅ FMP API key in .env (free tier OK)
- ✅ Redis caching operational

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 9**

---

## 🎯 Objectives
1. Create market data fetcher service
2. Implement FMP API integration
3. Add multi-timeframe support (daily, weekly, monthly)
4. Implement data caching for historical prices
5. Create price data transformation utilities
6. Integrate with technical analysis
7. Create comprehensive testing suite

---

## ⏱️ Estimated Duration
**2-3 hours**

---

## 📝 Implementation Steps

### 8.1 Create Market Data Fetcher Service
Create `src/services/market/dataFetcher.js`:

```javascript
const axios = require('axios');
const logger = require('../../utils/logger');
const { getCache, setCache } = require('../cache/cacheManager');

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

async function getHistoricalData(ticker, timeframe = 'daily', limit = 250) {
    try {
        const cacheKey = `market_data:${ticker}:${timeframe}:${limit}`;
        
        // Check cache first (4 hours for historical data)
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.info(`Cache HIT for market data: ${ticker} (${timeframe})`);
            return cached;
        }
        
        logger.info(`Fetching historical data for ${ticker} (${timeframe}, limit: ${limit})`);
        
        // Map timeframe to FMP endpoint
        let endpoint;
        switch (timeframe.toLowerCase()) {
            case 'daily':
                endpoint = 'historical-price-full';
                break;
            case 'weekly':
                endpoint = 'historical-price-full';
                break;
            case 'monthly':
                endpoint = 'historical-price-full';
                break;
            case 'intraday':
                endpoint = 'historical-chart/15min'; // 15-minute candles
                break;
            default:
                throw new Error(`Unsupported timeframe: ${timeframe}`);
        }
        
        const url = `${FMP_BASE_URL}/${endpoint}/${ticker}`;
        const params = {
            apikey: FMP_API_KEY
        };
        
        // Add timeframe-specific parameters
        if (timeframe === 'weekly' || timeframe === 'monthly') {
            params.timeseries = limit;
        } else if (timeframe === 'daily') {
            params.timeseries = limit;
        }
        
        const response = await axios.get(url, { params, timeout: 10000 });
        
        if (!response.data) {
            throw new Error('No data returned from FMP API');
        }
        
        // Extract historical data
        let historical;
        if (response.data.historical) {
            historical = response.data.historical;
        } else if (Array.isArray(response.data)) {
            historical = response.data;
        } else {
            throw new Error('Unexpected data format from FMP API');
        }
        
        if (!historical || historical.length === 0) {
            throw new Error(`No historical data available for ${ticker}`);
        }
        
        // Convert to standard format and reverse to oldest-first
        const formattedData = historical
            .slice(0, limit)
            .reverse()
            .map(candle => ({
                date: candle.date,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
                volume: parseInt(candle.volume),
                adjClose: candle.adjClose ? parseFloat(candle.adjClose) : parseFloat(candle.close)
            }));
        
        // Apply timeframe transformation if needed
        let processedData = formattedData;
        if (timeframe === 'weekly') {
            processedData = aggregateToWeekly(formattedData);
        } else if (timeframe === 'monthly') {
            processedData = aggregateToMonthly(formattedData);
        }
        
        const result = {
            ticker,
            timeframe,
            dataPoints: processedData.length,
            data: processedData,
            fetchedAt: new Date()
        };
        
        // Cache for 4 hours (14400 seconds)
        await setCache(cacheKey, result, 14400);
        logger.info(`Market data cached for ${ticker} (${processedData.length} candles)`);
        
        return result;
        
    } catch (error) {
        if (error.response) {
            logger.error(`FMP API error for ${ticker}:`, {
                status: error.response.status,
                data: error.response.data
            });
            
            if (error.response.status === 403) {
                throw new Error('FMP API access denied - check API key or rate limits');
            }
            if (error.response.status === 429) {
                throw new Error('FMP API rate limit exceeded - wait before retrying');
            }
        }
        
        logger.error(`Market data fetch error for ${ticker}:`, error.message);
        throw error;
    }
}

function aggregateToWeekly(dailyData) {
    const weekly = [];
    let currentWeek = [];
    
    dailyData.forEach((day, index) => {
        currentWeek.push(day);
        
        // Check if it's Friday or last day
        const dayOfWeek = new Date(day.date).getDay();
        const isLastDay = index === dailyData.length - 1;
        
        if (dayOfWeek === 5 || isLastDay) {
            if (currentWeek.length > 0) {
                weekly.push({
                    date: currentWeek[currentWeek.length - 1].date, // Use last day of week
                    open: currentWeek[0].open,
                    high: Math.max(...currentWeek.map(d => d.high)),
                    low: Math.min(...currentWeek.map(d => d.low)),
                    close: currentWeek[currentWeek.length - 1].close,
                    volume: currentWeek.reduce((sum, d) => sum + d.volume, 0),
                    adjClose: currentWeek[currentWeek.length - 1].adjClose
                });
                currentWeek = [];
            }
        }
    });
    
    return weekly;
}

function aggregateToMonthly(dailyData) {
    const monthly = {};
    
    dailyData.forEach(day => {
        const monthKey = day.date.substring(0, 7); // YYYY-MM
        
        if (!monthly[monthKey]) {
            monthly[monthKey] = {
                date: day.date,
                open: day.open,
                high: day.high,
                low: day.low,
                close: day.close,
                volume: day.volume,
                adjClose: day.adjClose,
                days: []
            };
        }
        
        monthly[monthKey].days.push(day);
        monthly[monthKey].close = day.close; // Update to latest close
        monthly[monthKey].adjClose = day.adjClose;
        monthly[monthKey].high = Math.max(monthly[monthKey].high, day.high);
        monthly[monthKey].low = Math.min(monthly[monthKey].low, day.low);
        monthly[monthKey].volume += day.volume;
        monthly[monthKey].date = day.date; // Use last day of month
    });
    
    return Object.values(monthly).map(m => ({
        date: m.date,
        open: m.open,
        high: m.high,
        low: m.low,
        close: m.close,
        volume: m.volume,
        adjClose: m.adjClose
    }));
}

function extractPriceArrays(marketData) {
    if (!marketData || !marketData.data) {
        throw new Error('Invalid market data format');
    }
    
    return {
        closes: marketData.data.map(d => d.close),
        opens: marketData.data.map(d => d.open),
        highs: marketData.data.map(d => d.high),
        lows: marketData.data.map(d => d.low),
        volumes: marketData.data.map(d => d.volume),
        dates: marketData.data.map(d => d.date)
    };
}

async function getCurrentPrice(ticker) {
    try {
        const cacheKey = `current_price:${ticker}`;
        
        // Check cache (1 minute for real-time data)
        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${FMP_BASE_URL}/quote/${ticker}`;
        const response = await axios.get(url, {
            params: { apikey: FMP_API_KEY },
            timeout: 5000
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error(`No quote data for ${ticker}`);
        }
        
        const quote = response.data[0];
        const result = {
            ticker: quote.symbol,
            price: parseFloat(quote.price),
            change: parseFloat(quote.change),
            changePercent: parseFloat(quote.changesPercentage),
            volume: parseInt(quote.volume),
            dayHigh: parseFloat(quote.dayHigh),
            dayLow: parseFloat(quote.dayLow),
            previousClose: parseFloat(quote.previousClose),
            timestamp: new Date(quote.timestamp * 1000)
        };
        
        // Cache for 1 minute (60 seconds)
        await setCache(cacheKey, result, 60);
        
        return result;
        
    } catch (error) {
        logger.error(`Error fetching current price for ${ticker}:`, error.message);
        throw error;
    }
}

async function getMultipleQuotes(tickers) {
    try {
        const cacheKey = `quotes:${tickers.join(',')}`;
        
        // Check cache (1 minute)
        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${FMP_BASE_URL}/quote/${tickers.join(',')}`;
        const response = await axios.get(url, {
            params: { apikey: FMP_API_KEY },
            timeout: 10000
        });
        
        if (!response.data) {
            throw new Error('No quote data returned');
        }
        
        const quotes = response.data.map(quote => ({
            ticker: quote.symbol,
            price: parseFloat(quote.price),
            change: parseFloat(quote.change),
            changePercent: parseFloat(quote.changesPercentage),
            volume: parseInt(quote.volume),
            marketCap: quote.marketCap,
            pe: quote.pe,
            timestamp: new Date(quote.timestamp * 1000)
        }));
        
        // Cache for 1 minute
        await setCache(cacheKey, quotes, 60);
        
        return quotes;
        
    } catch (error) {
        logger.error('Error fetching multiple quotes:', error.message);
        throw error;
    }
}

module.exports = {
    getHistoricalData,
    extractPriceArrays,
    getCurrentPrice,
    getMultipleQuotes
};
```

### 8.2 Update Technical Route to Use Market Data
Update `src/api/routes/technical.js`:

```javascript
const express = require('express');
const router = express.Router();
const { analyzeTechnicals } = require('../../services/technical/technicalAnalyzer');
const { getHistoricalData, extractPriceArrays } = require('../../services/market/dataFetcher');
const logger = require('../../utils/logger');

router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { timeframe = 'daily', limit = 250 } = req.query;
        
        logger.info(`Technical analysis request for ${ticker} (${timeframe})`);
        
        // Fetch market data
        const marketData = await getHistoricalData(ticker, timeframe, parseInt(limit));
        
        // Extract price arrays
        const priceData = extractPriceArrays(marketData);
        
        // Perform technical analysis
        const analysis = await analyzeTechnicals(priceData);
        
        res.json({
            ticker,
            timeframe,
            dataPoints: marketData.dataPoints,
            lastUpdate: marketData.fetchedAt,
            analysis
        });
        
    } catch (error) {
        logger.error('Technical analysis error:', error);
        
        if (error.message.includes('API')) {
            res.status(503).json({ 
                error: 'Market data service unavailable',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
```

### 8.3 Create Market Data Route
Create `src/api/routes/market.js`:

```javascript
const express = require('express');
const router = express.Router();
const { getHistoricalData, getCurrentPrice, getMultipleQuotes } = require('../../services/market/dataFetcher');
const logger = require('../../utils/logger');

// Get historical data
router.get('/history/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { timeframe = 'daily', limit = 100 } = req.query;
        
        const data = await getHistoricalData(ticker, timeframe, parseInt(limit));
        
        res.json(data);
        
    } catch (error) {
        logger.error('Historical data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current price
router.get('/quote/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        
        const quote = await getCurrentPrice(ticker);
        
        res.json(quote);
        
    } catch (error) {
        logger.error('Quote error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get multiple quotes
router.post('/quotes', async (req, res) => {
    try {
        const { tickers } = req.body;
        
        if (!tickers || !Array.isArray(tickers)) {
            return res.status(400).json({ error: 'Invalid tickers array' });
        }
        
        if (tickers.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 tickers per request' });
        }
        
        const quotes = await getMultipleQuotes(tickers);
        
        res.json({ count: quotes.length, quotes });
        
    } catch (error) {
        logger.error('Multiple quotes error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### 8.4 Update Server with Market Route
Update `src/api/server.js`:

```javascript
// Add this line with other route imports
const marketRoutes = require('./routes/market');

// Add this line with other route registrations
app.use('/api/market', marketRoutes);
```

### 8.5 Create Comprehensive Test File
Create `tests/test-market-data.js`:

```javascript
require('dotenv').config();
const { getHistoricalData, extractPriceArrays, getCurrentPrice, getMultipleQuotes } = require('../src/services/market/dataFetcher');
const { analyzeTechnicals } = require('../src/services/technical/technicalAnalyzer');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing Market Data Fetcher...\n');
    
    try {
        // Initialize cache
        await initCache();
        
        // Test 1: Fetch daily data
        console.log('Test 1: Fetching daily historical data for AAPL...');
        const dailyData = await getHistoricalData('AAPL', 'daily', 250);
        console.log(`✅ Fetched ${dailyData.dataPoints} daily candles`);
        console.log(`   Latest: ${dailyData.data[dailyData.data.length - 1].date} @ $${dailyData.data[dailyData.data.length - 1].close}`);
        
        // Test 2: Extract price arrays
        console.log('\nTest 2: Extracting price arrays...');
        const priceArrays = extractPriceArrays(dailyData);
        console.log(`✅ Extracted ${priceArrays.closes.length} price points`);
        console.log(`   Close range: $${Math.min(...priceArrays.closes).toFixed(2)} - $${Math.max(...priceArrays.closes).toFixed(2)}`);
        
        // Test 3: Run technical analysis with real data
        console.log('\nTest 3: Running technical analysis...');
        const analysis = await analyzeTechnicals(priceArrays);
        console.log('✅ Technical analysis complete');
        console.log(`   Trend: ${analysis.trend.trend} (strength: ${analysis.trend.trendStrength})`);
        console.log(`   Composite Score: ${analysis.composite.score} (${analysis.composite.signal})`);
        console.log(`   RSI: ${analysis.momentum.rsi.value} (${analysis.momentum.rsi.interpretation})`);
        
        // Test 4: Get current price
        console.log('\nTest 4: Fetching current price...');
        const currentPrice = await getCurrentPrice('AAPL');
        console.log(`✅ Current: $${currentPrice.price} (${currentPrice.changePercent > 0 ? '+' : ''}${currentPrice.changePercent.toFixed(2)}%)`);
        console.log(`   Day Range: $${currentPrice.dayLow} - $${currentPrice.dayHigh}`);
        
        // Test 5: Get multiple quotes
        console.log('\nTest 5: Fetching multiple quotes...');
        const quotes = await getMultipleQuotes(['AAPL', 'MSFT', 'GOOGL']);
        console.log(`✅ Fetched ${quotes.length} quotes`);
        quotes.forEach(q => {
            console.log(`   ${q.ticker}: $${q.price} (${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`);
        });
        
        // Test 6: Test caching
        console.log('\nTest 6: Testing cache performance...');
        const start1 = Date.now();
        await getHistoricalData('MSFT', 'daily', 250);
        const time1 = Date.now() - start1;
        
        const start2 = Date.now();
        await getHistoricalData('MSFT', 'daily', 250);
        const time2 = Date.now() - start2;
        
        console.log(`✅ First fetch: ${time1}ms, Cached fetch: ${time2}ms`);
        console.log(`   Speed improvement: ${(time1 / time2).toFixed(1)}x faster`);
        
        // Test 7: Weekly aggregation
        console.log('\nTest 7: Fetching weekly data...');
        const weeklyData = await getHistoricalData('AAPL', 'weekly', 52);
        console.log(`✅ Fetched ${weeklyData.dataPoints} weekly candles`);
        console.log(`   Period: ${weeklyData.data[0].date} to ${weeklyData.data[weeklyData.data.length - 1].date}`);
        
        console.log('\n✅ All market data tests passed!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

runTests();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 9, verify ALL items:

- [ ] `src/services/market/dataFetcher.js` created
- [ ] `src/api/routes/market.js` created
- [ ] Technical route updated to use market data
- [ ] Server updated with market route
- [ ] `tests/test-market-data.js` created
- [ ] All tests pass: `node tests/test-market-data.js`
- [ ] Daily data fetching works
- [ ] Weekly/monthly aggregation works
- [ ] Current price fetching works
- [ ] Multiple quotes fetching works
- [ ] Cache performance verified (>5x speedup)
- [ ] Technical analysis works with real data

---

## 🧪 Testing

```bash
# Test 1: Run comprehensive market data tests
node tests/test-market-data.js
# Expected: All 7 tests pass, real data fetched

# Test 2: Test API endpoint for historical data
curl "http://localhost:3000/api/market/history/AAPL?timeframe=daily&limit=100"
# Expected: JSON with 100 daily candles

# Test 3: Test current price endpoint
curl http://localhost:3000/api/market/quote/AAPL
# Expected: Real-time quote data

# Test 4: Test multiple quotes
curl -X POST http://localhost:3000/api/market/quotes \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","MSFT","GOOGL"]}'
# Expected: Array of 3 quotes

# Test 5: Test technical analysis with real data
curl "http://localhost:3000/api/technical/AAPL?timeframe=daily&limit=250"
# Expected: Full technical analysis with real indicators

# Test 6: Verify caching (run same request twice)
curl http://localhost:3000/api/market/quote/AAPL
curl http://localhost:3000/api/market/quote/AAPL
# Expected: Second request much faster (check Docker logs for cache HIT)
```

---

## 🚨 Common Issues & Solutions

### Issue 1: 403 Forbidden from FMP API
**Solution:** 
- Verify FMP_API_KEY in .env is correct
- Check free tier limits (250 requests/day)
- Use historical-price-full endpoint instead of historical-chart

### Issue 2: Empty data returned
**Solution:**
- Verify ticker symbol is correct (use uppercase)
- Check if ticker exists on FMP (try on their website first)
- Some tickers require specific endpoints

### Issue 3: Rate limit exceeded (429)
**Solution:**
- Implement exponential backoff
- Increase cache TTL to reduce API calls
- Upgrade to paid FMP plan if needed

### Issue 4: Insufficient data for indicators
**Solution:**
- Increase limit parameter (need 200+ for SMA200)
- Check if ticker has enough trading history
- Use shorter indicators for newer stocks

---

## 📊 FMP API Reference

### Endpoints Used
```
1. Historical Price Full:
   GET /api/v3/historical-price-full/{ticker}?apikey={key}&timeseries={limit}
   
2. Real-time Quote:
   GET /api/v3/quote/{ticker}?apikey={key}
   
3. Multiple Quotes:
   GET /api/v3/quote/{ticker1,ticker2,ticker3}?apikey={key}
```

### Response Formats
**Historical Data:**
```json
{
  "symbol": "AAPL",
  "historical": [
    {
      "date": "2024-12-31",
      "open": 180.50,
      "high": 182.00,
      "low": 179.00,
      "close": 181.50,
      "adjClose": 181.50,
      "volume": 50000000
    }
  ]
}
```

**Quote Data:**
```json
{
  "symbol": "AAPL",
  "price": 181.50,
  "changesPercentage": 1.25,
  "change": 2.25,
  "dayLow": 179.00,
  "dayHigh": 182.00,
  "previousClose": 179.25,
  "volume": 50000000,
  "timestamp": 1735660800
}
```

---

## 🔧 Configuration

### Cache TTL Settings
```javascript
// Historical data: 4 hours (14400 seconds)
// Rationale: Daily bars don't change after market close

// Current price: 1 minute (60 seconds)
// Rationale: Real-time data needs frequent updates

// Multiple quotes: 1 minute (60 seconds)
// Rationale: Portfolio tracking needs recent data
```

### API Rate Limits
```
Free Tier:
- 250 requests/day
- No intraday data
- 5-year historical limit

Premium Tier ($14/month):
- 300 requests/minute
- Intraday data access
- 30+ years historical
```

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step9_fundamental_analysis.md`

---

**Last Updated:** December 31, 2025
