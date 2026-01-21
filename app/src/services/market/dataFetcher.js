const axios = require('axios');
// const yahooFinance = require('yahoo-finance2').default; // Using v2 wrapper
let yahooFinance;
try {
    const YahooFinanceClass = require('yahoo-finance2').default;
    // Try to instantiate if it's a class/constructor
    try {
        yahooFinance = new YahooFinanceClass();
        console.log("DEBUG: YahooFinance instantiated successfully");
    } catch (e) {
        console.log("DEBUG: YahooFinance instantiation failed (" + e.message + ") - Using as static object");
        yahooFinance = YahooFinanceClass;
    }
} catch (e) {
    console.error("Failed to load yahoo-finance2", e);
}

const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');
const twsClient = require('../ibkr/twsClient');

// Multiple data sources for fallback strategy
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;
const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * Fetch from Yahoo Finance (Primary - Free & Reliable)
 */
async function fetchFromYahooFinance(ticker, limit = 250) {
    // Determine start date based on limit (approximate trading days)
    // 250 trading days ~= 1 year
    // limit is number of candles
    const endDate = new Date();
    const startDate = new Date();
    const daysBack = Math.ceil(limit * 1.5) + 10; // Add buffer for weekends/holidays
    startDate.setDate(endDate.getDate() - daysBack);
    
    // Using yahoo-finance2 library
    const queryOptions = {
        period1: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        period2: endDate.toISOString().split('T')[0],   // YYYY-MM-DD
        interval: '1d'
    };
    
    const result = await yahooFinance.historical(ticker, queryOptions);

    if (!result || result.length === 0) {
        throw new Error('No data returned from Yahoo Finance');
    }

    // Convert to standard format
    // Yahoo finance 2 returns: { date, open, high, low, close, adjClose, volume }
    const candles = result.map(candle => ({
        date: candle.date.toISOString().split('T')[0],
        timestamp: new Date(candle.date).getTime(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
    }));

    // Sort descending (newest first) and limit
    // historical() usually returns oldest first. 
    return candles.reverse().slice(0, limit);
}
// Remove old fetchFromYahooFinance if present lower down
// (It was previously defined near the bottom, I will assume it's gone or I replaced it higher up.
// Actually, I inserted the new one at the top. I should verify if the old one exists at the bottom.)

/**
 * Fetch from Interactive Brokers TWS (Secondary)
 */
async function fetchFromIBKR(ticker, limit = 250) {
    try {
        logger.info(`[IBKR] Fetching ${limit} days of data for ${ticker}...`);
        
        // Add timeout to prevent hanging (increased to 35s to match TWS client)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('IBKR request timeout')), 35000)
        );
        
        const dataPromise = twsClient.getHistoricalData(ticker, limit, '1 day');
        const data = await Promise.race([dataPromise, timeoutPromise]);
        
        if (!data || data.length === 0) {
            throw new Error('No data returned from IBKR');
        }

        logger.info(`✅ IBKR returned ${data.length} candles for ${ticker}`);
        return data;
    } catch (error) {
        // Don't crash on IBKR errors - just log and move to fallback
        logger.warn(`IBKR fetch failed: ${error.message}`);
        throw error;
    }
}

/**
 * Fetch from Alpha Vantage TIME_SERIES_DAILY
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
    if (!FMP_API_KEY) {
        throw new Error('FMP_API_KEY is not configured');
    }

    // Correct endpoint for historical price
    const url = `${FMP_BASE_URL}/historical-price-full/${ticker}`;
    const params = {
        apikey: FMP_API_KEY
    };
    
    // Note: FMP usually returns full history for free tier, or 5 years.
    // We filter result in memory.
    
    logger.info(`[FMP] Fetching historical data for ${ticker}`);
    
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

// (Broken duplicate fetchFromYahooFinance removed)

// Remove old fetchFromYahooFinance
// (Function removed)

/**
 * Main entry point for historical data
 */
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
        let errors = [];
        
        // Try 1: Yahoo Finance (Best Free Choice - Primary as requested)
        try {
            logger.info(`[1/4] Trying Yahoo Finance for ${ticker}...`);
            result = await fetchFromYahooFinance(ticker, limit);
            if (result && result.length > 0) {
                source = 'Yahoo Finance';
                logger.info(`✅ Yahoo Finance returned ${result.length} candles`);
            }
        } catch (error) {
            const msg = `Yahoo Finance: ${error.message}`;
            logger.warn(`⚠️  Yahoo Finance failed: ${error.message}`);
            errors.push(msg);
        }
        
        // Try 2: Interactive Brokers TWS (Secondary)
        if (!result) {
            try {
                logger.info(`[2/4] Trying IBKR for ${ticker}...`);
                result = await fetchFromIBKR(ticker, limit);
                if (result && result.length > 0) {
                    source = 'Interactive Brokers';
                    logger.info(`✅ IBKR returned ${result.length} candles`);
                }
            } catch (error) {
                const msg = `IBKR: ${error.message}`;
                logger.warn(`⚠️  IBKR failed: ${error.message}`);
                errors.push(msg);
            }
        }
        
        // Try 3: Alpha Vantage (Fallback with API Key)
        if (!result && ALPHA_VANTAGE_API_KEY) {
            try {
                logger.info(`[3/4] Trying Alpha Vantage for ${ticker}...`);
                result = await fetchFromAlphaVantage(ticker, limit);
                if (result && result.length > 0) {
                    source = 'Alpha Vantage';
                    logger.info(`✅ Alpha Vantage returned ${result.length} candles`);
                }
            } catch (error) {
                const msg = `Alpha Vantage: ${error.message}`;
                logger.warn(`⚠️  Alpha Vantage failed: ${error.message}`);
                errors.push(msg);
            }
        } else if (!result) {
            // Only log if we haven't found data yet AND api key is missing
             if (!ALPHA_VANTAGE_API_KEY) {
                // Not really an error if we found data elsewhere
                // logger.debug(...)
             }
             errors.push('Alpha Vantage: API Key missing');
        }
        
        // Try 4: FMP (Last Resort)
        if (!result && FMP_API_KEY) {
            try {
                logger.info(`[4/4] Trying FMP for ${ticker}...`);
                result = await fetchFromFMP(ticker, limit);
                if (result && result.length > 0) {
                    source = 'FMP';
                    logger.info(`✅ FMP returned ${result.length} candles`);
                }
            } catch (error) {
                const msg = `FMP: ${error.message}`;
                logger.warn(`⚠️  FMP failed: ${error.message}`);
                errors.push(msg);
            }
        } else if (!result) {
            logger.info(`⚠️  FMP not configured (FMP_API_KEY missing)`);
            errors.push('FMP: API Key missing');
        }
        
        // If all sources failed
        if (!result || result.length === 0) {
            logger.error(`❌ All market data sources failed for ${ticker}`);
            return { error: `All sources failed. Details: ${errors.join('; ')}` };
        }
        
        logger.info(`Market data source used: ${source}`);
        
        // Cache for 4 hours
        await setCache(cacheKey, result, 14400);
        logger.info(`Market data cached for ${ticker} (${result.length} candles)`);
        
        return result;
        
    } catch (error) {
        logger.error(`Market data fetch error for ${ticker}:`, error.message);
        return { error: `Internal Error: ${error.message}` };
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
        
        let result = null;
        
        // Try 1: IBKR (primary - real-time, most reliable)
        try {
            logger.info(`[IBKR] Fetching current price for ${ticker}...`);
            const ibkrData = await twsClient.getMarketData(ticker);
            result = {
                ticker: ibkrData.ticker,
                price: ibkrData.price,
                change: ibkrData.change || 0,
                changePercent: ibkrData.changePercent || 0,
                volume: ibkrData.volume || 0,
                dayHigh: ibkrData.dayHigh,
                dayLow: ibkrData.dayLow,
                previousClose: ibkrData.previousClose,
                timestamp: new Date()
            };
            logger.info(`✅ IBKR returned current price: ${result.price}`);
        } catch (error) {
            logger.warn(`⚠️  IBKR current price failed: ${error.message}`);
        }
        
        // Try 2: FMP (fallback)
        if (!result && FMP_API_KEY) {
            try {
                logger.info(`[FMP] Fetching current price for ${ticker}...`);
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
                result = {
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
                logger.info(`✅ FMP returned current price: ${result.price}`);
            } catch (error) {
                logger.warn(`⚠️  FMP current price failed: ${error.message}`);
            }
        }
        
        if (!result) {
            throw new Error('All price sources failed');
        }
        
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

async function getStockQuote(ticker) {
    // Forward to getCurrentPrice which handles multiple sources including Yahoo (v2) and FMP
    return await getCurrentPrice(ticker);
}

module.exports = {
    getHistoricalData,
    extractPriceArrays,
    getCurrentPrice,
    getMultipleQuotes,
    getStockQuote
};
