const axios = require('axios');
let yahooFinance;
try {
    const YahooFinanceClass = require('yahoo-finance2').default;
    try {
        yahooFinance = new YahooFinanceClass();
    } catch (e) {
        yahooFinance = YahooFinanceClass;
    }
} catch (e) {
    console.error("Failed to load yahoo-finance2", e);
}

const csv = require('csv-parser');
const { Readable } = require('stream');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

// Multiple data sources for fallback strategy
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

/**
 * Fetch from Yahoo Finance (Primary - Free & Reliable)
 */
async function fetchVIXFromYahoo() {
    // Try to get real-time quote first
    try {
        const quote = await yahooFinance.quote('^VIX');
        if (quote && quote.regularMarketPrice) {
            return {
                value: quote.regularMarketPrice,
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
                source: 'Yahoo Finance (Quote)'
            };
        }
    } catch (e) {
        logger.warn('Yahoo Quote failed, trying historical...');
    }

    // Fallback to historical if quote fails
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 5); // Last 5 days

    const result = await yahooFinance.historical('^VIX', { 
        period1: start.toISOString().split('T')[0],
        period2: end.toISOString().split('T')[0]
    });

    if (!result || result.length === 0) {
        throw new Error('No data returned from Yahoo Finance');
    }

    const latest = result[result.length - 1];
    const prev = result.length > 1 ? result[result.length - 2] : latest;
    
    return {
        value: latest.close,
        change: latest.close - prev.close,
        changePercent: ((latest.close - prev.close) / prev.close) * 100,
        previousClose: prev.close,
        source: 'Yahoo Finance (Historical)'
    };
}

/**
 * Fetch from CBOE (Secondary - CSV Parsing)
 */
async function fetchVIXFromCBOE() {
    const url = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv';
    const response = await axios.get(url, { 
        responseType: 'arraybuffer', // Important for CSV
        timeout: 5000 
    });

    const rows = [];
    
    await new Promise((resolve, reject) => {
        const stream = Readable.from(response.data.toString());
        stream
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    if (rows.length === 0) {
        throw new Error('No rows found in CBOE CSV');
    }

    // Get last row
    const lastRow = rows[rows.length - 1];
    // CBOE CSV format usually: DATE,OPEN,HIGH,LOW,CLOSE
    
    const value = parseFloat(lastRow['CLOSE'] || lastRow['Close']);
    const prevValue = parseFloat(rows[rows.length - 2]['CLOSE'] || rows[rows.length - 2]['Close']);
    
    if (isNaN(value)) {
        throw new Error('Invalid CSV data structure');
    }

    const change = value - prevValue;
    
    return {
        value: value,
        change: change,
        changePercent: (change / prevValue) * 100,
        previousClose: prevValue,
        source: 'CBOE (CSV)'
    };
}

/**
 * Fetch from Alpha Vantage GLOBAL_QUOTE for ^VIX (Fallback)
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
        
        // Try 1: Yahoo Finance (Primary - Best source)
        try {
            logger.info(`[1/4] Trying Yahoo Finance for VIX...`);
            vixData = await fetchVIXFromYahoo();
            if (vixData && vixData.value) {
                source = vixData.source;
                logger.info(`✅ Yahoo Finance returned VIX: ${vixData.value}`);
            }
        } catch (error) {
            logger.warn(`⚠️  Yahoo Finance failed: ${error.message}`);
        }

        // Try 2: CBOE (Secondary)
        if (!vixData) {
            try {
                logger.info(`[2/4] Trying CBOE for VIX...`);
                vixData = await fetchVIXFromCBOE();
                if (vixData && vixData.value) {
                    source = vixData.source;
                    logger.info(`✅ CBOE returned VIX: ${vixData.value}`);
                }
            } catch (error) {
                logger.warn(`⚠️  CBOE failed: ${error.message}`);
            }
        }

        // Try 3: Alpha Vantage (Fallback)
        if (!vixData && ALPHA_VANTAGE_API_KEY) {
            try {
                logger.info(`[3/4] Trying Alpha Vantage for VIX...`);
                vixData = await fetchVIXFromAlphaVantage();
                if (vixData && vixData.value) {
                    source = vixData.source;
                    logger.info(`✅ Alpha Vantage returned VIX: ${vixData.value}`);
                }
            } catch (error) {
                logger.warn(`⚠️  Alpha Vantage failed: ${error.message}`);
            }
        } 
        
        // Try 4: FMP (Last Resort)
        if (!vixData && FMP_API_KEY) {
            try {
                logger.info(`[4/4] Trying FMP for VIX proxy...`);
                vixData = await fetchVIXFromFMP();
                if (vixData && vixData.value) {
                    source = vixData.source;
                    logger.info(`✅ FMP returned VIX proxy: ${vixData.value}`);
                }
            } catch (error) {
                logger.warn(`⚠️  FMP failed: ${error.message}`);
            }
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
