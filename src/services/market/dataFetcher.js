const axios = require('axios');
const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');

// Multiple data sources for fallback strategy
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const FMP_API_KEY = process.env.FMP_API_KEY;

/**
 * Fetch from Alpha Vantage TIME_SERIES_DAILY (Primary)
 */
async function fetchFromAlphaVantage(ticker, limit = 250) {
    const params = {
        function: 'TIME_SERIES_DAILY',
        symbol: ticker,
        apikey: ALPHA_VANTAGE_API_KEY,
        outputsize: limit > 100 ? 'full' : 'compact'
    };
    
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, { params, timeout: 5000 });
    
    if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit (500/day)');
    }
    
    if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
    }
    
    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
        throw new Error('No time series data in response');
    }
    
    // Convert to standard format
    const dates = Object.keys(timeSeries).sort().reverse(); // Most recent first
    return dates.slice(0, limit).reverse().map(date => ({
        date: date,
        timestamp: new Date(date).getTime(),
        open: parseFloat(timeSeries[date]['1. open']),
        high: parseFloat(timeSeries[date]['2. high']),
        low: parseFloat(timeSeries[date]['3. low']),
        close: parseFloat(timeSeries[date]['4. close']),
        volume: parseInt(timeSeries[date]['5. volume'])
    }));
}

/**
 * Fetch from FMP (Fallback)
 */
async function fetchFromFMP(ticker, limit = 250) {
    const url = `${FMP_BASE_URL}/historical-price-eod/full`;
    const params = {
        symbol: ticker,
        apikey: FMP_API_KEY
    };
    
    const response = await axios.get(url, { params, timeout: 5000 });
    
    if (!response.data) {
        throw new Error('No data returned from FMP');
    }
    
    let historical = response.data.historical || response.data;
    
    if (!historical || historical.length === 0) {
        throw new Error('No historical data available');
    }
    
    // Convert to standard format
    return historical
        .slice(0, limit)
        .reverse()
        .map(candle => ({
            date: candle.date,
            timestamp: new Date(candle.date).getTime(),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseInt(candle.volume)
        }));
}

async function getHistoricalData(ticker, timeframe = 'daily', limit = 250) {
    try {
        const cacheKey = `market_data:${ticker}:${timeframe}:${limit}`;
        
        // Check cache first (4 hours for historical data)
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.info(`Cache HIT for market data: ${ticker} (${timeframe})`);
            return cached;
        }
        
        logger.info(`Fetching historical data for ${ticker} (${timeframe}, limit: ${limit})`);
        
        let result = null;
        let source = null;
        
        // Try 1: Alpha Vantage (primary)
        if (ALPHA_VANTAGE_API_KEY) {
            try {
                logger.info(`[1/2] Trying Alpha Vantage for ${ticker}...`);
                result = await fetchFromAlphaVantage(ticker, limit);
                if (result && result.length > 0) {
                    source = 'Alpha Vantage';
                    logger.info(`✅ Alpha Vantage returned ${result.length} candles`);
                }
            } catch (error) {
                logger.warn(`⚠️  Alpha Vantage failed: ${error.message}`);
            }
        } else {
            logger.info(`⚠️  Alpha Vantage not configured (ALPHA_VANTAGE_API_KEY missing)`);
        }
        
        // Try 2: FMP (fallback)
        if (!result && FMP_API_KEY) {
            try {
                logger.info(`[2/2] Trying FMP for ${ticker}...`);
                result = await fetchFromFMP(ticker, limit);
                if (result && result.length > 0) {
                    source = 'FMP';
                    logger.info(`✅ FMP returned ${result.length} candles`);
                }
            } catch (error) {
                logger.warn(`⚠️  FMP failed: ${error.message}`);
            }
        } else if (!result) {
            logger.info(`⚠️  FMP not configured (FMP_API_KEY missing)`);
        }
        
        // If all sources failed
        if (!result || result.length === 0) {
            logger.error(`❌ All market data sources failed for ${ticker}`);
            return [];
        }
        
        logger.info(`Market data source used: ${source}`);
        
        // Cache for 4 hours
        await setCache(cacheKey, result, 14400);
        logger.info(`Market data cached for ${ticker} (${result.length} candles)`);
        
        return result;
        
    } catch (error) {
        logger.error(`Market data fetch error for ${ticker}:`, error.message);
        return [];
    }
}

function extractPriceArrays(marketData) {
    // marketData is now just an array of candles
    if (!marketData || marketData.length === 0) {
        throw new Error('Invalid market data format');
    }
    
    return {
        closes: marketData.map(d => d.close),
        opens: marketData.map(d => d.open),
        highs: marketData.map(d => d.high),
        lows: marketData.map(d => d.low),
        volumes: marketData.map(d => d.volume),
        dates: marketData.map(d => d.date)
    };
}

async function getCurrentPrice(ticker) {
    try {
        const cacheKey = `current_price:${ticker}`;
        
        // Check cache (1 minute for real-time data)
        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${FMP_BASE_URL}/quote`;
        const response = await axios.get(url, {
            params: { 
                symbol: ticker,
                apikey: FMP_API_KEY 
            },
            timeout: 5000
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error(`No quote data for ${ticker}`);
        }
        
        const quote = response.data[0];
        const result = {
            ticker: quote.symbol,
            price: parseFloat(quote.price),
            change: parseFloat(quote.change),
            changePercent: parseFloat(quote.changesPercentage),
            volume: parseInt(quote.volume),
            dayHigh: parseFloat(quote.dayHigh),
            dayLow: parseFloat(quote.dayLow),
            previousClose: parseFloat(quote.previousClose),
            timestamp: new Date(quote.timestamp * 1000)
        };
        
        // Cache for 1 minute (60 seconds)
        await setCache(cacheKey, result, 60);
        
        return result;
        
    } catch (error) {
        logger.error(`Error fetching current price for ${ticker}:`, error.message);
        throw error;
    }
}

async function getMultipleQuotes(tickers) {
    try {
        const cacheKey = `quotes:${tickers.join(',')}`;
        
        // Check cache (1 minute)
        const cached = await getCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${FMP_BASE_URL}/batch-quote`;
        const response = await axios.get(url, {
            params: { 
                symbols: tickers.join(','),
                apikey: FMP_API_KEY 
            },
            timeout: 5000
        });
        
        if (!response.data) {
            throw new Error('No quote data returned');
        }
        
        const quotes = response.data.map(quote => ({
            ticker: quote.symbol,
            price: parseFloat(quote.price),
            change: parseFloat(quote.change),
            changePercent: parseFloat(quote.changesPercentage),
            volume: parseInt(quote.volume),
            marketCap: quote.marketCap,
            pe: quote.pe,
            timestamp: new Date(quote.timestamp * 1000)
        }));
        
        // Cache for 1 minute
        await setCache(cacheKey, quotes, 60);
        
        return quotes;
        
    } catch (error) {
        logger.error('Error fetching multiple quotes:', error.message);
        throw error;
    }
}

module.exports = {
    getHistoricalData,
    extractPriceArrays,
    getCurrentPrice,
    getMultipleQuotes
};
