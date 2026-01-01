# STEP 7: Technical Indicators

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-6 completed
- ✅ Redis caching working
- ✅ Express server running
- ✅ Database connected

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 8**

---

## 🎯 Objectives
1. Install technical indicators library
2. Implement Moving Averages (SMA, EMA)
3. Implement MACD indicator
4. Implement RSI and Stochastic
5. Implement Bollinger Bands
6. Create trend detection logic
7. Create API endpoints for technical analysis

---

## ⏱️ Estimated Duration
**2-3 hours**

---

## 📝 Implementation Steps

### 7.1 Install Technical Indicators Library
```bash
npm install technicalindicators
```

### 7.2 Create Trend Indicators Module
Create `src/services/technical/trendIndicators.js`:

```javascript
const { SMA, EMA, MACD, BollingerBands } = require('technicalindicators');
const logger = require('../../utils/logger');

function calculateMovingAverages(closes) {
    if (closes.length < 200) {
        throw new Error('Insufficient data: need at least 200 data points for SMA200');
    }
    
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });
    const sma200 = SMA.calculate({ period: 200, values: closes });
    const ema9 = EMA.calculate({ period: 9, values: closes });
    const ema21 = EMA.calculate({ period: 21, values: closes });
    
    const currentPrice = closes[closes.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const lastSMA50 = sma50[sma50.length - 1];
    const lastSMA200 = sma200[sma200.length - 1];
    const lastEMA9 = ema9[ema9.length - 1];
    const lastEMA21 = ema21[ema21.length - 1];
    
    // Determine trend strength
    let trend = 'MIXED';
    let trendStrength = 50; // 0-100
    
    if (currentPrice > lastSMA20 && lastSMA20 > lastSMA50 && lastSMA50 > lastSMA200) {
        trend = 'STRONG_BULLISH';
        trendStrength = 90;
    } else if (currentPrice > lastSMA20 && lastSMA20 > lastSMA50) {
        trend = 'BULLISH';
        trendStrength = 75;
    } else if (currentPrice > lastSMA20) {
        trend = 'SLIGHTLY_BULLISH';
        trendStrength = 60;
    } else if (currentPrice < lastSMA20 && lastSMA20 < lastSMA50 && lastSMA50 < lastSMA200) {
        trend = 'STRONG_BEARISH';
        trendStrength = 10;
    } else if (currentPrice < lastSMA20 && lastSMA20 < lastSMA50) {
        trend = 'BEARISH';
        trendStrength = 25;
    } else if (currentPrice < lastSMA20) {
        trend = 'SLIGHTLY_BEARISH';
        trendStrength = 40;
    }
    
    // Check for golden/death cross
    let crossover = 'NONE';
    if (sma50.length >= 2 && sma200.length >= 2) {
        const prevSMA50 = sma50[sma50.length - 2];
        const prevSMA200 = sma200[sma200.length - 2];
        
        if (lastSMA50 > lastSMA200 && prevSMA50 <= prevSMA200) {
            crossover = 'GOLDEN_CROSS'; // Bullish
        } else if (lastSMA50 < lastSMA200 && prevSMA50 >= prevSMA200) {
            crossover = 'DEATH_CROSS'; // Bearish
        }
    }
    
    return {
        sma20: parseFloat(lastSMA20.toFixed(2)),
        sma50: parseFloat(lastSMA50.toFixed(2)),
        sma200: parseFloat(lastSMA200.toFixed(2)),
        ema9: parseFloat(lastEMA9.toFixed(2)),
        ema21: parseFloat(lastEMA21.toFixed(2)),
        trend,
        trendStrength,
        crossover,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        recommendation: getTrendRecommendation(trend, crossover)
    };
}

function calculateMACD(closes) {
    if (closes.length < 34) {
        throw new Error('Insufficient data: need at least 34 data points for MACD');
    }
    
    const macdData = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    
    if (macdData.length < 2) {
        throw new Error('MACD calculation returned insufficient data');
    }
    
    const latest = macdData[macdData.length - 1];
    const previous = macdData[macdData.length - 2];
    
    // Detect crossover
    let crossover = 'NONE';
    let signal = 'NEUTRAL';
    
    if (latest.MACD > latest.signal && previous.MACD <= previous.signal) {
        crossover = 'BULLISH';
        signal = 'BUY';
    } else if (latest.MACD < latest.signal && previous.MACD >= previous.signal) {
        crossover = 'BEARISH';
        signal = 'SELL';
    } else if (latest.MACD > latest.signal) {
        signal = 'HOLD_BULLISH';
    } else if (latest.MACD < latest.signal) {
        signal = 'HOLD_BEARISH';
    }
    
    // Check histogram trend
    let histogramTrend = 'FLAT';
    if (latest.histogram > previous.histogram) {
        histogramTrend = 'INCREASING';
    } else if (latest.histogram < previous.histogram) {
        histogramTrend = 'DECREASING';
    }
    
    return {
        macd: parseFloat(latest.MACD.toFixed(4)),
        signal: parseFloat(latest.signal.toFixed(4)),
        histogram: parseFloat(latest.histogram.toFixed(4)),
        crossover,
        signalType: signal,
        histogramTrend,
        interpretation: getMACDInterpretation(crossover, signal, histogramTrend)
    };
}

function calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) {
        throw new Error(`Insufficient data: need at least ${period} data points for Bollinger Bands`);
    }
    
    const bbData = BollingerBands.calculate({
        period: period,
        values: closes,
        stdDev: stdDev
    });
    
    const latest = bbData[bbData.length - 1];
    const currentPrice = closes[closes.length - 1];
    
    // Calculate bandwidth and %B
    const bandwidth = ((latest.upper - latest.lower) / latest.middle) * 100;
    const percentB = ((currentPrice - latest.lower) / (latest.upper - latest.lower)) * 100;
    
    // Determine position
    let position = 'MIDDLE';
    let signal = 'NEUTRAL';
    
    if (currentPrice >= latest.upper) {
        position = 'ABOVE_UPPER';
        signal = 'OVERBOUGHT';
    } else if (currentPrice <= latest.lower) {
        position = 'BELOW_LOWER';
        signal = 'OVERSOLD';
    } else if (percentB > 80) {
        position = 'NEAR_UPPER';
        signal = 'APPROACHING_OVERBOUGHT';
    } else if (percentB < 20) {
        position = 'NEAR_LOWER';
        signal = 'APPROACHING_OVERSOLD';
    }
    
    return {
        upper: parseFloat(latest.upper.toFixed(2)),
        middle: parseFloat(latest.middle.toFixed(2)),
        lower: parseFloat(latest.lower.toFixed(2)),
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        bandwidth: parseFloat(bandwidth.toFixed(2)),
        percentB: parseFloat(percentB.toFixed(2)),
        position,
        signal,
        recommendation: getBollingerRecommendation(signal, bandwidth)
    };
}

function getTrendRecommendation(trend, crossover) {
    if (crossover === 'GOLDEN_CROSS') {
        return 'Strong buy signal - Golden Cross detected';
    }
    if (crossover === 'DEATH_CROSS') {
        return 'Strong sell signal - Death Cross detected';
    }
    
    const recommendations = {
        STRONG_BULLISH: 'Strong uptrend - consider buying on pullbacks',
        BULLISH: 'Uptrend confirmed - follow the trend',
        SLIGHTLY_BULLISH: 'Weak uptrend - wait for confirmation',
        MIXED: 'No clear trend - wait for direction',
        SLIGHTLY_BEARISH: 'Weak downtrend - caution advised',
        BEARISH: 'Downtrend confirmed - avoid or short',
        STRONG_BEARISH: 'Strong downtrend - strong sell signal'
    };
    
    return recommendations[trend] || 'No recommendation';
}

function getMACDInterpretation(crossover, signal, histogramTrend) {
    if (crossover === 'BULLISH') {
        return 'Bullish crossover - momentum turning positive';
    }
    if (crossover === 'BEARISH') {
        return 'Bearish crossover - momentum turning negative';
    }
    
    if (signal === 'HOLD_BULLISH' && histogramTrend === 'INCREASING') {
        return 'Strong bullish momentum - trend strengthening';
    }
    if (signal === 'HOLD_BULLISH' && histogramTrend === 'DECREASING') {
        return 'Bullish but weakening - watch for reversal';
    }
    if (signal === 'HOLD_BEARISH' && histogramTrend === 'DECREASING') {
        return 'Strong bearish momentum - trend strengthening';
    }
    if (signal === 'HOLD_BEARISH' && histogramTrend === 'INCREASING') {
        return 'Bearish but weakening - potential reversal';
    }
    
    return 'Neutral momentum - no clear direction';
}

function getBollingerRecommendation(signal, bandwidth) {
    if (signal === 'OVERSOLD' && bandwidth > 10) {
        return 'Potential buy opportunity - price at lower band with volatility';
    }
    if (signal === 'OVERBOUGHT' && bandwidth > 10) {
        return 'Potential sell opportunity - price at upper band with volatility';
    }
    if (bandwidth < 5) {
        return 'Low volatility - expect breakout soon';
    }
    if (bandwidth > 20) {
        return 'High volatility - proceed with caution';
    }
    
    return 'Price within normal range';
}

module.exports = {
    calculateMovingAverages,
    calculateMACD,
    calculateBollingerBands
};
```

### 7.3 Create Momentum Indicators Module
Create `src/services/technical/momentumIndicators.js`:

```javascript
const { RSI, Stochastic } = require('technicalindicators');
const logger = require('../../utils/logger');

function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) {
        throw new Error(`Insufficient data: need at least ${period + 1} data points for RSI`);
    }
    
    const rsiValues = RSI.calculate({ values: closes, period });
    
    if (rsiValues.length === 0) {
        throw new Error('RSI calculation failed');
    }
    
    const current = rsiValues[rsiValues.length - 1];
    const previous = rsiValues.length > 1 ? rsiValues[rsiValues.length - 2] : current;
    
    // Determine interpretation
    let interpretation;
    let signal;
    let strength;
    
    if (current < 30) {
        interpretation = 'OVERSOLD';
        signal = 'BULLISH';
        strength = 80;
    } else if (current < 40) {
        interpretation = 'WEAK';
        signal = 'SLIGHTLY_BULLISH';
        strength = 60;
    } else if (current < 60) {
        interpretation = 'NEUTRAL';
        signal = 'NEUTRAL';
        strength = 50;
    } else if (current < 70) {
        interpretation = 'STRONG';
        signal = 'SLIGHTLY_BEARISH';
        strength = 60;
    } else {
        interpretation = 'OVERBOUGHT';
        signal = 'BEARISH';
        strength = 80;
    }
    
    // Detect divergence (simplified - would need price data for full divergence)
    let momentum = 'STABLE';
    if (current > previous + 5) {
        momentum = 'INCREASING';
    } else if (current < previous - 5) {
        momentum = 'DECREASING';
    }
    
    return {
        value: parseFloat(current.toFixed(2)),
        previous: parseFloat(previous.toFixed(2)),
        interpretation,
        signal,
        strength,
        momentum,
        recommendation: getRSIRecommendation(interpretation, momentum)
    };
}

function calculateStochastic(high, low, close, period = 14, signalPeriod = 3) {
    if (high.length < period || low.length < period || close.length < period) {
        throw new Error(`Insufficient data: need at least ${period} data points for Stochastic`);
    }
    
    const stochData = Stochastic.calculate({
        high,
        low,
        close,
        period: period,
        signalPeriod: signalPeriod
    });
    
    if (stochData.length === 0) {
        throw new Error('Stochastic calculation failed');
    }
    
    const latest = stochData[stochData.length - 1];
    const previous = stochData.length > 1 ? stochData[stochData.length - 2] : latest;
    
    // Determine interpretation
    let interpretation;
    let signal = 'NEUTRAL';
    
    if (latest.k < 20 && latest.d < 20) {
        interpretation = 'OVERSOLD';
        signal = 'BUY';
    } else if (latest.k > 80 && latest.d > 80) {
        interpretation = 'OVERBOUGHT';
        signal = 'SELL';
    } else if (latest.k < 50 && latest.d < 50) {
        interpretation = 'BEARISH_ZONE';
    } else if (latest.k > 50 && latest.d > 50) {
        interpretation = 'BULLISH_ZONE';
    } else {
        interpretation = 'NEUTRAL';
    }
    
    // Detect crossover
    let crossover = 'NONE';
    if (latest.k > latest.d && previous.k <= previous.d) {
        crossover = 'BULLISH';
        signal = 'BUY';
    } else if (latest.k < latest.d && previous.k >= previous.d) {
        crossover = 'BEARISH';
        signal = 'SELL';
    }
    
    return {
        k: parseFloat(latest.k.toFixed(2)),
        d: parseFloat(latest.d.toFixed(2)),
        interpretation,
        signal,
        crossover,
        recommendation: getStochasticRecommendation(interpretation, crossover)
    };
}

function getRSIRecommendation(interpretation, momentum) {
    if (interpretation === 'OVERSOLD') {
        return momentum === 'INCREASING' 
            ? 'Strong buy signal - oversold and recovering'
            : 'Potential buy - oversold but wait for confirmation';
    }
    if (interpretation === 'OVERBOUGHT') {
        return momentum === 'DECREASING'
            ? 'Strong sell signal - overbought and declining'
            : 'Potential sell - overbought but still strong';
    }
    if (interpretation === 'WEAK' && momentum === 'INCREASING') {
        return 'Building momentum - watch for entry';
    }
    if (interpretation === 'STRONG' && momentum === 'DECREASING') {
        return 'Losing momentum - watch for exit';
    }
    
    return 'Neutral momentum - no clear signal';
}

function getStochasticRecommendation(interpretation, crossover) {
    if (crossover === 'BULLISH' && interpretation === 'OVERSOLD') {
        return 'Strong buy signal - bullish crossover in oversold zone';
    }
    if (crossover === 'BEARISH' && interpretation === 'OVERBOUGHT') {
        return 'Strong sell signal - bearish crossover in overbought zone';
    }
    if (crossover === 'BULLISH') {
        return 'Buy signal - bullish crossover detected';
    }
    if (crossover === 'BEARISH') {
        return 'Sell signal - bearish crossover detected';
    }
    if (interpretation === 'OVERSOLD') {
        return 'Watch for bullish reversal';
    }
    if (interpretation === 'OVERBOUGHT') {
        return 'Watch for bearish reversal';
    }
    
    return 'No clear signal';
}

module.exports = {
    calculateRSI,
    calculateStochastic
};
```

### 7.4 Create Technical Analysis Orchestrator
Create `src/services/technical/technicalAnalyzer.js`:

```javascript
const { calculateMovingAverages, calculateMACD, calculateBollingerBands } = require('./trendIndicators');
const { calculateRSI, calculateStochastic } = require('./momentumIndicators');
const logger = require('../../utils/logger');

async function analyzeTechnicals(priceData) {
    try {
        const { closes, opens, highs, lows, volumes } = priceData;
        
        if (!closes || closes.length < 200) {
            throw new Error('Insufficient data for technical analysis');
        }
        
        logger.info('Performing technical analysis...');
        
        // Calculate all indicators
        const [movingAverages, macd, bollinger, rsi, stochastic] = await Promise.all([
            Promise.resolve(calculateMovingAverages(closes)),
            Promise.resolve(calculateMACD(closes)),
            Promise.resolve(calculateBollingerBands(closes)),
            Promise.resolve(calculateRSI(closes)),
            Promise.resolve(calculateStochastic(highs, lows, closes))
        ]);
        
        // Calculate composite technical score (0-100)
        const compositeScore = calculateCompositeScore({
            movingAverages,
            macd,
            bollinger,
            rsi,
            stochastic
        });
        
        return {
            timestamp: new Date(),
            trend: movingAverages,
            momentum: {
                rsi,
                stochastic
            },
            macd,
            bollinger,
            composite: compositeScore,
            summary: generateSummary(compositeScore)
        };
        
    } catch (error) {
        logger.error('Technical analysis error:', error);
        throw error;
    }
}

function calculateCompositeScore(indicators) {
    let score = 0;
    const factors = [];
    
    // Trend indicators (40% weight)
    score += (indicators.movingAverages.trendStrength * 0.4);
    factors.push(`Trend: ${indicators.movingAverages.trend}`);
    
    // MACD (20% weight)
    if (indicators.macd.crossover === 'BULLISH') {
        score += 20;
        factors.push('MACD: Bullish crossover');
    } else if (indicators.macd.crossover === 'BEARISH') {
        score += 0;
        factors.push('MACD: Bearish crossover');
    } else if (indicators.macd.signalType === 'HOLD_BULLISH') {
        score += 15;
        factors.push('MACD: Bullish momentum');
    } else if (indicators.macd.signalType === 'HOLD_BEARISH') {
        score += 5;
        factors.push('MACD: Bearish momentum');
    } else {
        score += 10;
        factors.push('MACD: Neutral');
    }
    
    // RSI (20% weight)
    score += ((100 - Math.abs(indicators.momentum.rsi.value - 50)) / 50) * 20;
    factors.push(`RSI: ${indicators.momentum.rsi.interpretation}`);
    
    // Stochastic (10% weight)
    if (indicators.momentum.stochastic.crossover === 'BULLISH') {
        score += 10;
        factors.push('Stochastic: Bullish crossover');
    } else if (indicators.momentum.stochastic.crossover === 'BEARISH') {
        score += 0;
        factors.push('Stochastic: Bearish crossover');
    } else {
        score += 5;
        factors.push('Stochastic: No crossover');
    }
    
    // Bollinger Bands (10% weight)
    if (indicators.bollinger.signal === 'OVERSOLD') {
        score += 10;
        factors.push('Bollinger: Oversold');
    } else if (indicators.bollinger.signal === 'OVERBOUGHT') {
        score += 0;
        factors.push('Bollinger: Overbought');
    } else {
        score += 5;
        factors.push('Bollinger: Normal range');
    }
    
    // Determine overall signal
    let signal, interpretation;
    if (score >= 75) {
        signal = 'STRONG_BUY';
        interpretation = 'VERY_BULLISH';
    } else if (score >= 60) {
        signal = 'BUY';
        interpretation = 'BULLISH';
    } else if (score >= 45) {
        signal = 'HOLD';
        interpretation = 'NEUTRAL';
    } else if (score >= 30) {
        signal = 'SELL';
        interpretation = 'BEARISH';
    } else {
        signal = 'STRONG_SELL';
        interpretation = 'VERY_BEARISH';
    }
    
    return {
        score: Math.round(score),
        signal,
        interpretation,
        confidence: Math.round(Math.abs(score - 50) * 2), // 0-100
        factors
    };
}

function generateSummary(compositeScore) {
    return {
        overall: compositeScore.interpretation,
        recommendation: compositeScore.signal,
        confidence: `${compositeScore.confidence}%`,
        keyFactors: compositeScore.factors.slice(0, 3)
    };
}

module.exports = {
    analyzeTechnicals
};
```

### 7.5 Create API Route for Technical Analysis
Create `src/api/routes/technical.js`:

```javascript
const express = require('express');
const router = express.Router();
const { analyzeTechnicals } = require('../../services/technical/technicalAnalyzer');
const logger = require('../../utils/logger');

router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        logger.info(`Technical analysis request for ${ticker}`);
        
        // TODO: Fetch price data from market data service (Step 8)
        // For now, return placeholder
        res.json({
            ticker,
            message: 'Price data fetcher will be implemented in Step 8',
            status: 'pending'
        });
        
    } catch (error) {
        logger.error('Technical analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### 7.6 Update Server to Include Technical Route
Update `src/api/server.js`:

```javascript
// Add this line with other route imports
const technicalRoutes = require('./routes/technical');

// Add this line with other route registrations
app.use('/api/technical', technicalRoutes);
```

### 7.7 Create Test File
Create `tests/test-technical.js`:

```javascript
require('dotenv').config();
const { analyzeTechnicals } = require('../src/services/technical/technicalAnalyzer');

async function runTests() {
    console.log('🧪 Testing Technical Indicators...\n');
    
    try {
        // Generate sample price data
        const sampleData = generateSampleData(250);
        
        console.log('Test: Full Technical Analysis');
        const analysis = await analyzeTechnicals(sampleData);
        
        console.log('\n📊 Technical Analysis Results:');
        console.log('Trend:', analysis.trend.trend);
        console.log('MACD Signal:', analysis.macd.signalType);
        console.log('RSI:', analysis.momentum.rsi.value, `-`, analysis.momentum.rsi.interpretation);
        console.log('Stochastic:', `K=${analysis.momentum.stochastic.k}, D=${analysis.momentum.stochastic.d}`);
        console.log('Bollinger:', analysis.bollinger.signal);
        console.log('\n🎯 Composite Score:', analysis.composite.score);
        console.log('Signal:', analysis.composite.signal);
        console.log('Confidence:', `${analysis.composite.confidence}%`);
        console.log('\n✅ Technical analysis test passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

function generateSampleData(length) {
    let price = 100;
    const closes = [];
    const opens = [];
    const highs = [];
    const lows = [];
    const volumes = [];
    
    for (let i = 0; i < length; i++) {
        const change = (Math.random() - 0.5) * 4; // -2 to +2
        price = Math.max(50, price + change); // Don't go below 50
        
        const open = price + (Math.random() - 0.5) * 2;
        const high = Math.max(price, open) + Math.random() * 2;
        const low = Math.min(price, open) - Math.random() * 2;
        
        opens.push(parseFloat(open.toFixed(2)));
        highs.push(parseFloat(high.toFixed(2)));
        lows.push(parseFloat(low.toFixed(2)));
        closes.push(parseFloat(price.toFixed(2)));
        volumes.push(Math.floor(1000000 + Math.random() * 5000000));
    }
    
    return { closes, opens, highs, lows, volumes };
}

runTests();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 8, verify ALL items:

- [ ] `technicalindicators` package installed
- [ ] `src/services/technical/trendIndicators.js` created
- [ ] `src/services/technical/momentumIndicators.js` created
- [ ] `src/services/technical/technicalAnalyzer.js` created
- [ ] `src/api/routes/technical.js` created
- [ ] Server updated with technical route
- [ ] `tests/test-technical.js` created
- [ ] All tests pass: `node tests/test-technical.js`
- [ ] Moving averages calculating correctly
- [ ] MACD crossovers detecting properly
- [ ] RSI and Stochastic working
- [ ] Bollinger Bands calculating
- [ ] Composite score algorithm tested

---

## 🧪 Testing

```bash
# Test 1: Run technical indicators test
node tests/test-technical.js
# Expected: All indicators calculate successfully

# Test 2: Check indicators with real data (after Step 8)
# Will be tested in integration

# Test 3: Verify API endpoint (placeholder for now)
curl http://localhost:3000/api/technical/AAPL
# Expected: Returns pending message until Step 8
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Insufficient data" error
**Solution:** Ensure you have at least 200 data points for SMA200

### Issue 2: NaN values in calculations
**Solution:** Check that input arrays contain only numeric values, no nulls

### Issue 3: MACD crossover not detecting
**Solution:** Verify you have at least 34 data points (26 slow + 9 signal - 1)

---

## 📊 Indicator Reference

### Moving Averages
- **SMA20**: 20-period simple moving average (short-term trend)
- **SMA50**: 50-period simple moving average (medium-term trend)
- **SMA200**: 200-period simple moving average (long-term trend)
- **Golden Cross**: SMA50 crosses above SMA200 (bullish)
- **Death Cross**: SMA50 crosses below SMA200 (bearish)

### MACD (Moving Average Convergence Divergence)
- **Fast**: 12-period EMA
- **Slow**: 26-period EMA
- **Signal**: 9-period EMA of MACD line
- **Histogram**: MACD - Signal
- **Bullish**: MACD crosses above signal
- **Bearish**: MACD crosses below signal

### RSI (Relative Strength Index)
- **Period**: 14 (default)
- **Oversold**: < 30 (potential buy)
- **Overbought**: > 70 (potential sell)
- **Neutral**: 40-60

### Stochastic Oscillator
- **%K**: Fast line (14-period)
- **%D**: Slow line (3-period SMA of %K)
- **Oversold**: < 20
- **Overbought**: > 80

### Bollinger Bands
- **Middle**: 20-period SMA
- **Upper**: Middle + (2 × Standard Deviation)
- **Lower**: Middle - (2 × Standard Deviation)
- **Squeeze**: Low bandwidth (< 5%)
- **Expansion**: High bandwidth (> 20%)

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step8_market_data.md`

---

**Last Updated:** December 31, 2025
