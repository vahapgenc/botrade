const axios = require('axios');
const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const FMP_API_KEY = process.env.FMP_API_KEY;

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
        
        // Use the new FMP stable API endpoint for historical price data
        const url = `${FMP_BASE_URL}/historical-price-eod/full`;
        const params = {
            symbol: ticker,
            apikey: FMP_API_KEY
        };
        
        const response = await axios.get(url, { params, timeout: 10000 });
        
        if (!response.data) {
            throw new Error('No data returned from FMP API');
        }
        
        // The stable API returns data directly in historical array
        let historical = response.data.historical || response.data;
        
        if (!historical || historical.length === 0) {
            throw new Error(`No historical data available for ${ticker}`);
        }
        
        // Convert to standard format and reverse to oldest-first
        const formattedData = historical
            .slice(0, limit)
            .reverse()
            .map(candle => ({
                date: candle.date,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
                volume: parseInt(candle.volume),
                adjClose: candle.adjClose ? parseFloat(candle.adjClose) : parseFloat(candle.close)
            }));
        
        // Apply timeframe transformation if needed
        let processedData = formattedData;
        if (timeframe === 'weekly') {
            processedData = aggregateToWeekly(formattedData);
        } else if (timeframe === 'monthly') {
            processedData = aggregateToMonthly(formattedData);
        }
        
        const result = {
            ticker,
            timeframe,
            dataPoints: processedData.length,
            data: processedData,
            fetchedAt: new Date()
        };
        
        // Cache for 4 hours (14400 seconds)
        await setCache(cacheKey, result, 14400);
        logger.info(`Market data cached for ${ticker} (${processedData.length} candles)`);
        
        return result;
        
    } catch (error) {
        if (error.response) {
            logger.error(`FMP API error for ${ticker}:`, {
                status: error.response.status,
                data: error.response.data
            });
            
            if (error.response.status === 403) {
                throw new Error('FMP API access denied - check API key or rate limits');
            }
            if (error.response.status === 429) {
                throw new Error('FMP API rate limit exceeded - wait before retrying');
            }
        }
        
        logger.error(`Market data fetch error for ${ticker}:`, error.message);
        throw error;
    }
}

function aggregateToWeekly(dailyData) {
    const weekly = [];
    let currentWeek = [];
    
    dailyData.forEach((day, index) => {
        currentWeek.push(day);
        
        // Check if it's Friday or last day
        const dayOfWeek = new Date(day.date).getDay();
        const isLastDay = index === dailyData.length - 1;
        
        if (dayOfWeek === 5 || isLastDay) {
            if (currentWeek.length > 0) {
                weekly.push({
                    date: currentWeek[currentWeek.length - 1].date, // Use last day of week
                    open: currentWeek[0].open,
                    high: Math.max(...currentWeek.map(d => d.high)),
                    low: Math.min(...currentWeek.map(d => d.low)),
                    close: currentWeek[currentWeek.length - 1].close,
                    volume: currentWeek.reduce((sum, d) => sum + d.volume, 0),
                    adjClose: currentWeek[currentWeek.length - 1].adjClose
                });
                currentWeek = [];
            }
        }
    });
    
    return weekly;
}

function aggregateToMonthly(dailyData) {
    const monthly = {};
    
    dailyData.forEach(day => {
        const monthKey = day.date.substring(0, 7); // YYYY-MM
        
        if (!monthly[monthKey]) {
            monthly[monthKey] = {
                date: day.date,
                open: day.open,
                high: day.high,
                low: day.low,
                close: day.close,
                volume: day.volume,
                adjClose: day.adjClose,
                days: []
            };
        }
        
        monthly[monthKey].days.push(day);
        monthly[monthKey].close = day.close; // Update to latest close
        monthly[monthKey].adjClose = day.adjClose;
        monthly[monthKey].high = Math.max(monthly[monthKey].high, day.high);
        monthly[monthKey].low = Math.min(monthly[monthKey].low, day.low);
        monthly[monthKey].volume += day.volume;
        monthly[monthKey].date = day.date; // Use last day of month
    });
    
    return Object.values(monthly).map(m => ({
        date: m.date,
        open: m.open,
        high: m.high,
        low: m.low,
        close: m.close,
        volume: m.volume,
        adjClose: m.adjClose
    }));
}

function extractPriceArrays(marketData) {
    if (!marketData || !marketData.data) {
        throw new Error('Invalid market data format');
    }
    
    return {
        closes: marketData.data.map(d => d.close),
        opens: marketData.data.map(d => d.open),
        highs: marketData.data.map(d => d.high),
        lows: marketData.data.map(d => d.low),
        volumes: marketData.data.map(d => d.volume),
        dates: marketData.data.map(d => d.date)
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
            timeout: 10000
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
