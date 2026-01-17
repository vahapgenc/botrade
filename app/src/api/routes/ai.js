const express = require('express');
const router = express.Router();
const { getHistoricalData, extractPriceArrays } = require('../../services/market/dataFetcher');
const { analyzeTechnicals } = require('../../services/technical/technicalAnalyzer');
const { getNewsForTicker, getSentimentSignal } = require('../../services/news/newsAnalyzer');
const { getFundamentals } = require('../../services/fundamental/fundamentalAnalyzer');
const { fetchFearGreed } = require('../../services/sentiment/fearGreedFetcher');
const { fetchVIX } = require('../../services/sentiment/vixFetcher');
const { makeAIDecision, getDecisionHistory, getDecisionStats } = require('../../services/ai/aiEngine');
const logger = require('../../utils/logger');

/**
 * GET /api/ai/input/:ticker
 * Returns all AI input data for a ticker in one JSON response
 */
router.get('/input/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        logger.info(`AI input data request for ${ticker}`);
        
        // Use Promise.all where possible to run independent checks in parallel
        // This dramatically reduces total wait time from sum(t) to max(t)
        
        // 1 & 2. Market Data & Technicals (Technicals need 250 days, basic market needs 5)
        // We can just fetch 250 days once and use it for both
        const marketDataPromise = getHistoricalData(ticker, 'daily', 250)
            .catch(err => ({ error: err.message }));

        // 3. News Sentiment
        const newsPromise = getNewsForTicker(ticker, { limit: 20, lookbackDays: 7 })
            .catch(err => ({ error: err.message }));
            
        // 3b. Sentiment Signal (often depends on the news fetch, but can be separate or optimized)
        const signalPromise = getSentimentSignal(ticker, { limit: 20 })
            .catch(err => ({ error: err.message }));

        // 4. Fundamental Analysis
        const fundamentalPromise = getFundamentals(ticker)
             .catch(err => ({ error: err.message }));

        // 5. Market Sentiment (Global)
        const marketSentimentPromise = Promise.all([
            fetchFearGreed(), 
            fetchVIX()
        ]).catch(err => ([{ error: err.message }, { error: err.message }]));

        // Wait for all in parallel
        const [
            marketDataResult, 
            newsResult, 
            signalResult, 
            fundamentalResult, 
            marketSentimentResult
        ] = await Promise.all([
            marketDataPromise,
            newsPromise,
            signalPromise,
            fundamentalPromise,
            marketSentimentPromise
        ]);

        const result = {
            ticker,
            timestamp: new Date(),
            status: {},
            data: {}
        };
        
        // PROCESS 1 & 2: Market & Technicals
        if (marketDataResult && !marketDataResult.error && Array.isArray(marketDataResult) && marketDataResult.length > 0) {
            // Market Data (Latest)
            const latest = marketDataResult[marketDataResult.length - 1]; 
            result.data.market = {
                price: latest.close,
                open: latest.open,
                high: latest.high,
                low: latest.low,
                volume: latest.volume,
                date: latest.date,
                dataPoints: marketDataResult.length
            };
            result.status.market = 'success';

            // Technicals
            try {
                const priceData = extractPriceArrays(marketDataResult);
                const technical = await analyzeTechnicals(priceData);
                result.data.technical = formatTechnicalData(technical); // Refactored helper
                result.status.technical = 'success';
            } catch (err) {
                 result.status.technical = 'error';
                 result.data.technical = { error: err.message };
            }
        } else {
             result.status.market = 'error';
             result.data.market = { error: marketDataResult.error || 'No data' };
             result.status.technical = 'error';
             result.data.technical = { error: 'Dependent on market data' };
        }

        // PROCESS 3: News
        if (newsResult && !newsResult.error) {
             result.data.news = formatNewsData(newsResult, signalResult); // Refactored helper
             result.status.news = 'success';
        } else {
             result.status.news = 'error';
             result.data.news = { error: newsResult.error };
        }

        // PROCESS 4: Fundamentals
        if (fundamentalResult && !fundamentalResult.error) {
             result.data.fundamental = formatFundamentalData(fundamentalResult); // Refactored helper
             result.status.fundamental = 'success';
        } else {
             result.status.fundamental = 'error';
             result.data.fundamental = { error: fundamentalResult.error };
        }

        // PROCESS 5: Market Sentiment
        const [fearGreed, vix] = marketSentimentResult;
        if (!fearGreed.error && !vix.error) {
            result.data.marketSentiment = {
                fearGreed: { value: fearGreed.value, emotion: fearGreed.emotion, valueText: fearGreed.valueText },
                vix: { value: vix.value, interpretation: vix.interpretation, signal: vix.signal }
            };
            result.status.marketSentiment = 'success';
        } else {
            result.status.marketSentiment = 'partial_error';
            result.data.marketSentiment = { error: 'One or more indicators failed' };
        }
        
        // Overall status summary
        result.status.overall = 
            ((result.status.market === 'success' || result.data.market) && 
             (result.status.technical === 'success' || result.data.technical) && 
             (result.status.news === 'success' || result.data.news) && 
             (result.status.fundamental === 'success' || result.data.fundamental)) ? 'complete' : 'partial';
        
        res.json(result);
        
    } catch (error) {
        logger.error('AI input data aggregation error:', error);
        res.status(500).json({ 
            error: 'Failed to aggregation AI input data',
            details: error.message 
        });
    }
});

// Helper functions for formatting

function formatTechnicalData(technical) {
    if (!technical) return null;
    return {
        rsi: {
            value: technical.momentum?.rsi?.value,
            signal: technical.momentum?.rsi?.signal,
            interpretation: technical.momentum?.rsi?.interpretation
        },
        macd: {
            value: technical.macd?.macd,
            signal: technical.macd?.signal,
            histogram: technical.macd?.histogram,
            crossover: technical.macd?.crossover
        },
        bollinger: {
            position: technical.bollinger?.position,
            signal: technical.bollinger?.signal,
            upperBand: technical.bollinger?.upper,
            lowerBand: technical.bollinger?.lower,
            middleBand: technical.bollinger?.middle
        },
        movingAverages: {
            sma20: technical.trend?.sma20,
            sma50: technical.trend?.sma50,
            sma200: technical.trend?.sma200,
            ema9: technical.trend?.ema9,
            ema21: technical.trend?.ema21,
            trend: technical.trend?.trend,
            trendStrength: technical.trend?.trendStrength
        },
        composite: {
            score: technical.composite?.score,
            signal: technical.composite?.signal,
            interpretation: technical.composite?.interpretation,
            confidence: technical.composite?.confidence
        },
        summary: technical.summary ? `${technical.summary.overall} - ${technical.summary.recommendation} (${technical.summary.confidence} confidence). ${technical.summary.keyFactors}` : null
    };
}

function formatNewsData(news, signal) {
    if (!news) return null;
    return {
        source: news.source || 'Unknown',
        articlesCount: news.itemsReturned || 0,
        sentiment: {
            overall: news.sentiment?.overall || 'Neutral',
            score: news.sentiment?.score || 0,
            bullish: news.sentiment?.bullish || 0,
            bearish: news.sentiment?.bearish || 0,
            neutral: news.sentiment?.neutral || 0,
            distribution: news.sentiment?.distribution || {}
        },
        tradingSignal: {
            signal: signal?.signal || 'HOLD',
            strength: signal?.strength || 'NEUTRAL',
            recommendation: signal?.recommendation || 'Insufficient data'
        },
        recentHeadlines: (news.articles || []).slice(0, 3).map(a => ({
            title: a.title || 'No title',
            sentiment: a.sentiment?.label || 'Neutral',
            score: a.sentiment?.score || 0,
            source: a.source || 'Unknown',
            date: a.timePublished || a.publishedAt || new Date().toISOString()
        }))
    };
}

function formatFundamentalData(fundamental) {
    if (!fundamental) return null;
    return {
        source: fundamental.source,
        score: fundamental.canSlim?.score,
        grade: fundamental.canSlim?.grade,
        rating: fundamental.canSlim?.rating,
        profile: {
            name: fundamental.profile?.name,
            sector: fundamental.profile?.sector,
            industry: fundamental.profile?.industry
        },
        valuation: {
            marketCap: fundamental.valuation?.marketCap,
            pe: fundamental.valuation?.pe
        },
        canSlimFactors: fundamental.canSlim?.grades
    };
}

/**
 * GET /api/ai/status
 * Quick health check for all AI data sources
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            timestamp: new Date(),
            services: {}
        };
        
        // Quick checks
        const checks = [
            { name: 'market', test: () => getHistoricalData('AAPL', 'daily', 1) },
            { name: 'news', test: () => getNewsForTicker('AAPL', { limit: 1 }) },
            { name: 'fundamental', test: () => getFundamentals('AAPL') },
            { name: 'fearGreed', test: () => fetchFearGreed() },
            { name: 'vix', test: () => fetchVIX() }
        ];
        
        await Promise.all(checks.map(async (check) => {
            try {
                await check.test();
                status.services[check.name] = 'operational';
            } catch (error) {
                status.services[check.name] = 'error';
            }
        }));
        
        const operational = Object.values(status.services).filter(s => s === 'operational').length;
        const total = Object.keys(status.services).length;
        
        status.overall = operational === total ? 'all_systems_operational' : 'partial_service';
        status.operationalCount = `${operational}/${total}`;
        
        res.json(status);
        
    } catch (error) {
        logger.error('AI status endpoint error:', error);
        res.status(500).json({
            error: 'Failed to check AI system status',
            message: error.message
        });
    }
});

/**
 * POST /api/ai/decide
 * Generate AI trading decision (supports both stock and options)
 */
router.post('/decide', async (req, res) => {
    try {
        const { ticker, companyName, tradingType = 'BOTH' } = req.body;
        
        if (!ticker || !companyName) {
            return res.status(400).json({ 
                error: 'ticker and companyName are required',
                example: { 
                    ticker: 'AAPL', 
                    companyName: 'Apple Inc.',
                    tradingType: 'BOTH' // STOCK, OPTIONS, or BOTH
                }
            });
        }
        
        if (!['STOCK', 'OPTIONS', 'BOTH'].includes(tradingType)) {
            return res.status(400).json({ 
                error: 'tradingType must be STOCK, OPTIONS, or BOTH'
            });
        }
        
        logger.info(`AI decision request for ${ticker} (${tradingType})`);
        
        const decision = await makeAIDecision(ticker.toUpperCase(), companyName, tradingType);
        
        res.json(decision);
        
    } catch (error) {
        logger.error('AI decision error:', error);
        
        if (error.message && error.message.includes('rate limit')) {
            res.status(429).json({ 
                error: 'OpenAI API rate limit exceeded',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

/**
 * GET /api/ai/history
 * Get AI decision history
 */
router.get('/history', async (req, res) => {
    try {
        const { ticker, limit = 10 } = req.query;
        
        const history = await getDecisionHistory(ticker, parseInt(limit));
        
        res.json({
            count: history.length,
            decisions: history
        });
        
    } catch (error) {
        logger.error('Decision history error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ai/stats
 * Get AI decision statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getDecisionStats();
        
        res.json(stats);
        
    } catch (error) {
        logger.error('Decision stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;