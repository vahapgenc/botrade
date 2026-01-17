const NewsAPI = require('newsapi');
const axios = require('axios');
const Parser = require('rss-parser');
const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');
const twsClient = require('../ibkr/twsClient');

// Multiple news sources for fallback strategy
// 1. IBKR TWS (Primary) - Most reliable, real-time, no limits
// 2. NewsAPI (Secondary) - 100 requests/day
const newsapi = process.env.NEWS_API_KEY ? new NewsAPI(process.env.NEWS_API_KEY) : null;

// 3. Alpha Vantage (Fallback) - 25 requests/day for news
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// 4. Google News RSS (Last resort) - No API key needed
const rssParser = new Parser();

/**
 * Fetch news from Interactive Brokers TWS (Primary)
 */
async function fetchFromIBKR(ticker, options = {}) {
    const { limit = 50 } = options;
    
    try {
        logger.info(`[IBKR] Fetching news for ${ticker}...`);
        const ibkrNews = await twsClient.getNewsArticles(ticker, { limit });
        
        if (!ibkrNews || ibkrNews.length === 0) {
            return null;
        }

        // Convert IBKR format to standard format
        const articles = ibkrNews.map(article => {
            // Apply sentiment analysis locally since IBKR just gives us text
            const sentimentResult = analyzeSentiment(article.headline, article.headline);
            
            return {
                title: article.headline,
                description: article.headline,
                url: null, // IBKR doesn't provide URLs in historical news
                publishedAt: article.publishedAt,
                source: {
                    name: article.providerCode || 'IBKR'
                },
                content: null,
                // Add unified sentiment properties so aggregators work
                sentiment: {
                    label: sentimentResult.label,
                    score: (sentimentResult.score - 50) / 50 // Convert 0-100 to -1 to 1
                },
                // Add AlphaVantage-style properties so calculateOverallSentiment works without changes
                overall_sentiment_score: (sentimentResult.score - 50) / 50,
                overall_sentiment_label: sentimentResult.label
            };
        });

        logger.info(`✅ IBKR returned ${articles.length} news articles`);
        
        return {
            ticker,
            source: 'IBKR',
            itemsReturned: articles.length,
            articles
        };
    } catch (error) {
        throw new Error(`IBKR news fetch failed: ${error.message}`);
    }
}

/**
 * MAIN FUNCTION: Get news with fallback strategy
 * Tries IBKR → NewsAPI → Alpha Vantage → Google News RSS
 * Combines IBKR + NewsAPI for comprehensive coverage
 */
async function getNewsForTicker(ticker, options = {}) {
    const { limit = 50, lookbackDays = 7 } = options;
    const cacheKey = `news:ticker:${ticker}:${limit}:${lookbackDays}`;
    
    // Check cache (30 minutes)
    const cached = await getCache(cacheKey);
    if (cached) {
        logger.info(`Cache HIT for news: ${ticker}`);
        return cached;
    }
    
    logger.info(`Fetching news for ${ticker} with fallback strategy...`);
    
    let ibkrResult = null;
    let otherResult = null;
    let combinedArticles = [];
    let sources = [];
    
    // Try 1: Interactive Brokers TWS (primary - most reliable, real-time)
    try {
        logger.info(`[1/4] Trying IBKR for ${ticker}...`);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('IBKR news timeout')), 15000)
        );
        const ibkrPromise = fetchFromIBKR(ticker, { limit });
        ibkrResult = await Promise.race([ibkrPromise, timeoutPromise]);
        if (ibkrResult && ibkrResult.articles && ibkrResult.articles.length > 0) {
            sources.push('IBKR');
            combinedArticles.push(...ibkrResult.articles);
            logger.info(`✅ IBKR returned ${ibkrResult.articles.length} articles`);
        } else {
            logger.warn(`⚠️  IBKR returned no articles for ${ticker}`);
        }
    } catch (error) {
        logger.warn(`⚠️  IBKR failed: ${error.message}`);
        // Continue to fallbacks - don't crash
    }
    
    // Try 2: NewsAPI (secondary - good for detailed content and URLs)
    if (newsapi) {
        try {
            logger.info(`[2/4] Trying NewsAPI for ${ticker}...`);
            otherResult = await fetchFromNewsAPI(ticker, lookbackDays);
            if (otherResult && otherResult.articles && otherResult.articles.length > 0) {
                sources.push('NewsAPI');
                combinedArticles.push(...otherResult.articles);
                logger.info(`✅ NewsAPI returned ${otherResult.articles.length} articles`);
            } else {
                logger.warn(`⚠️  NewsAPI returned no articles for ${ticker}`);
            }
        } catch (error) {
            logger.warn(`⚠️  NewsAPI failed: ${error.message}`);
        }
    } else {
        logger.info(`⚠️  NewsAPI not configured (NEWS_API_KEY missing)`);
    }
    
    // Try 3: Alpha Vantage (third option)
    if (combinedArticles.length === 0 && ALPHA_VANTAGE_API_KEY) {
        try {
            logger.info(`[3/4] Trying Alpha Vantage for ${ticker}...`);
            otherResult = await fetchFromAlphaVantage(ticker, { limit });
            if (otherResult && otherResult.articles && otherResult.articles.length > 0) {
                sources.push('Alpha Vantage');
                combinedArticles.push(...otherResult.articles);
                logger.info(`✅ Alpha Vantage returned ${otherResult.articles.length} articles`);
            } else {
                logger.warn(`⚠️  Alpha Vantage returned no articles for ${ticker}`);
            }
        } catch (error) {
            logger.warn(`⚠️  Alpha Vantage failed: ${error.message}`);
        }
    } else if (combinedArticles.length === 0) {
        logger.info(`⚠️  Alpha Vantage not configured (ALPHA_VANTAGE_API_KEY missing)`);
    }
    
    // Try 4: Google News RSS (last resort)
    if (combinedArticles.length === 0) {
        try {
            logger.info(`[4/4] Trying Google News RSS for ${ticker}...`);
            otherResult = await fetchFromGoogleNews(ticker);
            if (otherResult && otherResult.articles && otherResult.articles.length > 0) {
                sources.push('Google News RSS');
                combinedArticles.push(...otherResult.articles);
                logger.info(`✅ Google News returned ${otherResult.articles.length} articles`);
            } else {
                logger.warn(`⚠️  Google News returned no articles for ${ticker}`);
            }
        } catch (error) {
            logger.warn(`⚠️  Google News failed: ${error.message}`);
        }
    }
    
    // If all sources failed
    if (combinedArticles.length === 0) {
        logger.error(`❌ All news sources failed for ${ticker}`);
        return {
            ticker,
            source: 'none',
            itemsReturned: 0,
            sentiment: { overall: 'Neutral', score: 0, totalArticles: 0 },
            articles: [],
            error: 'No news sources available or all returned no results',
            fetchedAt: new Date()
        };
    }

    // Remove duplicates based on title similarity
    const uniqueArticles = [];
    const seenTitles = new Set();
    
    for (const article of combinedArticles) {
        const normalizedTitle = article.title?.toLowerCase().trim();
        if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueArticles.push(article);
        }
    }

    // Sort by date (most recent first)
    uniqueArticles.sort((a, b) => {
        const dateA = new Date(a.publishedAt || 0);
        const dateB = new Date(b.publishedAt || 0);
        return dateB - dateA;
    });

    // Limit to requested amount
    const limitedArticles = uniqueArticles.slice(0, limit);

    logger.info(`News sources used: ${sources.join(' + ')} (${limitedArticles.length} unique articles afrer deduplication)`);
    
    // Calculate aggregate sentiment from all sources
    const aggregatedSentiment = calculateOverallSentiment(limitedArticles);
    
    const result = {
        ticker,
        source: sources.join(' + '),
        itemsReturned: limitedArticles.length,
        sentiment: aggregatedSentiment,
        articles: limitedArticles,
        fetchedAt: new Date()
    };
    
    // Cache for 30 minutes (1800 seconds)
    await setCache(cacheKey, result, 1800);
    logger.info(`News cached for ${ticker} from ${source}`);
    
    return result;
}

/**
 * SOURCE 1: NewsAPI (Primary)
 */
async function fetchFromNewsAPI(ticker, lookbackDays = 7) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - lookbackDays);
    
    const response = await newsapi.v2.everything({
        q: ticker,
        language: 'en',
        sortBy: 'publishedAt',
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
        pageSize: 50
    });
    
    if (!response.articles || response.articles.length === 0) {
        return null;
    }
    
    // Analyze sentiment for each article
    const analyzedArticles = response.articles.map(article => {
        const sentiment = analyzeSentiment(article.title, article.description);
        return {
            title: article.title,
            summary: article.description,
            url: article.url,
            source: article.source.name,
            timePublished: article.publishedAt,
            sentiment: {
                label: sentiment.label,
                score: (sentiment.score - 50) / 50 // Convert 0-100 to -1 to 1
            }
        };
    });
    
    return {
        ticker,
        itemsReturned: analyzedArticles.length,
        sentiment: calculateSentimentFromNewsAPI(analyzedArticles),
        articles: analyzedArticles,
        topics: []
    };
}

/**
 * SOURCE 2: Alpha Vantage (Fallback)
 */
async function fetchFromAlphaVantage(ticker, options = {}) {
    const { limit = 50, sort = 'LATEST', timeFrom, timeTo } = options;
    
    const params = {
        function: 'NEWS_SENTIMENT',
        tickers: ticker,
        apikey: ALPHA_VANTAGE_API_KEY,
        limit,
        sort
    };
    
    if (timeFrom) params.time_from = timeFrom;
    if (timeTo) params.time_to = timeTo;
    
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params,
        timeout: 5000
    });
    
    if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit (25 requests/day on free tier)');
    }
    
    if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
    }
    
    const articles = response.data.feed || [];
    
    if (articles.length === 0) {
        return null;
    }
    
    return {
        ticker,
        itemsReturned: articles.length,
        sentiment: calculateAggregatedSentiment(articles, ticker),
        articles: articles.slice(0, 20).map(article => processArticle(article, ticker)),
        topics: extractTopics(articles)
    };
}

/**
 * SOURCE 3: Google News RSS (Last Resort)
 */
async function fetchFromGoogleNews(ticker) {
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(ticker)}&hl=en-US&gl=US&ceid=US:en`;
    
    const feed = await rssParser.parseURL(googleNewsUrl);
    
    if (!feed.items || feed.items.length === 0) {
        return null;
    }
    
    // Process RSS items
    const articles = feed.items.slice(0, 20).map(item => {
        const sentiment = analyzeSentiment(item.title, item.contentSnippet || '');
        return {
            title: item.title,
            summary: item.contentSnippet || '',
            url: item.link,
            source: item.source?.title || 'Google News',
            timePublished: item.pubDate,
            sentiment: {
                label: sentiment.label,
                score: (sentiment.score - 50) / 50 // Convert 0-100 to -1 to 1
            }
        };
    });
    
    return {
        ticker,
        itemsReturned: articles.length,
        sentiment: calculateSentimentFromNewsAPI(articles),
        articles: articles,
        topics: []
    };
}

/**
 * Get news by topics (Alpha Vantage only - has topic filtering)
 */
async function getNewsByTopics(topics, options = {}) {
    try {
        const { limit = 50, sort = 'LATEST', timeFrom, timeTo } = options;
        const topicsStr = Array.isArray(topics) ? topics.join(',') : topics;
        const cacheKey = `news:topics:${topicsStr}:${limit}:${sort}`;
        
        // Check cache (30 minutes)
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.info(`Cache HIT for news topics: ${topicsStr}`);
            return cached;
        }
        
        if (!ALPHA_VANTAGE_API_KEY) {
            throw new Error('ALPHA_VANTAGE_API_KEY required for topic-based news');
        }
        
        logger.info(`Fetching news for topics: ${topicsStr}...`);
        
        const params = {
            function: 'NEWS_SENTIMENT',
            topics: topicsStr,
            apikey: ALPHA_VANTAGE_API_KEY,
            limit,
            sort
        };
        
        if (timeFrom) params.time_from = timeFrom;
        if (timeTo) params.time_to = timeTo;
        
        const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
            params,
            timeout: 5000
        });
        
        if (response.data.Note) {
            throw new Error('API rate limit reached');
        }
        
        const articles = response.data.feed || [];
        
        const processed = {
            topics: topics,
            source: 'Alpha Vantage',
            itemsReturned: articles.length,
            sentiment: calculateOverallSentiment(articles),
            articles: articles.slice(0, 20).map(article => processArticle(article)),
            fetchedAt: new Date()
        };
        
        // Cache for 30 minutes
        await setCache(cacheKey, processed, 1800);
        logger.info(`News cached for topics: ${topicsStr}`);
        
        return processed;
        
    } catch (error) {
        logger.error(`News fetch error for topics ${topics}:`, error.message);
        throw error;
    }
}

/**
 * Get latest market news
 */
async function getLatestMarketNews(options = {}) {
    return getNewsByTopics(['financial_markets'], { ...options, limit: options.limit || 20 });
}

/**
 * Analyze sentiment using keyword matching (for NewsAPI and Google News)
 */
function analyzeSentiment(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    
    const positiveKeywords = [
        'surge', 'soar', 'rally', 'jump', 'gain', 'rise', 'climbs', 'up',
        'profit', 'revenue', 'earnings', 'beat', 'exceed', 'outperform',
        'growth', 'expand', 'strong', 'bullish', 'positive', 'upgrade',
        'innovation', 'breakthrough', 'success', 'win', 'partnership',
        'acquisition', 'buyback', 'dividend', 'record', 'high', 'boost'
    ];
    
    const negativeKeywords = [
        'plunge', 'crash', 'fall', 'drop', 'decline', 'slump', 'down',
        'loss', 'miss', 'disappoint', 'underperform', 'weak', 'bearish',
        'concern', 'risk', 'threat', 'warning', 'downgrade', 'sell',
        'lawsuit', 'investigation', 'scandal', 'fraud', 'bankruptcy',
        'layoff', 'cut', 'reduce', 'problem', 'issue', 'negative', 'low'
    ];
    
    let score = 50; // Start neutral
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            positiveCount++;
            score += 2;
        }
    });
    
    negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            negativeCount++;
            score -= 2;
        }
    });
    
    score = Math.max(0, Math.min(100, score));
    
    let label;
    if (score >= 70) label = 'VERY_POSITIVE';
    else if (score >= 55) label = 'POSITIVE';
    else if (score >= 45) label = 'NEUTRAL';
    else if (score >= 30) label = 'NEGATIVE';
    else label = 'VERY_NEGATIVE';
    
    return { score: Math.round(score), label, positiveMatches: positiveCount, negativeMatches: negativeCount };
}

/**
 * Calculate sentiment from NewsAPI/Google News articles
 */
function calculateSentimentFromNewsAPI(articles) {
    if (!articles || articles.length === 0) {
        return { overall: 'Neutral', score: 0, totalArticles: 0 };
    }
    
    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    articles.forEach(article => {
        const score = article.sentiment.score;
        totalScore += score;
        
        if (score > 0.15) bullishCount++;
        else if (score < -0.15) bearishCount++;
        else neutralCount++;
    });
    
    const avgScore = totalScore / articles.length;
    
    let overallLabel;
    if (avgScore > 0.35) overallLabel = 'Strongly Bullish';
    else if (avgScore > 0.15) overallLabel = 'Bullish';
    else if (avgScore < -0.35) overallLabel = 'Strongly Bearish';
    else if (avgScore < -0.15) overallLabel = 'Bearish';
    else overallLabel = 'Neutral';
    
    return {
        overall: overallLabel,
        score: parseFloat(avgScore.toFixed(4)),
        bullish: bullishCount,
        bearish: bearishCount,
        neutral: neutralCount,
        totalArticles: articles.length,
        distribution: {
            bullish: ((bullishCount / articles.length) * 100).toFixed(1) + '%',
            bearish: ((bearishCount / articles.length) * 100).toFixed(1) + '%',
            neutral: ((neutralCount / articles.length) * 100).toFixed(1) + '%'
        }
    };
}

/**
 * Process a single news article
 * @param {Object} article - Raw article from API
 * @param {string} specificTicker - Optional ticker to extract specific sentiment
 * @returns {Object} Processed article
 */
function processArticle(article, specificTicker = null) {
    const processed = {
        title: article.title,
        url: article.url,
        timePublished: article.time_published,
        authors: article.authors || [],
        summary: article.summary,
        source: article.source,
        sourceLink: article.source_domain,
        sentiment: {
            label: article.overall_sentiment_label,
            score: parseFloat(article.overall_sentiment_score || 0)
        },
        topics: article.topics ? article.topics.map(t => ({
            topic: t.topic,
            relevance: parseFloat(t.relevance_score || 0)
        })) : []
    };
    
    // If specific ticker requested, extract its sentiment
    if (specificTicker && article.ticker_sentiment) {
        const tickerSentiment = article.ticker_sentiment.find(
            ts => ts.ticker === specificTicker
        );
        
        if (tickerSentiment) {
            processed.tickerSentiment = {
                ticker: specificTicker,
                relevance: parseFloat(tickerSentiment.relevance_score || 0),
                label: tickerSentiment.ticker_sentiment_label,
                score: parseFloat(tickerSentiment.ticker_sentiment_score || 0)
            };
        }
    }
    
    return processed;
}

/**
 * Calculate aggregated sentiment for a specific ticker
 * @param {Array} articles - Array of news articles
 * @param {string} ticker - Stock ticker to analyze
 * @returns {Object} Aggregated sentiment analysis
 */
function calculateAggregatedSentiment(articles, ticker) {
    if (!articles || articles.length === 0) {
        return {
            overall: 'Neutral',
            score: 0,
            bullish: 0,
            bearish: 0,
            neutral: 0,
            totalArticles: 0
        };
    }
    
    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let relevantArticles = 0;
    
    articles.forEach(article => {
        // Try to find ticker-specific sentiment first
        let sentimentScore = 0;
        let sentimentLabel = article.overall_sentiment_label;
        
        if (article.ticker_sentiment) {
            const tickerSentiment = article.ticker_sentiment.find(
                ts => ts.ticker === ticker
            );
            if (tickerSentiment) {
                sentimentScore = parseFloat(tickerSentiment.ticker_sentiment_score || 0);
                sentimentLabel = tickerSentiment.ticker_sentiment_label;
                relevantArticles++;
            }
        }
        
        // Fallback to overall sentiment
        if (sentimentScore === 0) {
            sentimentScore = parseFloat(article.overall_sentiment_score || 0);
        }
        
        totalScore += sentimentScore;
        
        // Categorize sentiment
        if (sentimentLabel.includes('Bullish') || sentimentScore > 0.15) {
            bullishCount++;
        } else if (sentimentLabel.includes('Bearish') || sentimentScore < -0.15) {
            bearishCount++;
        } else {
            neutralCount++;
        }
    });
    
    const avgScore = articles.length > 0 ? totalScore / articles.length : 0;
    
    // Determine overall sentiment label
    let overallLabel;
    if (avgScore > 0.35) {
        overallLabel = 'Strongly Bullish';
    } else if (avgScore > 0.15) {
        overallLabel = 'Bullish';
    } else if (avgScore < -0.35) {
        overallLabel = 'Strongly Bearish';
    } else if (avgScore < -0.15) {
        overallLabel = 'Bearish';
    } else {
        overallLabel = 'Neutral';
    }
    
    return {
        overall: overallLabel,
        score: parseFloat(avgScore.toFixed(4)),
        bullish: bullishCount,
        bearish: bearishCount,
        neutral: neutralCount,
        totalArticles: articles.length,
        relevantArticles,
        distribution: {
            bullish: ((bullishCount / articles.length) * 100).toFixed(1) + '%',
            bearish: ((bearishCount / articles.length) * 100).toFixed(1) + '%',
            neutral: ((neutralCount / articles.length) * 100).toFixed(1) + '%'
        }
    };
}

/**
 * Calculate overall sentiment across all articles (not ticker-specific)
 * @param {Array} articles - Array of news articles
 * @returns {Object} Overall sentiment analysis
 */
function calculateOverallSentiment(articles) {
    if (!articles || articles.length === 0) {
        return {
            overall: 'Neutral',
            score: 0,
            bullish: 0,
            bearish: 0,
            neutral: 0,
            totalArticles: 0
        };
    }
    
    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    articles.forEach(article => {
        // Handle multiple formats (AlphaVantage vs Internal)
        let score = 0;
        let label = '';
        
        if (article.overall_sentiment_score !== undefined) {
             score = parseFloat(article.overall_sentiment_score);
             label = article.overall_sentiment_label || '';
        } else if (article.sentiment && article.sentiment.score !== undefined) {
             score = parseFloat(article.sentiment.score);
             label = article.sentiment.label || '';
        }
        
        totalScore += score;
        
        if (label.includes('Bullish') || label === 'VERY_POSITIVE' || label === 'POSITIVE' || score > 0.15) {
            bullishCount++;
        } else if (label.includes('Bearish') || label === 'VERY_NEGATIVE' || label === 'NEGATIVE' || score < -0.15) {
            bearishCount++;
        } else {
            neutralCount++;
        }
    });
    
    const avgScore = totalScore / articles.length;
    
    let overallLabel;
    if (avgScore > 0.35) {
        overallLabel = 'Strongly Bullish';
    } else if (avgScore > 0.15) {
        overallLabel = 'Bullish';
    } else if (avgScore < -0.35) {
        overallLabel = 'Strongly Bearish';
    } else if (avgScore < -0.15) {
        overallLabel = 'Bearish';
    } else {
        overallLabel = 'Neutral';
    }
    
    return {
        overall: overallLabel,
        score: parseFloat(avgScore.toFixed(4)),
        bullish: bullishCount,
        bearish: bearishCount,
        neutral: neutralCount,
        totalArticles: articles.length,
        distribution: {
            bullish: ((bullishCount / articles.length) * 100).toFixed(1) + '%',
            bearish: ((bearishCount / articles.length) * 100).toFixed(1) + '%',
            neutral: ((neutralCount / articles.length) * 100).toFixed(1) + '%'
        }
    };
}

/**
 * Extract and count topics from articles
 * @param {Array} articles - Array of news articles
 * @returns {Array} Topic distribution
 */
function extractTopics(articles) {
    const topicMap = new Map();
    
    articles.forEach(article => {
        if (article.topics) {
            article.topics.forEach(topicObj => {
                const topic = topicObj.topic;
                if (!topicMap.has(topic)) {
                    topicMap.set(topic, {
                        topic,
                        count: 0,
                        totalRelevance: 0
                    });
                }
                const data = topicMap.get(topic);
                data.count++;
                data.totalRelevance += parseFloat(topicObj.relevance_score || 0);
            });
        }
    });
    
    // Convert to array and sort by count
    return Array.from(topicMap.values())
        .map(t => ({
            topic: t.topic,
            count: t.count,
            avgRelevance: parseFloat((t.totalRelevance / t.count).toFixed(3))
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 topics
}

/**
 * Get sentiment signal for trading decisions
 * @param {string} ticker - Stock ticker
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} Trading signal based on news sentiment
 */
async function getSentimentSignal(ticker, options = {}) {
    try {
        const newsData = await getNewsForTicker(ticker, options);
        const sentiment = newsData.sentiment;
        
        let signal, strength, recommendation;
        
        if (sentiment.score > 0.35) {
            signal = 'BUY';
            strength = 'STRONG';
            recommendation = 'Strong positive sentiment - consider buying';
        } else if (sentiment.score > 0.15) {
            signal = 'BUY';
            strength = 'MODERATE';
            recommendation = 'Positive sentiment - favorable for buying';
        } else if (sentiment.score < -0.35) {
            signal = 'SELL';
            strength = 'STRONG';
            recommendation = 'Strong negative sentiment - consider selling';
        } else if (sentiment.score < -0.15) {
            signal = 'SELL';
            strength = 'MODERATE';
            recommendation = 'Negative sentiment - caution advised';
        } else {
            signal = 'HOLD';
            strength = 'NEUTRAL';
            recommendation = 'Neutral sentiment - hold current position';
        }
        
        return {
            ticker,
            signal,
            strength,
            recommendation,
            sentiment: sentiment,
            recentArticles: newsData.articles.slice(0, 5),
            timestamp: new Date()
        };
        
    } catch (error) {
        logger.error(`Sentiment signal error for ${ticker}:`, error.message);
        throw error;
    }
}

// Legacy compatibility wrapper for old getNewsAnalysis function
async function getNewsAnalysis(ticker, companyName, lookbackDays = 7) {
    // Convert to Alpha Vantage format
    const newsData = await getNewsForTicker(ticker, { limit: 50 });
    
    // Transform to old format for backward compatibility
    return {
        ticker,
        companyName,
        articlesFound: newsData.itemsReturned,
        lookbackDays,
        sentiment: {
            score: Math.round((newsData.sentiment.score + 1) * 50), // Convert -1 to 1 range to 0-100
            label: newsData.sentiment.overall.toUpperCase().replace(' ', '_'),
            confidence: Math.min(100, newsData.itemsReturned * 2)
        },
        trends: {
            direction: newsData.sentiment.score > 0.15 ? 'IMPROVING' : newsData.sentiment.score < -0.15 ? 'DETERIORATING' : 'STABLE',
            momentum: Math.abs(newsData.sentiment.score) > 0.35 ? 'STRONG' : Math.abs(newsData.sentiment.score) > 0.15 ? 'MODERATE' : 'LOW',
            description: newsData.sentiment.overall
        },
        recentArticles: newsData.articles,
        fetchedAt: newsData.fetchedAt
    };
}

module.exports = {
    getNewsForTicker,
    getNewsByTopics,
    getLatestMarketNews,
    getSentimentSignal,
    getNewsAnalysis // Legacy compatibility
};
