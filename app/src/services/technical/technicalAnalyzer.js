const { calculateMovingAverages, calculateMACD, calculateBollingerBands } = require('./trendIndicators');
const { calculateRSI, calculateStochastic } = require('./momentumIndicators');
const { 
    calculateEnhancedMovingAverages,
    calculateEnhancedMACD,
    calculateEnhancedRSI,
    calculateEnhancedBollingerBands
} = require('./enhancedIndicators');
const logger = require('../../utils/logger');

async function analyzeTechnicals(priceData) {
    try {
        const { closes, opens, highs, lows, volumes } = priceData;
        
        if (!closes || closes.length < 200) {
            throw new Error('Insufficient data for technical analysis');
        }
        
        logger.info('Performing enhanced technical analysis with trading-signals + Big.js...');
        
        // Try enhanced indicators first, fallback to standard if they fail
        let movingAverages, macd, bollinger, rsi;
        
        try {
            movingAverages = calculateEnhancedMovingAverages(closes);
            macd = calculateEnhancedMACD(closes);
            bollinger = calculateEnhancedBollingerBands(closes);
            rsi = calculateEnhancedRSI(closes);
            logger.info('✓ Using enhanced indicators (trading-signals + Big.js)');
        } catch (enhancedError) {
            logger.warn('Enhanced indicators failed, using standard fallback:', enhancedError.message);
            movingAverages = calculateMovingAverages(closes);
            macd = calculateMACD(closes);
            bollinger = calculateBollingerBands(closes);
            rsi = calculateRSI(closes);
        }
        
        // Stochastic still uses standard library (no enhanced version yet)
        const stochastic = calculateStochastic(highs, lows, closes);
        
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
    score += ((100 - Math.abs(indicators.rsi.value - 50)) / 50) * 20;
    factors.push(`RSI: ${indicators.rsi.interpretation}`);
    
    // Stochastic (10% weight)
    if (indicators.stochastic.crossover === 'BULLISH') {
        score += 10;
        factors.push('Stochastic: Bullish crossover');
    } else if (indicators.stochastic.crossover === 'BEARISH') {
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
