const yahooFinance = require('yahoo-finance2').default;
const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');

/**
 * Fetch options chain for a ticker
 * Returns calls and puts with all strikes and expiries
 */
async function getOptionsChain(ticker) {
    try {
        const cacheKey = `options:chain:${ticker}`;
        
        // Check cache (15 minutes)
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.info(`Cache HIT for options chain: ${ticker}`);
            return cached;
        }
        
        logger.info(`Fetching options chain for ${ticker}...`);
        
        // Fetch options chain from Yahoo Finance
        const options = await yahooFinance.options(ticker);
        
        if (!options || !options.options || options.options.length === 0) {
            throw new Error(`No options data available for ${ticker}`);
        }
        
        // Process and structure the data
        const processed = {
            ticker,
            underlyingPrice: options.underlyingSymbol?.regularMarketPrice || null,
            expirations: options.expirationDates || [],
            strikes: options.strikes || [],
            chains: options.options.map(expiry => ({
                expiration: expiry.expirationDate,
                calls: expiry.calls.map(call => ({
                    strike: call.strike,
                    lastPrice: call.lastPrice,
                    bid: call.bid,
                    ask: call.ask,
                    volume: call.volume,
                    openInterest: call.openInterest,
                    impliedVolatility: call.impliedVolatility,
                    inTheMoney: call.inTheMoney,
                    // Greeks
                    delta: call.delta || null,
                    gamma: call.gamma || null,
                    theta: call.theta || null,
                    vega: call.vega || null,
                    rho: call.rho || null
                })),
                puts: expiry.puts.map(put => ({
                    strike: put.strike,
                    lastPrice: put.lastPrice,
                    bid: put.bid,
                    ask: put.ask,
                    volume: put.volume,
                    openInterest: put.openInterest,
                    impliedVolatility: put.impliedVolatility,
                    inTheMoney: put.inTheMoney,
                    // Greeks
                    delta: put.delta || null,
                    gamma: put.gamma || null,
                    theta: put.theta || null,
                    vega: put.vega || null,
                    rho: put.rho || null
                }))
            })),
            fetchedAt: new Date()
        };
        
        // Cache for 15 minutes (options data changes frequently)
        await setCache(cacheKey, processed, 900);
        logger.info(`Options chain cached for ${ticker} (${processed.chains.length} expirations)`);
        
        return processed;
        
    } catch (error) {
        logger.error(`Options chain fetch error for ${ticker}:`, error.message);
        throw error;
    }
}

/**
 * Get near-the-money options for analysis
 * Returns options within 5% of current price
 */
async function getNearMoneyOptions(ticker, maxExpiriesCount = 3) {
    try {
        const chain = await getOptionsChain(ticker);
        
        if (!chain.underlyingPrice) {
            throw new Error('Cannot determine underlying price');
        }
        
        const currentPrice = chain.underlyingPrice;
        const priceRange = currentPrice * 0.05; // 5% range
        const minStrike = currentPrice - priceRange;
        const maxStrike = currentPrice + priceRange;
        
        // Get first N expiries (nearest term)
        const nearTermChains = chain.chains.slice(0, maxExpiriesCount);
        
        const filtered = nearTermChains.map(expiry => {
            // Filter calls and puts to near-the-money strikes
            const calls = expiry.calls.filter(call => 
                call.strike >= minStrike && call.strike <= maxStrike
            );
            
            const puts = expiry.puts.filter(put => 
                put.strike >= minStrike && put.strike <= maxStrike
            );
            
            return {
                expiration: expiry.expiration,
                daysToExpiry: Math.ceil((new Date(expiry.expiration) - new Date()) / (1000 * 60 * 60 * 24)),
                calls: calls.sort((a, b) => Math.abs(a.strike - currentPrice) - Math.abs(b.strike - currentPrice)),
                puts: puts.sort((a, b) => Math.abs(a.strike - currentPrice) - Math.abs(b.strike - currentPrice))
            };
        });
        
        return {
            ticker,
            underlyingPrice: currentPrice,
            nearMoneyOptions: filtered,
            fetchedAt: chain.fetchedAt
        };
        
    } catch (error) {
        logger.error(`Near-money options fetch error for ${ticker}:`, error.message);
        throw error;
    }
}

/**
 * Get ATM (At-The-Money) option for a specific expiry
 */
function getATMOption(options, currentPrice, type = 'call') {
    const optionsList = type === 'call' ? options.calls : options.puts;
    
    if (!optionsList || optionsList.length === 0) {
        return null;
    }
    
    // Find strike closest to current price
    return optionsList.reduce((prev, curr) => {
        return Math.abs(curr.strike - currentPrice) < Math.abs(prev.strike - currentPrice) ? curr : prev;
    });
}

/**
 * Calculate basic option strategy metrics
 */
function calculateStrategyMetrics(strategy, currentPrice, legs) {
    switch (strategy) {
        case 'LONG_CALL':
            return calculateLongCall(currentPrice, legs[0]);
        case 'LONG_PUT':
            return calculateLongPut(currentPrice, legs[0]);
        case 'COVERED_CALL':
            return calculateCoveredCall(currentPrice, legs[0], legs[1]);
        case 'PROTECTIVE_PUT':
            return calculateProtectivePut(currentPrice, legs[0], legs[1]);
        case 'BULL_CALL_SPREAD':
            return calculateBullCallSpread(currentPrice, legs[0], legs[1]);
        case 'BEAR_PUT_SPREAD':
            return calculateBearPutSpread(currentPrice, legs[0], legs[1]);
        default:
            return null;
    }
}

function calculateLongCall(currentPrice, call) {
    const premium = call.ask || call.lastPrice; // Use ask price for buying
    const maxLoss = premium * 100; // Per contract
    const breakeven = call.strike + premium;
    
    return {
        strategy: 'LONG_CALL',
        legs: [{
            action: 'BUY',
            type: 'CALL',
            strike: call.strike,
            premium: premium,
            contracts: 1
        }],
        maxProfit: Infinity,
        maxLoss: maxLoss,
        breakeven: breakeven,
        collateralRequired: maxLoss,
        profitAtPrice: (price) => {
            if (price <= call.strike) return -maxLoss;
            return (price - call.strike - premium) * 100;
        }
    };
}

function calculateLongPut(currentPrice, put) {
    const premium = put.ask || put.lastPrice;
    const maxLoss = premium * 100;
    const breakeven = put.strike - premium;
    
    return {
        strategy: 'LONG_PUT',
        legs: [{
            action: 'BUY',
            type: 'PUT',
            strike: put.strike,
            premium: premium,
            contracts: 1
        }],
        maxProfit: (put.strike - premium) * 100,
        maxLoss: maxLoss,
        breakeven: breakeven,
        collateralRequired: maxLoss,
        profitAtPrice: (price) => {
            if (price >= put.strike) return -maxLoss;
            return (put.strike - price - premium) * 100;
        }
    };
}

function calculateCoveredCall(currentPrice, stock, call) {
    const premium = call.bid || call.lastPrice; // Use bid price for selling
    const stockCost = currentPrice * 100; // 100 shares
    const maxLoss = stockCost - (premium * 100);
    const maxProfit = ((call.strike - currentPrice) * 100) + (premium * 100);
    
    return {
        strategy: 'COVERED_CALL',
        legs: [
            {
                action: 'BUY',
                type: 'STOCK',
                quantity: 100,
                price: currentPrice
            },
            {
                action: 'SELL',
                type: 'CALL',
                strike: call.strike,
                premium: premium,
                contracts: 1
            }
        ],
        maxProfit: maxProfit,
        maxLoss: maxLoss,
        breakeven: currentPrice - premium,
        collateralRequired: stockCost,
        profitAtPrice: (price) => {
            const stockPnL = (price - currentPrice) * 100;
            const optionPnL = price >= call.strike ? -(price - call.strike) * 100 : 0;
            const premiumReceived = premium * 100;
            return stockPnL + optionPnL + premiumReceived;
        }
    };
}

function calculateProtectivePut(currentPrice, stock, put) {
    const premium = put.ask || put.lastPrice;
    const stockCost = currentPrice * 100;
    const totalCost = stockCost + (premium * 100);
    const maxLoss = (currentPrice - put.strike) * 100 + (premium * 100);
    
    return {
        strategy: 'PROTECTIVE_PUT',
        legs: [
            {
                action: 'BUY',
                type: 'STOCK',
                quantity: 100,
                price: currentPrice
            },
            {
                action: 'BUY',
                type: 'PUT',
                strike: put.strike,
                premium: premium,
                contracts: 1
            }
        ],
        maxProfit: Infinity,
        maxLoss: maxLoss,
        breakeven: currentPrice + premium,
        collateralRequired: totalCost,
        profitAtPrice: (price) => {
            const stockPnL = (price - currentPrice) * 100;
            const putPnL = price < put.strike ? (put.strike - price) * 100 : 0;
            const premiumPaid = premium * 100;
            return stockPnL + putPnL - premiumPaid;
        }
    };
}

function calculateBullCallSpread(currentPrice, longCall, shortCall) {
    const netPremium = (longCall.ask - shortCall.bid) || (longCall.lastPrice - shortCall.lastPrice);
    const maxLoss = netPremium * 100;
    const maxProfit = ((shortCall.strike - longCall.strike) - netPremium) * 100;
    const breakeven = longCall.strike + netPremium;
    
    return {
        strategy: 'BULL_CALL_SPREAD',
        legs: [
            {
                action: 'BUY',
                type: 'CALL',
                strike: longCall.strike,
                premium: longCall.ask || longCall.lastPrice,
                contracts: 1
            },
            {
                action: 'SELL',
                type: 'CALL',
                strike: shortCall.strike,
                premium: shortCall.bid || shortCall.lastPrice,
                contracts: 1
            }
        ],
        maxProfit: maxProfit,
        maxLoss: maxLoss,
        breakeven: breakeven,
        collateralRequired: maxLoss,
        profitAtPrice: (price) => {
            if (price <= longCall.strike) return -maxLoss;
            if (price >= shortCall.strike) return maxProfit;
            return ((price - longCall.strike) - netPremium) * 100;
        }
    };
}

function calculateBearPutSpread(currentPrice, longPut, shortPut) {
    const netPremium = (longPut.ask - shortPut.bid) || (longPut.lastPrice - shortPut.lastPrice);
    const maxLoss = netPremium * 100;
    const maxProfit = ((longPut.strike - shortPut.strike) - netPremium) * 100;
    const breakeven = longPut.strike - netPremium;
    
    return {
        strategy: 'BEAR_PUT_SPREAD',
        legs: [
            {
                action: 'BUY',
                type: 'PUT',
                strike: longPut.strike,
                premium: longPut.ask || longPut.lastPrice,
                contracts: 1
            },
            {
                action: 'SELL',
                type: 'PUT',
                strike: shortPut.strike,
                premium: shortPut.bid || shortPut.lastPrice,
                contracts: 1
            }
        ],
        maxProfit: maxProfit,
        maxLoss: maxLoss,
        breakeven: breakeven,
        collateralRequired: maxLoss,
        profitAtPrice: (price) => {
            if (price >= longPut.strike) return -maxLoss;
            if (price <= shortPut.strike) return maxProfit;
            return ((longPut.strike - price) - netPremium) * 100;
        }
    };
}

module.exports = {
    getOptionsChain,
    getNearMoneyOptions,
    getATMOption,
    calculateStrategyMetrics
};
