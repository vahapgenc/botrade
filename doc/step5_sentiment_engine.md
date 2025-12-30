# STEP 5: Sentiment Engine (VIX + Fear & Greed)

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-4 completed
- ✅ Express server running
- ✅ API routes created

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 6**

---

## 🎯 Objectives
1. Implement VIX volatility fetcher
2. Implement Fear & Greed Index fetcher
3. Create sentiment engine orchestrator
4. Calculate composite sentiment score
5. Integrate with API routes

---

## ⏱️ Estimated Duration
**4-5 hours**

---

## 📝 Implementation Steps

### 5.1 Create VIX Fetcher
Create `src/services/sentiment/vixFetcher.js`:

```javascript
const axios = require('axios');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

async function fetchVIX() {
    try {
        const url = `https://financialmodelingprep.com/api/v3/quote/%5EVIX?apikey=${config.api.fmp}`;
        const response = await axios.get(url);
        
        if (!response.data || response.data.length === 0) {
            throw new Error('No VIX data received');
        }
        
        const vix = response.data[0];
        const value = vix.price;
        
        // Interpret VIX
        let interpretation, signal, signalStrength;
        if (value < 12) {
            interpretation = 'EXTREME_LOW';
            signal = 'CAUTION';
            signalStrength = 30;
        } else if (value < 20) {
            interpretation = 'NEUTRAL';
            signal = 'NEUTRAL';
            signalStrength = 50;
        } else if (value < 30) {
            interpretation = 'ELEVATED';
            signal = 'CAUTION';
            signalStrength = 70;
        } else {
            interpretation = 'EXTREME';
            signal = 'EXTREME_FEAR';
            signalStrength = 90;
        }
        
        const result = {
            currentValue: value,
            previousClose: vix.previousClose,
            change: vix.change,
            changePercent: vix.changesPercentage,
            interpretation,
            signal,
            signalStrength,
            timestamp: new Date(),
            recommendation: getRecommendation(interpretation)
        };
        
        logger.info(`VIX fetched: ${value} (${interpretation})`);
        return result;
        
    } catch (error) {
        logger.error('VIX fetch error:', error);
        throw error;
    }
}

function getRecommendation(interpretation) {
    const recommendations = {
        EXTREME_LOW: 'Market complacency - potential top',
        NEUTRAL: 'Normal market conditions',
        ELEVATED: 'Elevated fear - proceed with caution',
        EXTREME: 'Panic - contrarian buy zone'
    };
    return recommendations[interpretation];
}

module.exports = { fetchVIX };
```

### 5.2 Create Fear & Greed Fetcher
Create `src/services/sentiment/fearGreedFetcher.js`:

```javascript
const axios = require('axios');
const logger = require('../../utils/logger');

async function fetchFearGreed() {
    try {
        // CNN Fear & Greed Index API
        const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const value = response.data.fear_and_greed.score;
        const rating = response.data.fear_and_greed.rating;
        
        let interpretation, signal, signalStrength;
        if (value < 25) {
            interpretation = 'EXTREME_FEAR';
            signal = 'BUY';
            signalStrength = 80;
        } else if (value < 45) {
            interpretation = 'FEAR';
            signal = 'LEAN_BUY';
            signalStrength = 65;
        } else if (value < 55) {
            interpretation = 'NEUTRAL';
            signal = 'HOLD';
            signalStrength = 50;
        } else if (value < 75) {
            interpretation = 'GREED';
            signal = 'LEAN_SELL';
            signalStrength = 65;
        } else {
            interpretation = 'EXTREME_GREED';
            signal = 'SELL';
            signalStrength = 80;
        }
        
        const result = {
            currentValue: value,
            rating: rating,
            interpretation,
            signal,
            signalStrength,
            timestamp: new Date(),
            recommendation: `Market showing ${interpretation.toLowerCase().replace('_', ' ')}`
        };
        
        logger.info(`Fear & Greed fetched: ${value} (${rating})`);
        return result;
        
    } catch (error) {
        logger.error('Fear & Greed fetch error:', error);
        // Return neutral if fetch fails
        return {
            currentValue: 50,
            rating: 'Neutral',
            interpretation: 'NEUTRAL',
            signal: 'HOLD',
            signalStrength: 50,
            timestamp: new Date(),
            recommendation: 'Unable to fetch data - assuming neutral',
            error: true
        };
    }
}

module.exports = { fetchFearGreed };
```

### 5.3 Create Sentiment Engine Orchestrator
Create `src/services/sentiment/sentimentEngine.js`:

```javascript
const { fetchVIX } = require('./vixFetcher');
const { fetchFearGreed } = require('./fearGreedFetcher');
const logger = require('../../utils/logger');

async function getMarketSentiment() {
    try {
        logger.info('Fetching market sentiment...');
        
        // Fetch all indicators in parallel
        const [vix, fearGreed] = await Promise.all([
            fetchVIX(),
            fetchFearGreed()
        ]);
        
        // Calculate composite score (0-100)
        const compositeScore = calculateComposite(vix, fearGreed);
        
        const result = {
            timestamp: new Date(),
            vix,
            fearGreed,
            composite: compositeScore
        };
        
        logger.info(`Market sentiment complete. Composite: ${compositeScore.score} (${compositeScore.interpretation})`);
        return result;
        
    } catch (error) {
        logger.error('Sentiment engine error:', error);
        throw error;
    }
}

function calculateComposite(vix, fearGreed) {
    // Weighted average: VIX 40%, Fear & Greed 60%
    // VIX: Lower is bullish (invert for consistency)
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

### 5.4 Update Sentiment API Route
Update `src/api/routes/sentiment.js`:

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../utils/errorHandler');
const { getMarketSentiment } = require('../../services/sentiment/sentimentEngine');

// GET /api/sentiment - Get market sentiment data
router.get('/', asyncHandler(async (req, res) => {
    logger.info('Sentiment API called');
    
    const sentiment = await getMarketSentiment();
    
    res.json(sentiment);
}));

module.exports = router;
```

### 5.5 Create Test File
Create `tests/test-sentiment.js`:

```javascript
const { getMarketSentiment } = require('../src/services/sentiment/sentimentEngine');
const { fetchVIX } = require('../src/services/sentiment/vixFetcher');
const { fetchFearGreed } = require('../src/services/sentiment/fearGreedFetcher');

async function runTests() {
    console.log('🧪 Testing Sentiment Engine...\n');
    
    try {
        // Test 1: VIX Fetcher
        console.log('Test 1: VIX Fetcher');
        const vix = await fetchVIX();
        console.log('VIX Data:', {
            value: vix.currentValue,
            interpretation: vix.interpretation,
            signal: vix.signal
        });
        console.log('✅ VIX test passed\n');
        
        // Test 2: Fear & Greed Fetcher
        console.log('Test 2: Fear & Greed Fetcher');
        const fearGreed = await fetchFearGreed();
        console.log('Fear & Greed Data:', {
            value: fearGreed.currentValue,
            rating: fearGreed.rating,
            interpretation: fearGreed.interpretation
        });
        console.log('✅ Fear & Greed test passed\n');
        
        // Test 3: Complete Sentiment Engine
        console.log('Test 3: Complete Sentiment Engine');
        const sentiment = await getMarketSentiment();
        console.log('Composite Sentiment:', {
            score: sentiment.composite.score,
            interpretation: sentiment.composite.interpretation,
            signal: sentiment.composite.signal,
            confidence: sentiment.composite.confidence
        });
        console.log('✅ Sentiment engine test passed\n');
        
        console.log('🎉 All sentiment tests passed!');
        console.log('📝 You can now proceed to STEP 6');
        
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

Before proceeding to STEP 6, verify ALL items:

- [ ] `src/services/sentiment/vixFetcher.js` created
- [ ] `src/services/sentiment/fearGreedFetcher.js` created
- [ ] `src/services/sentiment/sentimentEngine.js` created
- [ ] `src/api/routes/sentiment.js` updated
- [ ] `tests/test-sentiment.js` created
- [ ] VIX data fetches successfully
- [ ] Fear & Greed data fetches successfully
- [ ] Composite score calculated correctly
- [ ] API endpoint returns full sentiment data
- [ ] All tests pass: `node tests/test-sentiment.js`

---

## 🧪 Testing

```bash
# Test 1: Run sentiment tests
node tests/test-sentiment.js
# Expected: All 3 tests pass with real market data

# Test 2: Test API endpoint
curl http://localhost:3000/api/sentiment
# Expected: JSON with vix, fearGreed, and composite data

# Test 3: Check logs
type logs\combined-*.log | Select-String "sentiment"
# Expected: Log entries showing VIX and Fear & Greed fetches
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: "FMP_API_KEY is undefined"
**Solution:**
1. Verify .env has `FMP_API_KEY=your_key_here`
2. Get free API key from https://financialmodelingprep.com
3. Restart server after adding key

### Issue 2: "Fear & Greed API returns 403"
**Solution:**
Already handled with fallback - returns neutral (50) if fetch fails. Check user-agent header is set.

### Issue 3: "VIX returns null data"
**Solution:**
1. Verify API key is valid: `echo $env:FMP_API_KEY`
2. Test API directly: `curl "https://financialmodelingprep.com/api/v3/quote/%5EVIX?apikey=YOUR_KEY"`
3. Check API limits (250 calls/day on free tier)

---

## 📊 Expected Output Examples

### VIX Response:
```json
{
  "currentValue": 18.5,
  "previousClose": 19.2,
  "change": -0.7,
  "changePercent": -3.65,
  "interpretation": "NEUTRAL",
  "signal": "NEUTRAL",
  "signalStrength": 50,
  "timestamp": "2025-12-30T10:00:00.000Z",
  "recommendation": "Normal market conditions"
}
```

### Composite Sentiment:
```json
{
  "timestamp": "2025-12-30T10:00:00.000Z",
  "vix": { ... },
  "fearGreed": { ... },
  "composite": {
    "score": 52,
    "interpretation": "NEUTRAL",
    "signal": "HOLD",
    "confidence": 50,
    "recommendation": "Balanced market sentiment - follow individual stock signals"
  }
}
```

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step6_redis_cache.md`

---

**Last Updated:** December 30, 2025
