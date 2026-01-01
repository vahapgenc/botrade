# STEP 11: AI Decision Engine (OpenAI GPT-4)

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-10 completed
- ✅ Technical analysis working
- ✅ Fundamental analysis working
- ✅ News analysis working
- ✅ OpenAI API key configured in .env

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 12**

---

## 🎯 Objectives
1. Install OpenAI SDK
2. Create AI decision engine using GPT-4
3. Implement comprehensive prompt engineering
4. Integrate all analysis types (technical, fundamental, news, sentiment)
5. Generate AI-powered buy/sell/hold decisions
6. Store AI decisions in database
7. Track API costs

---

## ⏱️ Estimated Duration
**3-4 hours**

---

## 📝 Implementation Steps

### 11.1 Install OpenAI SDK
```bash
npm install openai
```

### 11.2 Add OpenAI API Key to .env
Update `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview
```

Get your key from: https://platform.openai.com/api-keys

### 11.3 Create AI Decision Engine
Create `src/services/ai/aiEngine.js`:

```javascript
const OpenAI = require('openai');
const logger = require('../../utils/logger');
const { prisma } = require('../../config/database');
const { analyzeTechnicals } = require('../technical/technicalAnalyzer');
const { getFundamentals } = require('../fundamental/fundamentalAnalyzer');
const { getNewsAnalysis } = require('../news/newsAnalyzer');
const { getMarketSentiment } = require('../sentiment/sentimentEngine');
const { getHistoricalData, extractPriceArrays } = require('../market/dataFetcher');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

async function makeAIDecision(ticker, companyName) {
    try {
        logger.info(`Starting AI decision analysis for ${ticker}...`);
        
        // Gather all data sources in parallel
        const [marketData, marketSentiment, fundamentals, news] = await Promise.all([
            getHistoricalData(ticker, 'daily', 250),
            getMarketSentiment(),
            getFundamentals(ticker),
            getNewsAnalysis(ticker, companyName, 7)
        ]);
        
        // Extract price data and calculate technical indicators
        const priceData = extractPriceArrays(marketData);
        const technical = await analyzeTechnicals(priceData);
        
        // Build comprehensive prompt
        const prompt = buildPrompt({
            ticker,
            companyName,
            technical,
            fundamentals,
            news,
            marketSentiment,
            currentPrice: marketData.data[marketData.data.length - 1].close
        });
        
        logger.info(`Sending request to OpenAI (${MODEL})...`);
        
        // Call OpenAI GPT-4
        const startTime = Date.now();
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert stock market analyst with 20+ years of experience in technical analysis, fundamental analysis, and market sentiment. You provide clear, actionable trading recommendations based on comprehensive data analysis.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3, // Lower temperature for more consistent, factual responses
            max_tokens: 1500,
            response_format: { type: 'json_object' }
        });
        
        const duration = Date.now() - startTime;
        logger.info(`OpenAI response received in ${duration}ms`);
        
        // Parse AI response
        const aiResponse = JSON.parse(completion.choices[0].message.content);
        
        // Calculate cost
        const cost = calculateCost(completion.usage);
        logger.info(`API cost: $${cost.toFixed(4)}`);
        
        // Prepare decision object
        const decision = {
            ticker,
            companyName,
            decision: aiResponse.decision, // BUY, SELL, HOLD
            confidence: aiResponse.confidence, // 0-100
            targetPrice: aiResponse.targetPrice || null,
            stopLoss: aiResponse.stopLoss || null,
            timeHorizon: aiResponse.timeHorizon || 'MEDIUM_TERM',
            reasoning: aiResponse.reasoning,
            keyFactors: aiResponse.keyFactors || [],
            risks: aiResponse.risks || [],
            technicalScore: technical.composite.score,
            fundamentalScore: fundamentals.canSlim.score,
            newsScore: news.sentiment.score,
            marketSentimentScore: marketSentiment.composite.score,
            currentPrice: marketData.data[marketData.data.length - 1].close,
            apiCost: cost,
            model: MODEL,
            tokensUsed: completion.usage.total_tokens,
            metadata: {
                technical: technical.summary,
                fundamental: fundamentals.canSlim.rating,
                news: news.sentiment.label,
                marketSentiment: marketSentiment.composite.interpretation
            }
        };
        
        // Store in database
        await storeDecision(decision);
        
        return decision;
        
    } catch (error) {
        logger.error('AI decision engine error:', error);
        throw error;
    }
}

function buildPrompt(data) {
    const { ticker, companyName, technical, fundamentals, news, marketSentiment, currentPrice } = data;
    
    return `
Analyze ${ticker} (${companyName}) and provide a trading recommendation.

CURRENT PRICE: $${currentPrice.toFixed(2)}

TECHNICAL ANALYSIS:
- Trend: ${technical.trend.trend} (Strength: ${technical.trend.trendStrength}/100)
- MACD Signal: ${technical.macd.signalType}
- RSI: ${technical.momentum.rsi.value} (${technical.momentum.rsi.interpretation})
- Stochastic: K=${technical.momentum.stochastic.k}, D=${technical.momentum.stochastic.d}
- Bollinger Bands: ${technical.bollinger.signal}
- Composite Technical Score: ${technical.composite.score}/100 (${technical.composite.signal})
- Key Factors: ${technical.composite.factors.join(', ')}

FUNDAMENTAL ANALYSIS (CAN SLIM):
- Overall Score: ${fundamentals.canSlim.score}/100
- Rating: ${fundamentals.canSlim.rating}
- Recommendation: ${fundamentals.canSlim.recommendation}
- Quarterly Earnings Growth: ${fundamentals.growth.quarterlyEarningsGrowth}%
- Annual Earnings Growth: ${fundamentals.growth.annualEarningsGrowth}%
- Revenue Growth: ${fundamentals.growth.revenueGrowth}%
- Grades: C=${fundamentals.canSlim.grades.C}, A=${fundamentals.canSlim.grades.A}, N=${fundamentals.canSlim.grades.N}
- P/E Ratio: ${fundamentals.valuation.pe?.toFixed(2) || 'N/A'}
- Net Margin: ${(fundamentals.profitability.netMargin * 100).toFixed(2)}%
- ROE: ${(fundamentals.profitability.roe * 100).toFixed(2)}%

NEWS SENTIMENT (Last 7 Days):
- Articles Analyzed: ${news.articlesFound}
- Overall Sentiment: ${news.sentiment.label} (${news.sentiment.score}/100)
- Confidence: ${news.sentiment.confidence}%
- Trend: ${news.trends.direction} (${news.trends.momentum})
- Distribution: ${news.sentiment.distribution.veryPositive} very positive, ${news.sentiment.distribution.positive} positive, ${news.sentiment.distribution.neutral} neutral, ${news.sentiment.distribution.negative} negative, ${news.sentiment.distribution.veryNegative} very negative

MARKET SENTIMENT:
- Fear & Greed Index: ${marketSentiment.fearGreed.value} (${marketSentiment.fearGreed.label})
- VIX Level: ${marketSentiment.vix.value} (${marketSentiment.vix.label})
- Composite Market Score: ${marketSentiment.composite.score}/100 (${marketSentiment.composite.interpretation})

Based on this comprehensive analysis, provide your recommendation in the following JSON format:
{
  "decision": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "targetPrice": <number or null>,
  "stopLoss": <number or null>,
  "timeHorizon": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
  "reasoning": "<detailed explanation of decision>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"]
}

Consider:
1. Weight technical analysis heavily for SHORT_TERM trades
2. Weight fundamental analysis heavily for LONG_TERM investments
3. News sentiment as a confirming/contrarian indicator
4. Market sentiment as overall risk gauge
5. Risk/reward ratio and probability of success
`;
}

async function storeDecision(decision) {
    try {
        await prisma.aIDecision.create({
            data: {
                ticker: decision.ticker,
                companyName: decision.companyName,
                decision: decision.decision,
                confidence: decision.confidence,
                targetPrice: decision.targetPrice,
                stopLoss: decision.stopLoss,
                timeHorizon: decision.timeHorizon,
                reasoning: decision.reasoning,
                keyFactors: decision.keyFactors,
                risks: decision.risks,
                technicalScore: decision.technicalScore,
                fundamentalScore: decision.fundamentalScore,
                newsScore: decision.newsScore,
                marketSentimentScore: decision.marketSentimentScore,
                currentPrice: decision.currentPrice,
                apiCost: decision.apiCost,
                model: decision.model,
                tokensUsed: decision.tokensUsed,
                metadata: decision.metadata
            }
        });
        
        logger.info(`AI decision stored in database for ${decision.ticker}`);
        
    } catch (error) {
        logger.error('Error storing AI decision:', error);
        // Don't throw - decision was successful, storage failure is not critical
    }
}

function calculateCost(usage) {
    // GPT-4 Turbo pricing (as of Dec 2023)
    const INPUT_COST_PER_1K = 0.01;  // $0.01 per 1K input tokens
    const OUTPUT_COST_PER_1K = 0.03; // $0.03 per 1K output tokens
    
    const inputCost = (usage.prompt_tokens / 1000) * INPUT_COST_PER_1K;
    const outputCost = (usage.completion_tokens / 1000) * OUTPUT_COST_PER_1K;
    
    return inputCost + outputCost;
}

async function getDecisionHistory(ticker = null, limit = 10) {
    try {
        const where = ticker ? { ticker } : {};
        
        const decisions = await prisma.aIDecision.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        
        return decisions;
        
    } catch (error) {
        logger.error('Error fetching decision history:', error);
        throw error;
    }
}

async function getDecisionStats() {
    try {
        const [totalDecisions, totalCost, decisionCounts] = await Promise.all([
            prisma.aIDecision.count(),
            prisma.aIDecision.aggregate({
                _sum: { apiCost: true }
            }),
            prisma.aIDecision.groupBy({
                by: ['decision'],
                _count: true
            })
        ]);
        
        return {
            totalDecisions,
            totalCost: totalCost._sum.apiCost || 0,
            decisionDistribution: decisionCounts.reduce((acc, item) => {
                acc[item.decision] = item._count;
                return acc;
            }, {})
        };
        
    } catch (error) {
        logger.error('Error fetching decision stats:', error);
        throw error;
    }
}

module.exports = {
    makeAIDecision,
    getDecisionHistory,
    getDecisionStats
};
```

### 11.4 Create AI Decision Route
Create `src/api/routes/ai.js`:

```javascript
const express = require('express');
const router = express.Router();
const { makeAIDecision, getDecisionHistory, getDecisionStats } = require('../../services/ai/aiEngine');
const logger = require('../../utils/logger');

// Get AI decision for a ticker
router.post('/decide', async (req, res) => {
    try {
        const { ticker, companyName } = req.body;
        
        if (!ticker || !companyName) {
            return res.status(400).json({ 
                error: 'ticker and companyName are required',
                example: { ticker: 'AAPL', companyName: 'Apple Inc.' }
            });
        }
        
        logger.info(`AI decision request for ${ticker}`);
        
        const decision = await makeAIDecision(ticker.toUpperCase(), companyName);
        
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

// Get decision history
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

// Get decision statistics
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
```

### 11.5 Update Server with AI Route
Update `src/api/server.js`:

```javascript
// Add this line with other route imports
const aiRoutes = require('./routes/ai');

// Add this line with other route registrations
app.use('/api/ai', aiRoutes);
```

### 11.6 Create Test File
Create `tests/test-ai-decision.js`:

```javascript
require('dotenv').config();
const { makeAIDecision, getDecisionStats } = require('../src/services/ai/aiEngine');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing AI Decision Engine...\n');
    console.log('⚠️  This will consume OpenAI API credits!\n');
    
    try {
        await initCache();
        
        console.log('Test: Making AI decision for AAPL...');
        console.log('(This may take 30-60 seconds...)\n');
        
        const decision = await makeAIDecision('AAPL', 'Apple Inc.');
        
        console.log('🤖 AI DECISION RESULTS\n');
        console.log('='.repeat(60));
        
        console.log(`\nTicker: ${decision.ticker} (${decision.companyName})`);
        console.log(`Current Price: $${decision.currentPrice.toFixed(2)}`);
        
        console.log(`\n🎯 DECISION: ${decision.decision}`);
        console.log(`Confidence: ${decision.confidence}%`);
        console.log(`Time Horizon: ${decision.timeHorizon}`);
        
        if (decision.targetPrice) {
            console.log(`Target Price: $${decision.targetPrice.toFixed(2)}`);
            const upside = ((decision.targetPrice - decision.currentPrice) / decision.currentPrice * 100);
            console.log(`Upside Potential: ${upside > 0 ? '+' : ''}${upside.toFixed(2)}%`);
        }
        
        if (decision.stopLoss) {
            console.log(`Stop Loss: $${decision.stopLoss.toFixed(2)}`);
            const downside = ((decision.stopLoss - decision.currentPrice) / decision.currentPrice * 100);
            console.log(`Downside Risk: ${downside.toFixed(2)}%`);
        }
        
        console.log('\n📝 REASONING:');
        console.log(decision.reasoning);
        
        console.log('\n✅ KEY FACTORS:');
        decision.keyFactors.forEach((factor, idx) => {
            console.log(`${idx + 1}. ${factor}`);
        });
        
        console.log('\n⚠️  RISKS:');
        decision.risks.forEach((risk, idx) => {
            console.log(`${idx + 1}. ${risk}`);
        });
        
        console.log('\n📊 ANALYSIS SCORES:');
        console.log(`Technical: ${decision.technicalScore}/100`);
        console.log(`Fundamental: ${decision.fundamentalScore}/100`);
        console.log(`News Sentiment: ${decision.newsScore}/100`);
        console.log(`Market Sentiment: ${decision.marketSentimentScore}/100`);
        
        console.log('\n💰 API USAGE:');
        console.log(`Cost: $${decision.apiCost.toFixed(4)}`);
        console.log(`Tokens: ${decision.tokensUsed}`);
        console.log(`Model: ${decision.model}`);
        
        console.log('\n' + '='.repeat(60));
        
        // Get stats
        console.log('\n📈 Decision Statistics:');
        const stats = await getDecisionStats();
        console.log(`Total Decisions: ${stats.totalDecisions}`);
        console.log(`Total Cost: $${stats.totalCost.toFixed(2)}`);
        console.log('Distribution:', stats.decisionDistribution);
        
        console.log('\n✅ AI decision test passed!\n');
        
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

Before proceeding to STEP 12, verify ALL items:

- [ ] `openai` package installed
- [ ] OPENAI_API_KEY added to .env
- [ ] `src/services/ai/aiEngine.js` created
- [ ] `src/api/routes/ai.js` created
- [ ] Server updated with AI route
- [ ] `tests/test-ai-decision.js` created
- [ ] Test passes: `node tests/test-ai-decision.js`
- [ ] AI decisions generating correctly
- [ ] Decisions stored in database
- [ ] Cost tracking working
- [ ] All data sources integrated (technical, fundamental, news, sentiment)

---

## 🧪 Testing

```bash
# Test 1: Run AI decision test (USES API CREDITS!)
node tests/test-ai-decision.js
# Expected: Complete AI analysis with BUY/SELL/HOLD decision

# Test 2: Test API endpoint
curl -X POST http://localhost:3000/api/ai/decide \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","companyName":"Apple Inc."}'
# Expected: AI decision with confidence and reasoning

# Test 3: Get decision history
curl http://localhost:3000/api/ai/history?ticker=AAPL&limit=5
# Expected: Last 5 AI decisions for AAPL

# Test 4: Get decision statistics
curl http://localhost:3000/api/ai/stats
# Expected: Total decisions, cost, distribution
```

---

## 🚨 Common Issues & Solutions

### Issue 1: OpenAI API rate limit exceeded
**Solution:**
- Free tier: 3 requests/minute
- Paid tier: 10,000 requests/minute
- Add rate limiting to your API
- Implement exponential backoff

### Issue 2: High API costs
**Solution:**
- Use GPT-4 Turbo ($0.01/1K input tokens) instead of GPT-4 ($0.03/1K)
- Reduce max_tokens to 1000-1500
- Cache decisions for same ticker/day
- Use GPT-3.5-Turbo for testing ($0.0015/1K input)

### Issue 3: Inconsistent decisions
**Solution:**
- Lower temperature (0.2-0.4) for more deterministic output
- Add more specific instructions to system prompt
- Require JSON format for structured responses

### Issue 4: Token limit exceeded
**Solution:**
- Reduce historical data lookback
- Summarize news articles instead of full text
- Use GPT-4 Turbo (128K token context)

---

## 💰 Cost Analysis

### Typical Decision Cost
```
Input tokens: ~2000 (prompt with all analysis data)
Output tokens: ~500 (structured decision response)
Total cost: ~$0.035 per decision with GPT-4 Turbo

Monthly estimate (50 decisions/day):
50 × 30 × $0.035 = $52.50/month
```

### Cost Optimization
- Use GPT-3.5-Turbo for testing: ~$0.005 per decision
- Cache decisions: Save 90% on repeated queries
- Batch processing: Analyze multiple tickers in one call

---

## 🎯 Prompt Engineering Tips

1. **Be Specific**: Define exact output format (JSON schema)
2. **Provide Context**: Include all relevant data (technical, fundamental, news)
3. **Set Constraints**: Specify confidence ranges, risk levels
4. **Use Examples**: Show desired output format in prompt
5. **Lower Temperature**: 0.2-0.4 for consistent, factual responses
6. **System Role**: Define expert persona for better quality

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step12_ibkr_integration.md`

---

**Last Updated:** December 31, 2025
