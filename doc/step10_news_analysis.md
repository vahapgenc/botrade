# STEP 10: News Analysis & Sentiment

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-9 completed
- ✅ Fundamental analysis operational
- ✅ NewsAPI key configured in .env

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 11**

---

## 🎯 Objectives
1. Integrate NewsAPI for financial news
2. Implement keyword-based sentiment analysis
3. Calculate news sentiment scores
4. Analyze news volume and frequency
5. Create news aggregation service
6. Build news analysis API endpoint

---

## ⏱️ Estimated Duration
**2-3 hours**

---

## 📝 Implementation Steps

### 10.1 Install NewsAPI Client
```bash
npm install newsapi
```

### 10.2 Add NewsAPI Key to .env
Update `.env`:
```
NEWS_API_KEY=your_newsapi_key_here
```

Get your free key from: https://newsapi.org/

### 10.3 Create News Analyzer Service
Create `src/services/news/newsAnalyzer.js`:

```javascript
const NewsAPI = require('newsapi');
const logger = require('../../utils/logger');
const { getCache, setCache } = require('../cache/cacheManager');

const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

async function getNewsAnalysis(ticker, companyName, lookbackDays = 7) {
    try {
        const cacheKey = `news:${ticker}:${lookbackDays}`;
        
        // Check cache (2 hours)
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.info(`Cache HIT for news: ${ticker}`);
            return cached;
        }
        
        logger.info(`Fetching news for ${ticker} (${companyName})...`);
        
        // Calculate date range
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - lookbackDays);
        
        // Fetch news from NewsAPI
        const response = await newsapi.v2.everything({
            q: `${ticker} OR "${companyName}"`,
            language: 'en',
            sortBy: 'publishedAt',
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
            pageSize: 50
        });
        
        if (!response.articles || response.articles.length === 0) {
            logger.warn(`No news articles found for ${ticker}`);
            return {
                ticker,
                articlesFound: 0,
                sentiment: {
                    score: 50,
                    label: 'NEUTRAL',
                    confidence: 0
                },
                articles: [],
                fetchedAt: new Date()
            };
        }
        
        logger.info(`Found ${response.articles.length} articles for ${ticker}`);
        
        // Analyze sentiment for each article
        const analyzedArticles = response.articles.map(article => {
            const sentiment = analyzeSentiment(article.title, article.description);
            return {
                title: article.title,
                description: article.description,
                source: article.source.name,
                url: article.url,
                publishedAt: article.publishedAt,
                sentiment: sentiment.label,
                sentimentScore: sentiment.score
            };
        });
        
        // Calculate overall sentiment
        const overallSentiment = calculateOverallSentiment(analyzedArticles);
        
        // Analyze trends
        const trends = analyzeTrends(analyzedArticles);
        
        const result = {
            ticker,
            companyName,
            articlesFound: analyzedArticles.length,
            lookbackDays,
            sentiment: overallSentiment,
            trends,
            recentArticles: analyzedArticles.slice(0, 10),
            fetchedAt: new Date()
        };
        
        // Cache for 2 hours (7200 seconds)
        await setCache(cacheKey, result, 7200);
        logger.info(`News analysis cached for ${ticker}`);
        
        return result;
        
    } catch (error) {
        if (error.message && error.message.includes('rate')) {
            logger.error('NewsAPI rate limit exceeded');
            throw new Error('News API rate limit exceeded - try again later');
        }
        
        logger.error(`News analysis error for ${ticker}:`, error.message);
        throw error;
    }
}

function analyzeSentiment(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    
    // Positive keywords
    const positiveKeywords = [
        'surge', 'soar', 'rally', 'jump', 'gain', 'rise', 'climbs', 'up',
        'profit', 'revenue', 'earnings', 'beat', 'exceed', 'outperform',
        'growth', 'expand', 'strong', 'bullish', 'positive', 'upgrade',
        'innovation', 'breakthrough', 'success', 'win', 'partnership',
        'acquisition', 'buyback', 'dividend', 'record', 'high', 'boost'
    ];
    
    // Negative keywords
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
    
    // Count positive matches
    positiveKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            positiveCount++;
            score += 2;
        }
    });
    
    // Count negative matches
    negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            negativeCount++;
            score -= 2;
        }
    });
    
    // Cap score between 0-100
    score = Math.max(0, Math.min(100, score));
    
    // Determine label
    let label;
    if (score >= 70) {
        label = 'VERY_POSITIVE';
    } else if (score >= 55) {
        label = 'POSITIVE';
    } else if (score >= 45) {
        label = 'NEUTRAL';
    } else if (score >= 30) {
        label = 'NEGATIVE';
    } else {
        label = 'VERY_NEGATIVE';
    }
    
    return {
        score: Math.round(score),
        label,
        positiveMatches: positiveCount,
        negativeMatches: negativeCount
    };
}

function calculateOverallSentiment(articles) {
    if (articles.length === 0) {
        return {
            score: 50,
            label: 'NEUTRAL',
            confidence: 0,
            distribution: {
                veryPositive: 0,
                positive: 0,
                neutral: 0,
                negative: 0,
                veryNegative: 0
            }
        };
    }
    
    // Calculate weighted average (more recent = higher weight)
    let totalScore = 0;
    let totalWeight = 0;
    
    articles.forEach((article, index) => {
        // Weight decreases with age (newest = 1.0, oldest = 0.5)
        const weight = 1.0 - (index / articles.length) * 0.5;
        totalScore += article.sentimentScore * weight;
        totalWeight += weight;
    });
    
    const averageScore = totalScore / totalWeight;
    
    // Count sentiment distribution
    const distribution = {
        veryPositive: articles.filter(a => a.sentiment === 'VERY_POSITIVE').length,
        positive: articles.filter(a => a.sentiment === 'POSITIVE').length,
        neutral: articles.filter(a => a.sentiment === 'NEUTRAL').length,
        negative: articles.filter(a => a.sentiment === 'NEGATIVE').length,
        veryNegative: articles.filter(a => a.sentiment === 'VERY_NEGATIVE').length
    };
    
    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(100, (articles.length / 20) * 100); // Max confidence at 20 articles
    
    // Determine overall label
    let label;
    if (averageScore >= 70) {
        label = 'VERY_POSITIVE';
    } else if (averageScore >= 55) {
        label = 'POSITIVE';
    } else if (averageScore >= 45) {
        label = 'NEUTRAL';
    } else if (averageScore >= 30) {
        label = 'NEGATIVE';
    } else {
        label = 'VERY_NEGATIVE';
    }
    
    return {
        score: Math.round(averageScore),
        label,
        confidence: Math.round(confidence),
        distribution
    };
}

function analyzeTrends(articles) {
    if (articles.length < 3) {
        return {
            direction: 'UNKNOWN',
            momentum: 'LOW',
            description: 'Insufficient data for trend analysis'
        };
    }
    
    // Split into recent vs older articles
    const midPoint = Math.floor(articles.length / 2);
    const recentArticles = articles.slice(0, midPoint);
    const olderArticles = articles.slice(midPoint);
    
    const recentAvg = recentArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / recentArticles.length;
    const olderAvg = olderArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / olderArticles.length;
    
    const change = recentAvg - olderAvg;
    
    // Determine trend direction
    let direction, momentum, description;
    
    if (change > 10) {
        direction = 'IMPROVING';
        momentum = 'STRONG';
        description = 'Sentiment has improved significantly in recent news';
    } else if (change > 5) {
        direction = 'IMPROVING';
        momentum = 'MODERATE';
        description = 'Sentiment is gradually improving';
    } else if (change < -10) {
        direction = 'DETERIORATING';
        momentum = 'STRONG';
        description = 'Sentiment has declined significantly in recent news';
    } else if (change < -5) {
        direction = 'DETERIORATING';
        momentum = 'MODERATE';
        description = 'Sentiment is gradually declining';
    } else {
        direction = 'STABLE';
        momentum = 'LOW';
        description = 'Sentiment remains relatively stable';
    }
    
    return {
        direction,
        momentum,
        change: parseFloat(change.toFixed(2)),
        recentAverage: Math.round(recentAvg),
        olderAverage: Math.round(olderAvg),
        description
    };
}

module.exports = {
    getNewsAnalysis
};
```

### 10.4 Create News Analysis Route
Create `src/api/routes/news.js`:

```javascript
const express = require('express');
const router = express.Router();
const { getNewsAnalysis } = require('../../services/news/newsAnalyzer');
const logger = require('../../utils/logger');

router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { companyName, lookbackDays = 7 } = req.query;
        
        if (!companyName) {
            return res.status(400).json({ 
                error: 'companyName query parameter required',
                example: '/api/news/AAPL?companyName=Apple'
            });
        }
        
        logger.info(`News analysis request for ${ticker}`);
        
        const analysis = await getNewsAnalysis(
            ticker, 
            companyName, 
            parseInt(lookbackDays)
        );
        
        res.json(analysis);
        
    } catch (error) {
        logger.error('News analysis error:', error);
        
        if (error.message.includes('rate limit')) {
            res.status(429).json({ 
                error: 'Rate limit exceeded',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
```

### 10.5 Update Server with News Route
Update `src/api/server.js`:

```javascript
// Add this line with other route imports
const newsRoutes = require('./routes/news');

// Add this line with other route registrations
app.use('/api/news', newsRoutes);
```

### 10.6 Create Test File
Create `tests/test-news.js`:

```javascript
require('dotenv').config();
const { getNewsAnalysis } = require('../src/services/news/newsAnalyzer');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing News Analysis...\n');
    
    try {
        await initCache();
        
        console.log('Test: Analyzing news for AAPL...');
        const analysis = await getNewsAnalysis('AAPL', 'Apple', 7);
        
        console.log('\n📰 News Analysis Results:');
        console.log(`Articles Found: ${analysis.articlesFound}`);
        console.log(`Lookback Period: ${analysis.lookbackDays} days`);
        
        console.log('\n📊 Overall Sentiment:');
        console.log(`Score: ${analysis.sentiment.score}/100`);
        console.log(`Label: ${analysis.sentiment.label}`);
        console.log(`Confidence: ${analysis.sentiment.confidence}%`);
        
        console.log('\n📈 Sentiment Distribution:');
        console.log(`Very Positive: ${analysis.sentiment.distribution.veryPositive}`);
        console.log(`Positive: ${analysis.sentiment.distribution.positive}`);
        console.log(`Neutral: ${analysis.sentiment.distribution.neutral}`);
        console.log(`Negative: ${analysis.sentiment.distribution.negative}`);
        console.log(`Very Negative: ${analysis.sentiment.distribution.veryNegative}`);
        
        console.log('\n📉 Sentiment Trend:');
        console.log(`Direction: ${analysis.trends.direction}`);
        console.log(`Momentum: ${analysis.trends.momentum}`);
        console.log(`Description: ${analysis.trends.description}`);
        
        if (analysis.recentArticles.length > 0) {
            console.log('\n📝 Recent Headlines (Top 5):');
            analysis.recentArticles.slice(0, 5).forEach((article, idx) => {
                console.log(`\n${idx + 1}. ${article.title}`);
                console.log(`   Sentiment: ${article.sentiment} (${article.sentimentScore})`);
                console.log(`   Source: ${article.source}`);
                console.log(`   Published: ${new Date(article.publishedAt).toLocaleString()}`);
            });
        }
        
        console.log('\n✅ News analysis test passed!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

runTests();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 11, verify ALL items:

- [ ] `newsapi` package installed
- [ ] NEWS_API_KEY added to .env
- [ ] `src/services/news/newsAnalyzer.js` created
- [ ] `src/api/routes/news.js` created
- [ ] Server updated with news route
- [ ] `tests/test-news.js` created
- [ ] Test passes: `node tests/test-news.js`
- [ ] News fetching working
- [ ] Sentiment analysis calculating correctly
- [ ] Trend analysis working
- [ ] Cache working for news data

---

## 🧪 Testing

```bash
# Test 1: Run news analysis test
node tests/test-news.js
# Expected: News articles with sentiment scores

# Test 2: Test API endpoint
curl "http://localhost:3000/api/news/AAPL?companyName=Apple&lookbackDays=7"
# Expected: News analysis with sentiment

# Test 3: Test with different companies
curl "http://localhost:3000/api/news/MSFT?companyName=Microsoft&lookbackDays=3"
# Expected: Microsoft news analysis
```

---

## 🚨 Common Issues & Solutions

### Issue 1: NewsAPI rate limit (100 requests/day free tier)
**Solution:**
- Increase cache TTL to 4-6 hours
- Upgrade to paid plan ($450/month for 250k requests)

### Issue 2: No articles found
**Solution:**
- Check company name spelling
- Increase lookbackDays parameter
- Verify ticker is well-known

### Issue 3: Sentiment seems inaccurate
**Solution:**
- Fine-tune keyword lists
- Consider upgrading to ML-based sentiment (Step 11)
- Add industry-specific keywords

---

## 📊 Sentiment Score Reference

### Score Ranges
- **70-100**: VERY_POSITIVE (Strong bullish news)
- **55-69**: POSITIVE (Moderately bullish)
- **45-54**: NEUTRAL (No clear direction)
- **30-44**: NEGATIVE (Moderately bearish)
- **0-29**: VERY_NEGATIVE (Strong bearish news)

### Confidence Levels
- **80-100%**: High confidence (20+ articles)
- **50-79%**: Medium confidence (10-19 articles)
- **0-49%**: Low confidence (<10 articles)

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step11_ai_decision_engine.md`

---

**Last Updated:** December 31, 2025
