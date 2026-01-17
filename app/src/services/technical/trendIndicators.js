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
