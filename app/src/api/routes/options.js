const express = require('express');
const router = express.Router();
const twsClient = require('../../services/ibkr/twsClient');
const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../../services/cache/cacheManager'); // Using cache now

/**
 * Get option chain for a stock
 * Returns available expirations and strikes
 */
router.get('/chain/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { exchange = 'SMART' } = req.query;
        const cacheKey = `option_chain:${ticker}:${exchange}`;

        // Check cache first
        const cachedChain = await getCache(cacheKey);
        if (cachedChain) {
            return res.json(cachedChain);
        }
        
        logger.info(`Option chain request for ${ticker}`);
        
        // Add timeout wrapper (increased to 45s for slow TWS responses)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Option chain request timeout')), 45000)
        );
        
        const optionChain = await Promise.race([
            twsClient.getOptionChain(ticker, exchange),
            timeoutPromise
        ]);

        // Cache for 15 minutes
        await setCache(cacheKey, optionChain, 900);
        
        res.json(optionChain);
        
    } catch (error) {
        logger.error('Option chain error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch option chain',
            details: error.message 
        });
    }
});

/**
 * Get specific option contract data
 * Returns bid, ask, greeks, IV
 */
router.get('/contract/:ticker/:expiration/:strike/:right', async (req, res) => {
    try {
        const { ticker, expiration, strike, right } = req.params;
        const { exchange = 'SMART' } = req.query;
        
        // Validate right (C or P)
        if (!['C', 'P'].includes(right.toUpperCase())) {
            return res.status(400).json({ error: 'Right must be C (call) or P (put)' });
        }
        
        logger.info(`Option contract request: ${ticker} ${expiration} ${strike} ${right}`);
        
        const contractData = await twsClient.getOptionContract(
            ticker, 
            expiration, 
            parseFloat(strike), 
            right.toUpperCase(),
            exchange
        );
        
        res.json(contractData);
        
    } catch (error) {
        logger.error('Option contract error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch option contract',
            details: error.message 
        });
    }
});

/**
 * Get option quotes for multiple strikes at same expiration
 * Useful for displaying full chain at specific expiration
 */
router.post('/quotes', async (req, res) => {
    try {
        const { ticker, expiration, strikes, right = 'C', exchange = 'SMART' } = req.body;
        
        if (!ticker || !expiration || !strikes || !Array.isArray(strikes)) {
            return res.status(400).json({ 
                error: 'Required: ticker, expiration, strikes (array)' 
            });
        }
        
        if (strikes.length > 20) {
            return res.status(400).json({ 
                error: 'Maximum 20 strikes per request' 
            });
        }
        
        logger.info(`Option quotes request: ${ticker} ${expiration} - ${strikes.length} strikes`);
        
        // Fetch all option contracts in parallel
        const contractPromises = strikes.map(strike => 
            twsClient.getOptionContract(ticker, expiration, parseFloat(strike), right, exchange)
                .catch(err => ({
                    strike: parseFloat(strike),
                    error: err.message
                }))
        );
        
        const contracts = await Promise.all(contractPromises);
        
        res.json({
            ticker,
            expiration,
            right,
            contracts,
            count: contracts.length,
            fetchedAt: new Date()
        });
        
    } catch (error) {
        logger.error('Option quotes error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch option quotes',
            details: error.message 
        });
    }
});

/**
 * Get at-the-money (ATM) options for quick analysis
 */
router.get('/atm/:ticker/:expiration', async (req, res) => {
    try {
        const { ticker, expiration } = req.params;
        const { exchange = 'SMART', spread = 5 } = req.query;
        
        logger.info(`ATM options request: ${ticker} ${expiration}`);
        
        // First get current stock price
        const marketData = await twsClient.getMarketData(ticker);
        const currentPrice = marketData.price;
        
        // Get option chain to find available strikes (Use cache if available)
        const cacheKey = `option_chain:${ticker}:${exchange}`;
        let optionChain = await getCache(cacheKey);
        
        if (!optionChain) {
            // If not in cache, fetch and cache
            optionChain = await twsClient.getOptionChain(ticker, exchange);
            await setCache(cacheKey, optionChain, 900);
        }
        
        // Find strikes closest to current price
        const validStrikes = optionChain.strikes || [];
        const atmStrike = validStrikes.reduce((prev, curr) => 
            Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
        );
        
        // Get strikes within spread range
        const strikesAround = validStrikes.filter(strike => 
            Math.abs(strike - atmStrike) <= parseInt(spread)
        ).sort((a, b) => a - b);
        
        // Fetch both calls and puts for ATM strikes
        const callPromises = strikesAround.map(strike =>
            twsClient.getOptionContract(ticker, expiration, strike, 'C', exchange)
                .catch(err => ({ strike, error: err.message }))
        );
        
        const putPromises = strikesAround.map(strike =>
            twsClient.getOptionContract(ticker, expiration, strike, 'P', exchange)
                .catch(err => ({ strike, error: err.message }))
        );
        
        const [calls, puts] = await Promise.all([
            Promise.all(callPromises),
            Promise.all(putPromises)
        ]);
        
        res.json({
            ticker,
            expiration,
            currentPrice,
            atmStrike,
            calls,
            puts,
            fetchedAt: new Date()
        });
        
    } catch (error) {
        logger.error('ATM options error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch ATM options',
            details: error.message 
        });
    }
});

module.exports = router;
