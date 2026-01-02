const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

/**
 * Fetch Fear & Greed Index from CNN
 * Uses two methods: API first, then HTML scraping as fallback
 */
async function fetchFearGreed() {
    // Try Method 1: CNN API
    try {
        const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
        });
        
        const value = parseFloat(response.data.fear_and_greed.score);
        const rating = response.data.fear_and_greed.rating;
        
        logger.info(`Fear & Greed fetched from API: ${value} (${rating})`);
        return formatFearGreedResult(value, rating);
        
    } catch (apiError) {
        logger.warn('Fear & Greed API failed, trying HTML scraping...', apiError.message);
        
        // Try Method 2: Scrape CNN page
        try {
            const url = 'https://edition.cnn.com/markets/fear-and-greed';
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 5000
            });
            
            const $ = cheerio.load(response.data);
            
            // Try to find the value in the page
            // Look for patterns like "Fear & Greed Now: 44"
            const pageText = $('body').text();
            
            // Pattern 1: Look for number in dial area
            const dialText = $('.market-fng-gauge__dial').text() || '';
            const dialMatch = dialText.match(/(\d+)/);
            
            // Pattern 2: Look for "Now: XX"
            const nowMatch = pageText.match(/Now:\s*(\d+)/i);
            
            // Pattern 3: Look in any element with the value
            const valueMatch = pageText.match(/Fear & Greed.*?(\d+)/i) || pageText.match(/Index:\s*(\d+)/i);
            
            let value = null;
            if (dialMatch) value = parseFloat(dialMatch[1]);
            else if (nowMatch) value = parseFloat(nowMatch[1]);
            else if (valueMatch) value = parseFloat(valueMatch[1]);
            
            if (value !== null && value >= 0 && value <= 100) {
                logger.info(`Fear & Greed scraped from HTML: ${value}`);
                return formatFearGreedResult(value);
            }
            
            throw new Error('Could not extract value from HTML');
            
        } catch (scrapeError) {
            logger.error('Fear & Greed HTML scraping also failed:', scrapeError.message);
            
            // Return neutral default
            return {
                value: 50,
                valueText: '50',
                emotion: 'Neutral',
                interpretation: 'NEUTRAL',
                signal: 'HOLD',
                signalStrength: 50,
                timestamp: new Date(),
                recommendation: 'Unable to fetch data - assuming neutral',
                error: true,
                errorMessage: 'Both API and scraping failed'
            };
        }
    }
}

/**
 * Format the Fear & Greed result with interpretation
 */
function formatFearGreedResult(value, rating = null) {
    let interpretation, signal, signalStrength, emotion;
    
    if (value < 25) {
        interpretation = 'EXTREME_FEAR';
        emotion = 'Extreme Fear';
        signal = 'BUY';
        signalStrength = 80;
    } else if (value < 45) {
        interpretation = 'FEAR';
        emotion = 'Fear';
        signal = 'LEAN_BUY';
        signalStrength = 65;
    } else if (value < 55) {
        interpretation = 'NEUTRAL';
        emotion = 'Neutral';
        signal = 'HOLD';
        signalStrength = 50;
    } else if (value < 75) {
        interpretation = 'GREED';
        emotion = 'Greed';
        signal = 'LEAN_SELL';
        signalStrength = 65;
    } else {
        interpretation = 'EXTREME_GREED';
        emotion = 'Extreme Greed';
        signal = 'SELL';
        signalStrength = 80;
    }
    
    return {
        value: parseFloat(value.toFixed(1)),
        valueText: value.toFixed(0),
        emotion: rating || emotion,
        interpretation,
        signal,
        signalStrength,
        timestamp: new Date(),
        recommendation: `Market showing ${emotion.toLowerCase()}`
    };
}

module.exports = { fetchFearGreed };
