const axios = require('axios');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

/**
 * Fetch market volatility proxy using S&P 500 price changes
 * FMP legacy VIX endpoint deprecated Aug 2025, so we calculate implied volatility
 * from S&P 500 daily price movements as a proxy
 */
async function fetchVIX() {
    try {
        // Get S&P 500 recent history to calculate volatility
        // Using stable endpoint that works with free tier
        const url = `https://financialmodelingprep.com/api/v3/historical-chart/1day/%5EGSPC?apikey=${config.api.fmp}`;
        const response = await axios.get(url);
        
        if (!response.data || response.data.length < 20) {
            throw new Error('Insufficient S&P 500 data for volatility calculation');
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
        
        // Get latest S&P price for context
        const latest = response.data[0];
        const previous = response.data[1];
        const change = latest.close - previous.close;
        const changePercent = (change / previous.close) * 100;
        
        // Interpret volatility (VIX proxy)
        let interpretation, signal, signalStrength;
        if (volatility < 12) {
            interpretation = 'EXTREME_LOW';
            signal = 'CAUTION';
            signalStrength = 30;
        } else if (volatility < 20) {
            interpretation = 'NEUTRAL';
            signal = 'NEUTRAL';
            signalStrength = 50;
        } else if (volatility < 30) {
            interpretation = 'ELEVATED';
            signal = 'CAUTION';
            signalStrength = 70;
        } else {
            interpretation = 'EXTREME';
            signal = 'EXTREME_FEAR';
            signalStrength = 90;
        }
        
        const result = {
            currentValue: parseFloat(volatility.toFixed(2)),
            previousClose: parseFloat(previous.close),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            interpretation,
            signal,
            signalStrength,
            timestamp: new Date(),
            recommendation: getRecommendation(interpretation),
            source: 'SP500_IMPLIED_VOLATILITY',
            note: 'Calculated from S&P 500 20-day historical volatility (VIX proxy)'
        };
        
        logger.info(`Volatility (VIX proxy) calculated: ${volatility.toFixed(2)}% (${interpretation})`);
        return result;
        
    } catch (error) {
        logger.error('Volatility calculation error:', { message: error.message, status: error.response?.status });
        
        // Return default values if API fails
        logger.warn('Using default neutral volatility value');
        return {
            currentValue: 18.0,
            previousClose: 18.5,
            change: -0.5,
            changePercent: -2.7,
            interpretation: 'NEUTRAL',
            signal: 'NEUTRAL',
            signalStrength: 50,
            timestamp: new Date(),
            recommendation: 'Normal market conditions (default - data unavailable)',
            error: true,
            errorMessage: error.message,
            source: 'DEFAULT'
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
