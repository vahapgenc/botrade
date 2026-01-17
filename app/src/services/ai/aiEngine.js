const OpenAI = require('openai');
const logger = require('../../utils/logger');
const prisma = require('../../database/prisma');
const { analyzeTechnicals } = require('../technical/technicalAnalyzer');
const { getFundamentals } = require('../fundamental/fundamentalAnalyzer');
const { getNewsForTicker, getSentimentSignal } = require('../news/newsAnalyzer');
const { fetchFearGreed } = require('../sentiment/fearGreedFetcher');
const { fetchVIX } = require('../sentiment/vixFetcher');
const { getHistoricalData, extractPriceArrays } = require('../market/dataFetcher');
const { getNearMoneyOptions, getATMOption, calculateStrategyMetrics } = require('../options/optionsDataFetcher');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

/**
 * Make AI trading decision supporting both stocks and options
 * @param {string} ticker - Stock ticker symbol
 * @param {string} companyName - Company name
 * @param {string} tradingType - 'STOCK', 'OPTIONS', or 'BOTH' (default)
 * @param {object} options - Additional options
 */
async function makeAIDecision(ticker, companyName, tradingType = 'BOTH', options = {}) {
    try {
        logger.info(`Starting AI decision analysis for ${ticker} (${tradingType})...`);
        
        // Gather all data sources in parallel
        const [
            marketData,
            fearGreed,
            vix,
            fundamentals,
            news,
            newsSignal,
            optionsData
        ] = await Promise.all([
            getHistoricalData(ticker, 250),
            fetchFearGreed(),
            fetchVIX(),
            getFundamentals(ticker),
            getNewsForTicker(ticker, { limit: 20, lookbackDays: 7 }),
            getSentimentSignal(ticker, { limit: 20 }),
            tradingType !== 'STOCK' ? getNearMoneyOptions(ticker, 3).catch(err => {
                logger.warn(`Options data not available: ${err.message}`);
                return null;
            }) : null
        ]);
        
        // Extract price data and calculate technical indicators
        const priceData = extractPriceArrays(marketData);
        const technical = await analyzeTechnicals(priceData);
        
        const currentPrice = marketData[marketData.length - 1].close;
        
        // Build market sentiment composite
        const marketSentiment = {
            fearGreed: {
                value: fearGreed.value,
                emotion: fearGreed.emotion,
                interpretation: fearGreed.interpretation
            },
            vix: {
                value: vix.value,
                interpretation: vix.interpretation
            }
        };
        
        // Build comprehensive prompt
        const prompt = buildPrompt({
            ticker,
            companyName,
            tradingType,
            currentPrice,
            technical,
            fundamentals,
            news,
            newsSignal,
            marketSentiment,
            optionsData
        });
        
        logger.info(`Sending request to OpenAI (${MODEL})...`);
        
        // Call OpenAI GPT-4
        const startTime = Date.now();
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: getSystemPrompt()
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3, // Lower temperature for more consistent responses
            max_tokens: 2000,
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
        const decision = prepareDecision({
            ticker,
            companyName,
            aiResponse,
            technical,
            fundamentals,
            news,
            marketSentiment,
            optionsData,
            currentPrice,
            cost,
            completion
        });
        
        // Store in database
        await storeDecision(decision);
        
        return decision;
        
    } catch (error) {
        logger.error('AI decision engine error:', error);
        throw error;
    }
}

function getSystemPrompt() {
    return `You are an expert stock and options trading analyst with 20+ years of experience. 
You provide clear, actionable trading recommendations based on comprehensive data analysis.

Your expertise includes:
- Technical analysis (RSI, MACD, Bollinger Bands, trend analysis)
- Fundamental analysis (CAN SLIM scoring, financial ratios)
- Options strategies (calls, puts, spreads)
- Risk management and position sizing
- Market sentiment interpretation

Always provide:
1. Clear decision with confidence level
2. Specific entry/exit points
3. Risk/reward analysis
4. Key factors supporting the decision
5. Potential risks to watch

For options strategies, consider:
- Implied volatility levels
- Time decay (Theta)
- Delta for directional exposure
- Risk-defined vs unlimited risk strategies`;
}

function buildPrompt(data) {
    const { ticker, companyName, tradingType, currentPrice, technical, fundamentals, news, newsSignal, marketSentiment, optionsData } = data;
    
    let prompt = `
Analyze ${ticker} (${companyName}) and provide a trading recommendation.

TRADING TYPE: ${tradingType}

CURRENT PRICE: $${currentPrice.toFixed(2)}

═══════════════════════════════════════════════════════════════
TECHNICAL ANALYSIS
═══════════════════════════════════════════════════════════════

Trend: ${technical.trend?.trend || 'N/A'} (Strength: ${technical.trend?.trendStrength || 0}/100)

Moving Averages:
- SMA 20: $${technical.trend?.sma20?.toFixed(2) || 'N/A'}
- SMA 50: $${technical.trend?.sma50?.toFixed(2) || 'N/A'}
- EMA 12: $${technical.trend?.ema12?.toFixed(2) || 'N/A'}

MACD:
- Value: ${technical.macd?.value?.toFixed(4) || 'N/A'}
- Signal: ${technical.macd?.signal?.toFixed(4) || 'N/A'}
- Histogram: ${technical.macd?.histogram?.toFixed(4) || 'N/A'}
- Crossover: ${technical.macd?.crossover || 'NONE'}

RSI: ${technical.momentum?.rsi?.value?.toFixed(2) || 'N/A'} (${technical.momentum?.rsi?.interpretation || 'N/A'})

Bollinger Bands: ${technical.bollinger?.position || 'N/A'} (${technical.bollinger?.signal || 'N/A'})

Composite Score: ${technical.composite?.score || 0}/100 (${technical.composite?.interpretation || 'N/A'})

═══════════════════════════════════════════════════════════════
FUNDAMENTAL ANALYSIS (CAN SLIM)
═══════════════════════════════════════════════════════════════

Overall Score: ${fundamentals.canSlim?.score || 0}/100
Rating: ${fundamentals.canSlim?.rating || 'N/A'}

Grades: C=${fundamentals.canSlim?.grades?.C || 'N/A'}, A=${fundamentals.canSlim?.grades?.A || 'N/A'}, N=${fundamentals.canSlim?.grades?.N || 'N/A'}, S=${fundamentals.canSlim?.grades?.S || 'N/A'}, L=${fundamentals.canSlim?.grades?.L || 'N/A'}, I=${fundamentals.canSlim?.grades?.I || 'N/A'}, M=${fundamentals.canSlim?.grades?.M || 'N/A'}

P/E Ratio: ${fundamentals.valuation?.pe?.toFixed(2) || 'N/A'}
Market Cap: $${(fundamentals.valuation?.marketCap / 1000000000)?.toFixed(2) || 'N/A'}B

═══════════════════════════════════════════════════════════════
NEWS SENTIMENT (Last 7 Days)
═══════════════════════════════════════════════════════════════

Source: ${news.source}
Articles: ${news.itemsReturned}
Overall: ${news.sentiment?.overall || 'N/A'} (Score: ${news.sentiment?.score?.toFixed(4) || 'N/A'})
Distribution: ${news.sentiment?.bullish || 0} bullish, ${news.sentiment?.bearish || 0} bearish, ${news.sentiment?.neutral || 0} neutral

Trading Signal: ${newsSignal.signal} (${newsSignal.strength})

═══════════════════════════════════════════════════════════════
MARKET SENTIMENT
═══════════════════════════════════════════════════════════════

Fear & Greed Index: ${marketSentiment.fearGreed.value}/100 (${marketSentiment.fearGreed.emotion})
VIX: ${marketSentiment.vix.value?.toFixed(2) || 'N/A'} (${marketSentiment.vix.interpretation})
`;

    // Add options data if available
    if (optionsData && tradingType !== 'STOCK') {
        prompt += `
═══════════════════════════════════════════════════════════════
OPTIONS DATA
═══════════════════════════════════════════════════════════════

Underlying Price: $${optionsData.underlyingPrice.toFixed(2)}

Available Expiries (Near-term):
`;

        optionsData.nearMoneyOptions.forEach((expiry, idx) => {
            prompt += `\n${idx + 1}. ${new Date(expiry.expiration).toLocaleDateString()} (${expiry.daysToExpiry} days):\n`;
            
            // ATM Call
            const atmCall = expiry.calls[0];
            if (atmCall) {
                prompt += `   ATM Call (${atmCall.strike}): Last=$${atmCall.lastPrice}, Bid=$${atmCall.bid}, Ask=$${atmCall.ask}, IV=${(atmCall.impliedVolatility * 100).toFixed(1)}%, OI=${atmCall.openInterest}\n`;
                if (atmCall.delta) prompt += `   Greeks: Δ=${atmCall.delta.toFixed(3)}, Θ=${atmCall.theta?.toFixed(3) || 'N/A'}, Vega=${atmCall.vega?.toFixed(3) || 'N/A'}\n`;
            }
            
            // ATM Put
            const atmPut = expiry.puts[0];
            if (atmPut) {
                prompt += `   ATM Put (${atmPut.strike}): Last=$${atmPut.lastPrice}, Bid=$${atmPut.bid}, Ask=$${atmPut.ask}, IV=${(atmPut.impliedVolatility * 100).toFixed(1)}%, OI=${atmPut.openInterest}\n`;
                if (atmPut.delta) prompt += `   Greeks: Δ=${atmPut.delta.toFixed(3)}, Θ=${atmPut.theta?.toFixed(3) || 'N/A'}, Vega=${atmPut.vega?.toFixed(3) || 'N/A'}\n`;
            }
        });
    }

    prompt += `
═══════════════════════════════════════════════════════════════
REQUIRED OUTPUT
═══════════════════════════════════════════════════════════════

Based on this comprehensive analysis, provide recommendations in JSON format:

{
  "recommendations": [
    {
      "tradingType": "STOCK" | "OPTIONS",
      "decision": "BUY" | "SELL" | "HOLD",
      "confidence": <0-100>,
      "timeHorizon": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
      
      // For STOCK
      "stockTrade": {
        "quantity": <number>,
        "entryPrice": <number>,
        "targetPrice": <number>,
        "stopLoss": <number>
      },
      
      // For OPTIONS (if applicable)
      "optionsTrade": {
        "strategy": "LONG_CALL" | "LONG_PUT" | "COVERED_CALL" | "PROTECTIVE_PUT" | "BULL_CALL_SPREAD" | "BEAR_PUT_SPREAD",
        "legs": [
          {
            "action": "BUY" | "SELL",
            "type": "CALL" | "PUT" | "STOCK",
            "strike": <number>,
            "expiry": "YYYY-MM-DD",
            "premium": <number>,
            "contracts": <number>
          }
        ],
        "maxProfit": <number>,
        "maxLoss": <number>,
        "breakeven": <number>,
        "collateralRequired": <number>
      },
      
      "reasoning": "<detailed explanation>",
      "keyFactors": ["<factor1>", "<factor2>", "<factor3>"],
      "risks": ["<risk1>", "<risk2>", "<risk3>"],
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "probabilitySuccess": <0-100>
    }
  ],
  "comparison": "<Compare stock vs options strategy - which is better and why>",
  "finalRecommendation": "STOCK" | "OPTIONS"
}

IMPORTANT CONSIDERATIONS:
1. Weight technical analysis heavily for SHORT_TERM trades
2. Weight fundamental analysis heavily for LONG_TERM investments
3. For options, consider IV rank (high IV = sell premium, low IV = buy premium)
4. Consider Theta decay for short-dated options
5. Options strategies should have defined risk when possible
6. Compare stock vs options risk/reward ratio
`;

    return prompt;
}

function prepareDecision(data) {
    const { ticker, companyName, aiResponse, technical, fundamentals, news, marketSentiment, optionsData, currentPrice, cost, completion } = data;
    
    // Extract recommendations
    const recommendations = aiResponse.recommendations || [];
    const primaryRec = recommendations[0] || {};
    
    // Determine which type was recommended
    const finalType = aiResponse.finalRecommendation || primaryRec.tradingType || 'STOCK';
    
    const decision = {
        ticker,
        companyName,
        tradingType: finalType,
        decision: primaryRec.decision || 'HOLD',
        confidence: primaryRec.confidence || 50,
        timeHorizon: primaryRec.timeHorizon || 'MEDIUM_TERM',
        
        // Stock trade details
        quantity: primaryRec.stockTrade?.quantity || null,
        suggestedPrice: primaryRec.stockTrade?.entryPrice || currentPrice,
        targetPrice: primaryRec.stockTrade?.targetPrice || null,
        stopLoss: primaryRec.stockTrade?.stopLoss || null,
        
        // Options trade details
        optionsStrategy: primaryRec.optionsTrade?.strategy || null,
        optionsLegs: primaryRec.optionsTrade?.legs || null,
        maxProfit: primaryRec.optionsTrade?.maxProfit || null,
        maxLoss: primaryRec.optionsTrade?.maxLoss || null,
        breakeven: primaryRec.optionsTrade?.breakeven || null,
        collateralRequired: primaryRec.optionsTrade?.collateralRequired || null,
        
        // Analysis context
        marketContext: marketSentiment,
        assetAnalysis: {
            technical: technical.summary,
            fundamental: {
                score: fundamentals.canSlim?.score,
                rating: fundamentals.canSlim?.rating
            },
            news: {
                sentiment: news.sentiment?.overall,
                signal: news.sentiment?.score
            }
        },
        optionsData: optionsData ? {
            underlyingPrice: optionsData.underlyingPrice,
            expiriesAnalyzed: optionsData.nearMoneyOptions.length
        } : null,
        
        // Reasoning
        reasoning: primaryRec.reasoning || '',
        keyFactors: primaryRec.keyFactors || [],
        risks: primaryRec.risks || [],
        comparisonAnalysis: aiResponse.comparison || null,
        
        // Risk metrics
        riskLevel: primaryRec.riskLevel || 'MEDIUM',
        probabilitySuccess: primaryRec.probabilitySuccess || null,
        rewardRiskRatio: calculateRewardRisk(primaryRec),
        
        // Scores
        technicalScore: technical.composite?.score || 0,
        fundamentalScore: fundamentals.canSlim?.score || 0,
        newsScore: Math.round(((news.sentiment?.score || 0) + 1) * 50), // Convert -1 to 1 range to 0-100
        marketSentimentScore: Math.round(
            ((marketSentiment.fearGreed.value || 50) + 
             (marketSentiment.vix.value ? (100 - marketSentiment.vix.value * 2) : 50)) / 2
        ),
        
        currentPrice,
        
        // API tracking
        aiModel: MODEL,
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
        apiCostUsd: cost
    };
    
    return decision;
}

function calculateRewardRisk(recommendation) {
    if (!recommendation.stockTrade && !recommendation.optionsTrade) return null;
    
    if (recommendation.stockTrade) {
        const entry = recommendation.stockTrade.entryPrice;
        const target = recommendation.stockTrade.targetPrice;
        const stop = recommendation.stockTrade.stopLoss;
        
        if (!entry || !target || !stop) return null;
        
        const reward = Math.abs(target - entry);
        const risk = Math.abs(entry - stop);
        
        return risk > 0 ? reward / risk : null;
    }
    
    if (recommendation.optionsTrade) {
        const maxProfit = recommendation.optionsTrade.maxProfit;
        const maxLoss = recommendation.optionsTrade.maxLoss;
        
        if (!maxProfit || !maxLoss) return null;
        
        return maxLoss > 0 ? maxProfit / maxLoss : null;
    }
    
    return null;
}

async function storeDecision(decision) {
    try {
        await prisma.aIDecision.create({
            data: {
                ticker: decision.ticker,
                companyName: decision.companyName,
                tradingType: decision.tradingType,
                decision: decision.decision,
                confidence: decision.confidence,
                timeHorizon: decision.timeHorizon,
                quantity: decision.quantity,
                suggestedPrice: decision.suggestedPrice,
                targetPrice: decision.targetPrice,
                stopLoss: decision.stopLoss,
                optionsStrategy: decision.optionsStrategy,
                optionsLegs: decision.optionsLegs,
                maxProfit: decision.maxProfit,
                maxLoss: decision.maxLoss,
                breakeven: decision.breakeven,
                collateralRequired: decision.collateralRequired,
                marketContext: decision.marketContext,
                assetAnalysis: decision.assetAnalysis,
                optionsData: decision.optionsData,
                reasoning: decision.reasoning,
                primaryFactors: decision.keyFactors,
                riskFactors: decision.risks,
                comparisonAnalysis: decision.comparisonAnalysis,
                riskLevel: decision.riskLevel,
                probabilitySuccess: decision.probabilitySuccess,
                rewardRiskRatio: decision.rewardRiskRatio,
                technicalScore: decision.technicalScore,
                fundamentalScore: decision.fundamentalScore,
                newsScore: decision.newsScore,
                marketSentimentScore: decision.marketSentimentScore,
                currentPrice: decision.currentPrice,
                aiModel: decision.aiModel,
                promptTokens: decision.promptTokens,
                completionTokens: decision.completionTokens,
                totalTokens: decision.totalTokens,
                apiCostUsd: decision.apiCostUsd
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
        const [totalDecisions, totalCost, decisionCounts, tradingTypeCounts] = await Promise.all([
            prisma.aIDecision.count(),
            prisma.aIDecision.aggregate({
                _sum: { apiCostUsd: true }
            }),
            prisma.aIDecision.groupBy({
                by: ['decision'],
                _count: true
            }),
            prisma.aIDecision.groupBy({
                by: ['tradingType'],
                _count: true
            })
        ]);
        
        return {
            totalDecisions,
            totalCost: totalCost._sum.apiCostUsd || 0,
            decisionDistribution: decisionCounts.reduce((acc, item) => {
                acc[item.decision] = item._count;
                return acc;
            }, {}),
            tradingTypeDistribution: tradingTypeCounts.reduce((acc, item) => {
                acc[item.tradingType] = item._count;
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
