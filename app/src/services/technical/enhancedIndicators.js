/**
 * Enhanced Technical Indicators using trading-signals library
 * Provides arbitrary-precision calculations with Big.js
 */

const { SMA, EMA, RSI, BollingerBands } = require('trading-signals');
const Big = require('big.js');
const logger = require('../../utils/logger');

/**
 * Calculate enhanced moving averages with Big.js precision
 */
function calculateEnhancedMovingAverages(closes) {
    if (closes.length < 20) {
        throw new Error('Insufficient data: need at least 20 data points for basic MA');
    }
    
    logger.debug('Calculating enhanced moving averages with arbitrary precision...');
    
    // Initialize indicators
    const sma20 = new SMA(20);
    const sma50 = new SMA(50);
    const sma200 = new SMA(200);
    const ema9 = new EMA(9);
    const ema21 = new EMA(21);
    
    // Feed data
    closes.forEach(close => {
        try { if (closes.length >= 20) sma20.update(close); } catch(e){}
        try { if (closes.length >= 50) sma50.update(close); } catch(e){}
        try { if (closes.length >= 200) sma200.update(close); } catch(e){}
        
        try { ema9.update(new Big(close)); } catch(e){}
        try { ema21.update(new Big(close)); } catch(e){}
    });
    
    // Get current values
    const currentPrice = parseFloat(closes[closes.length - 1]);
    
    // Check if indicators are stable before getting results
    const lastSMA20 = sma20.isStable ? parseFloat(sma20.getResult()) : null;
    const lastSMA50 = sma50.isStable ? parseFloat(sma50.getResult()) : null;
    const lastSMA200 = sma200.isStable ? parseFloat(sma200.getResult()) : null;
    const lastEMA9 = ema9.isStable ? parseFloat(ema9.getResult().toString()) : null;
    const lastEMA21 = ema21.isStable ? parseFloat(ema21.getResult().toString()) : null;
    
    // Determine trend strength
    let trend = 'MIXED';
    let trendStrength = 50;
    
    // Trend logic adapted for missing SMA200
    if (lastSMA20 && lastSMA50) {
        if (lastSMA200) {
            // Full logic with SMA200
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
        } else {
             // Limited logic without SMA200
            if (currentPrice > lastSMA20 && lastSMA20 > lastSMA50) {
                trend = 'BULLISH';
                trendStrength = 70;
            } else if (currentPrice < lastSMA20 && lastSMA20 < lastSMA50) {
                trend = 'BEARISH';
                trendStrength = 30;
            } else if (currentPrice > lastSMA50) {
                trend = 'SLIGHTLY_BULLISH';
                trendStrength = 60;
            } else if (currentPrice < lastSMA50) {
                trend = 'SLIGHTLY_BEARISH';
                trendStrength = 40;
            }
        }
    } else if (lastEMA9 && lastEMA21) {
        // Fallback to EMA if SMA not available
        if (currentPrice > lastEMA9 && lastEMA9 > lastEMA21) {
            trend = 'BULLISH';
            trendStrength = 70;
        } else if (currentPrice < lastEMA9 && lastEMA9 < lastEMA21) {
            trend = 'BEARISH';
            trendStrength = 30;
        }
    }
    
    // Check for golden/death cross
    let crossover = 'NONE';
    if (lastSMA50 && lastSMA200) {
        const sma50Prev = new SMA(50);
        const sma200Prev = new SMA(200);
        
        closes.slice(0, -1).forEach(close => {
            sma50Prev.update(close);
            sma200Prev.update(close);
        });
        
        if (sma50Prev.isStable && sma200Prev.isStable) {
            const prevSMA50 = parseFloat(sma50Prev.getResult());
            const prevSMA200 = parseFloat(sma200Prev.getResult());
            
            if (lastSMA50 > lastSMA200 && prevSMA50 <= prevSMA200) {
                crossover = 'GOLDEN_CROSS';
            } else if (lastSMA50 < lastSMA200 && prevSMA50 >= prevSMA200) {
                crossover = 'DEATH_CROSS';
            }
        }
    }
    
    return {
        sma20: lastSMA20 ? parseFloat(lastSMA20.toFixed(2)) : null,
        sma50: lastSMA50 ? parseFloat(lastSMA50.toFixed(2)) : null,
        sma200: lastSMA200 ? parseFloat(lastSMA200.toFixed(2)) : null,
        ema9: lastEMA9 ? parseFloat(lastEMA9.toFixed(2)) : null,
        ema21: lastEMA21 ? parseFloat(lastEMA21.toFixed(2)) : null,
        trend,
        trendStrength,
        crossover,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        recommendation: getTrendRecommendation(trend, crossover),
        calculationMethod: 'trading-signals + Big.js'
    };
}

/**
 * Calculate enhanced MACD with Big.js precision
 * Uses manual EMA calculation since MACD class has API issues
 */
function calculateEnhancedMACD(closes) {
    if (closes.length < 34) {
        throw new Error('Insufficient data: need at least 34 data points for MACD');
    }
    
    logger.debug('Calculating enhanced MACD with arbitrary precision...');
    
    // Calculate MACD line = EMA12 - EMA26
    const ema12 = new EMA(12);
    const ema26 = new EMA(26);
    
    // Build historical MACD values
    const macdValues = [];
    closes.forEach(close => {
        ema12.update(new Big(close));
        ema26.update(new Big(close));
        
        if (ema12.isStable && ema26.isStable) {
            // getResult() returns Big, convert to number then subtract
            const ema12Val = parseFloat(ema12.getResult().toString());
            const ema26Val = parseFloat(ema26.getResult().toString());
            const macdVal = ema12Val - ema26Val;
            macdValues.push(macdVal);
        }
    });
    
    if (macdValues.length < 9) {
        throw new Error('Not enough MACD values for signal line');
    }
    
    // Calculate signal line = EMA9 of MACD
    const signalEMA = new EMA(9);
    macdValues.forEach(val => signalEMA.update(new Big(val)));
    
    const macdValue = macdValues[macdValues.length - 1];
    const signalValue = parseFloat(signalEMA.getResult().toString());
    const histogram = macdValue - signalValue;
    
    // Get previous values
    const prevMACD = macdValues.length >= 2 ? macdValues[macdValues.length - 2] : macdValue;
    const signalEMAPrev = new EMA(9);
    macdValues.slice(0, -1).forEach(val => signalEMAPrev.update(new Big(val)));
    const prevSignal = signalEMAPrev.isStable ? parseFloat(signalEMAPrev.getResult().toString()) : signalValue;
    const prevHistogram = prevMACD - prevSignal;
    
    // Detect crossover
    let crossover = 'NONE';
    let signal = 'NEUTRAL';
    
    if (macdValue > signalValue && prevMACD <= prevSignal) {
        crossover = 'BULLISH';
        signal = 'BUY';
    } else if (macdValue < signalValue && prevMACD >= prevSignal) {
        crossover = 'BEARISH';
        signal = 'SELL';
    } else if (macdValue > signalValue) {
        signal = 'HOLD_BULLISH';
    } else if (macdValue < signalValue) {
        signal = 'HOLD_BEARISH';
    }
    
    // Check histogram trend
    let histogramTrend = 'FLAT';
    if (histogram > prevHistogram) {
        histogramTrend = 'INCREASING';
    } else if (histogram < prevHistogram) {
        histogramTrend = 'DECREASING';
    }
    
    return {
        macd: parseFloat(macdValue.toFixed(4)),
        signal: parseFloat(signalValue.toFixed(4)),
        histogram: parseFloat(histogram.toFixed(4)),
        crossover,
        signalType: signal,
        histogramTrend,
        interpretation: getMACDInterpretation(crossover, signal, histogramTrend),
        calculationMethod: 'trading-signals + Big.js'
    };
}

/**
 * Calculate enhanced RSI with Big.js precision
 */
function calculateEnhancedRSI(closes, period = 14) {
    if (closes.length < period + 1) {
        throw new Error(`Insufficient data: need at least ${period + 1} data points for RSI`);
    }
    
    logger.debug('Calculating enhanced RSI with arbitrary precision...');
    
    const rsi = new RSI(period);
    
    closes.forEach(close => {
        rsi.update(new Big(close));
    });
    
    const current = parseFloat(rsi.getResult().toString());
    
    // Get previous value
    const rsiPrev = new RSI(period);
    closes.slice(0, -1).forEach(close => {
        rsiPrev.update(new Big(close));
    });
    const previous = rsiPrev.isStable ? parseFloat(rsiPrev.getResult().toString()) : current;
    
    // Determine interpretation
    let interpretation, signal, strength;
    
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
    
    // Detect momentum
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
        recommendation: getRSIRecommendation(interpretation, momentum),
        calculationMethod: 'trading-signals + Big.js'
    };
}

/**
 * Calculate enhanced Bollinger Bands with Big.js precision
 */
function calculateEnhancedBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) {
        throw new Error(`Insufficient data: need at least ${period} data points for Bollinger Bands`);
    }
    
    logger.debug('Calculating enhanced Bollinger Bands with arbitrary precision...');
    
    const bb = new BollingerBands(period, stdDev);
    
    closes.forEach(close => {
        bb.update(new Big(close));
    });
    
    const result = bb.getResult();
    const upper = parseFloat(result.upper.toString());
    const middle = parseFloat(result.middle.toString());
    const lower = parseFloat(result.lower.toString());
    const currentPrice = parseFloat(closes[closes.length - 1]);
    
    // Calculate bandwidth and %B
    const bandwidth = ((upper - lower) / middle) * 100;
    const percentB = ((currentPrice - lower) / (upper - lower)) * 100;
    
    // Determine position
    let position, signal;
    
    if (currentPrice >= upper) {
        position = 'ABOVE_UPPER';
        signal = 'OVERBOUGHT';
    } else if (currentPrice <= lower) {
        position = 'BELOW_LOWER';
        signal = 'OVERSOLD';
    } else if (percentB > 80) {
        position = 'NEAR_UPPER';
        signal = 'APPROACHING_OVERBOUGHT';
    } else if (percentB < 20) {
        position = 'NEAR_LOWER';
        signal = 'APPROACHING_OVERSOLD';
    } else {
        position = 'MIDDLE';
        signal = 'NEUTRAL';
    }
    
    return {
        upper: parseFloat(upper.toFixed(2)),
        middle: parseFloat(middle.toFixed(2)),
        lower: parseFloat(lower.toFixed(2)),
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        bandwidth: parseFloat(bandwidth.toFixed(2)),
        percentB: parseFloat(percentB.toFixed(2)),
        position,
        signal,
        recommendation: getBollingerRecommendation(signal, bandwidth),
        calculationMethod: 'trading-signals + Big.js'
    };
}

// Helper functions
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
    calculateEnhancedMovingAverages,
    calculateEnhancedMACD,
    calculateEnhancedRSI,
    calculateEnhancedBollingerBands
};
