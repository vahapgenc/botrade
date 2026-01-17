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
        
        const result = {
            ticker,
            timestamp: new Date(),
            status: {},
            data: {}
        };
        
        // 1. Market Data
        try {
            const marketData = await getHistoricalData(ticker, 5);
            if (marketData && marketData.length > 0) {
                const latest = marketData[0];
                result.data.market = {
                    price: latest.close,
                    open: latest.open,
                    high: latest.high,
                    low: latest.low,
                    volume: latest.volume,
                    date: latest.date,
                    dataPoints: marketData.length
                };
                result.status.market = 'success';
            } else {
                result.status.market = 'no_data';
            }
        } catch (error) {
            logger.error('Market data error:', error.message);
            result.status.market = 'error';
            result.data.market = { error: error.message };
        }
        
        // 2. Technical Indicators
        try {
            const marketData = await getHistoricalData(ticker, 250);
            const priceData = extractPriceArrays(marketData);
            const technical = await analyzeTechnicals(priceData);
            
            result.data.technical = {
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
            result.status.technical = 'success';
        } catch (error) {
            logger.error('Technical analysis error:', error.message);
            result.status.technical = 'error';
            result.data.technical = { error: error.message };
        }
        
        // 3. News Sentiment
        try {
            const news = await getNewsForTicker(ticker, { limit: 20, lookbackDays: 7 });
            const signal = await getSentimentSignal(ticker, { limit: 20 });
            
            result.data.news = {
                source: news.source,
                articlesCount: news.itemsReturned,
                sentiment: {
                    overall: news.sentiment.overall,
                    score: news.sentiment.score,
                    bullish: news.sentiment.bullish,
                    bearish: news.sentiment.bearish,
                    neutral: news.sentiment.neutral,
                    distribution: news.sentiment.distribution
                },
                tradingSignal: {
                    signal: signal.signal,
                    strength: signal.strength,
                    recommendation: signal.recommendation
                },
                recentHeadlines: news.articles.slice(0, 3).map(a => ({
                    title: a.title,
                    sentiment: a.sentiment.label,
                    score: a.sentiment.score,
                    source: a.source,
                    date: a.timePublished
                }))
            };
            result.status.news = 'success';
        } catch (error) {
            logger.error('News sentiment error:', error.message);
            result.status.news = 'error';
            result.data.news = { error: error.message };
        }
        
        // 4. Fundamental Analysis
        try {
            const fundamental = await getFundamentals(ticker);
            
            if (fundamental.error) {
                result.status.fundamental = 'limited';
                result.data.fundamental = {
                    error: fundamental.error,
                    note: 'Fundamental data limited on free API tier'
                };
            } else {
                result.data.fundamental = {
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
                result.status.fundamental = 'success';
            }
        } catch (error) {
            logger.error('Fundamental analysis error:', error.message);
            result.status.fundamental = 'error';
            result.data.fundamental = { error: error.message };
        }
        
        // 5. Market Sentiment
        try {
            const [fearGreed, vix] = await Promise.all([
                fetchFearGreed(),
                fetchVIX()
            ]);
            
            result.data.marketSentiment = {
                fearGreed: {
                    value: fearGreed.value,
                    emotion: fearGreed.emotion,
                    valueText: fearGreed.valueText
                },
                vix: {
                    value: vix.value,
                    interpretation: vix.interpretation,
                    signal: vix.signal
                }
            };
            result.status.marketSentiment = 'success';
        } catch (error) {
            logger.error('Market sentiment error:', error.message);
            result.status.marketSentiment = 'error';
            result.data.marketSentiment = { error: error.message };
        }
        
        // Overall status summary
        const statuses = Object.values(result.status);
        const successCount = statuses.filter(s => s === 'success').length;
        const totalCount = statuses.length;
        
        result.summary = {
            dataSourcesAvailable: `${successCount}/${totalCount}`,
            readyForAI: successCount >= 3, // At least 3 data sources working
            allSystemsOperational: successCount === totalCount
        };
        
        res.json(result);
        
    } catch (error) {
        logger.error('AI input endpoint error:', error);
        res.status(500).json({
            error: 'Failed to fetch AI input data',
            message: error.message
        });
    }
});

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
            { name: 'market', test: () => getHistoricalData('AAPL', 1) },
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
