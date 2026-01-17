const axios = require('axios');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

// Multiple data sources for fallback strategy
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

/**
 * Fetch from Alpha Vantage GLOBAL_QUOTE for ^VIX (Primary)
 */
async function fetchVIXFromAlphaVantage() {
    const params = {
        function: 'GLOBAL_QUOTE',
        symbol: '^VIX',
        apikey: ALPHA_VANTAGE_API_KEY
    };
    
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, { params, timeout: 5000 });
    
    if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit (500/day)');
    }
    
    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
        throw new Error('No VIX data in response');
    }
    
    const value = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    const previousClose = value - change;
    
    return {
        value,
        change,
        changePercent,
        previousClose,
        source: 'Alpha Vantage'
    };
}

/**
 * Fetch from FMP (Fallback - calculates from S&P 500)
 */
async function fetchVIXFromFMP() {
    const url = `${FMP_BASE_URL}/historical-chart/1day/%5EGSPC`;
    const response = await axios.get(url, {
        params: { apikey: FMP_API_KEY },
        timeout: 5000
    });
    
    if (!response.data || response.data.length < 20) {
        throw new Error('Insufficient S&P 500 data');
    }
    
    // Calculate 20-day historical volatility as VIX proxy
    const prices = response.data.slice(0, 20).map(d => d.close);
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i - 1] / prices[i]));
    }
    
    // Calculate standard deviation and annualize (252 trading days)
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    
    const latest = response.data[0];
    const previous = response.data[1];
    const change = volatility - 18; // Estimate change from neutral
    const changePercent = (change / 18) * 100;
    
    return {
        value: parseFloat(volatility.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        previousClose: 18,
        source: 'FMP (S&P 500 implied volatility)'
    };
}

/**
 * Fetch market volatility (VIX) with fallback strategy
 */
async function fetchVIX() {
    try {
        let vixData = null;
        let source = null;
        
        // Try 1: Alpha Vantage (primary)
        if (ALPHA_VANTAGE_API_KEY) {
            try {
                logger.info(`[1/2] Trying Alpha Vantage for VIX...`);
                vixData = await fetchVIXFromAlphaVantage();
                if (vixData && vixData.value) {
                    source = vixData.source;
                    logger.info(`✅ Alpha Vantage returned VIX: ${vixData.value}`);
                }
            } catch (error) {
                logger.warn(`⚠️  Alpha Vantage failed: ${error.message}`);
            }
        } else {
            logger.info(`⚠️  Alpha Vantage not configured (ALPHA_VANTAGE_API_KEY missing)`);
        }
        
        // Try 2: FMP (fallback)
        if (!vixData && FMP_API_KEY) {
            try {
                logger.info(`[2/2] Trying FMP for VIX proxy...`);
                vixData = await fetchVIXFromFMP();
                if (vixData && vixData.value) {
                    source = vixData.source;
                    logger.info(`✅ FMP returned VIX proxy: ${vixData.value}`);
                }
            } catch (error) {
                logger.warn(`⚠️  FMP failed: ${error.message}`);
            }
        } else if (!vixData) {
            logger.info(`⚠️  FMP not configured (FMP_API_KEY missing)`);
        }
        
        // If all sources failed
        if (!vixData || !vixData.value) {
            logger.error(`❌ All VIX sources failed`);
            logger.warn('Using default neutral volatility value');
            return {
                value: 18.0,
                change: 0,
                changePercent: 0,
                interpretation: 'NEUTRAL',
                signal: 'NEUTRAL',
                signalStrength: 50,
                timestamp: new Date(),
                recommendation: 'Normal market conditions (default - data unavailable)',
                error: true,
                source: 'Default'
            };
        }
        
        const value = vixData.value;
        
        // Interpret volatility
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
            value: value,
            change: vixData.change,
            changePercent: vixData.changePercent,
            previousClose: vixData.previousClose,
            interpretation,
            signal,
            signalStrength,
            timestamp: new Date(),
            recommendation: getRecommendation(interpretation),
            source,
            error: false
        };
        
        logger.info(`VIX fetched: ${value} (${interpretation}) from ${source}`);
        return result;
        
    } catch (error) {
        logger.error('VIX fetch error:', { message: error.message, status: error.response?.status });
        
        // Return default values if API fails
        logger.warn('Using default neutral volatility value');
        return {
            value: 18.0,
            change: 0,
            changePercent: 0,
            interpretation: 'NEUTRAL',
            signal: 'NEUTRAL',
            signalStrength: 50,
            timestamp: new Date(),
            recommendation: 'Normal market conditions (default - data unavailable)',
            error: true,
            errorMessage: error.message,
            source: 'Default'
        };
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
