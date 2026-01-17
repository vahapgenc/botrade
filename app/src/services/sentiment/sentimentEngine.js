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
        
        // Calculate composite score (0-100)
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
