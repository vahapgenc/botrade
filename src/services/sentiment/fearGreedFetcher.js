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
