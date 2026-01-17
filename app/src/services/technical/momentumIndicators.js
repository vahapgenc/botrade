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
