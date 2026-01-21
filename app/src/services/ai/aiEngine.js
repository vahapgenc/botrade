const OpenAI = require('openai');
const logger = require('../../utils/logger');
const { prisma } = require('../../database/prisma');
const { analyzeTechnicals } = require('../technical/technicalAnalyzer');
const { getFundamentals } = require('../fundamental/fundamentalAnalyzer');
const { getNewsForTicker, getSentimentSignal } = require('../news/newsAnalyzer');
const { fetchFearGreed } = require('../sentiment/fearGreedFetcher');
const { fetchVIX } = require('../sentiment/vixFetcher');
const { getHistoricalData, extractPriceArrays } = require('../market/dataFetcher');
const { getNearMoneyOptions, getOptionsForStrategyAnalysis, getATMOption, calculateStrategyMetrics } = require('../options/optionsDataFetcher');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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
            tradingType !== 'STOCK' ? getOptionsForStrategyAnalysis(ticker).catch(err => {
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
        
        // Log the full prompt/input sent to the AI model
        logger.info(`---------- AI INPUT PROMPT FOR ${ticker} ----------`);
        logger.info(prompt);
        logger.info(`---------------------------------------------------`);

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
    return `You are a professional trading analyst providing data-driven investment analysis. Your role is to analyze market data objectively and present balanced recommendations.

IMPORTANT PRINCIPLES:
- Be honest about uncertainty - markets are inherently unpredictable
- No recommendation is guaranteed - always acknowledge risks
- Base decisions on DATA PROVIDED, not speculation
- If data is insufficient or conflicting, recommend HOLD or MORE RESEARCH
- Never promise returns or guarantee outcomes
- Consider both upside potential AND downside risks equally

YOUR ANALYTICAL FRAMEWORK:

Technical Analysis:
- Trend direction, momentum indicators (RSI, MACD)
- Support/resistance levels, moving averages
- Volume patterns and price action

Fundamental Analysis:
- Company financial health (CAN SLIM methodology)
- Valuation metrics (P/E, EPS growth, margins)
- Competitive position and growth prospects

Risk Assessment:
- Market sentiment and broader economic conditions
- Stock-specific risks and sector trends
- Volatility and liquidity considerations

Options Evaluation (when applicable):
- Implied volatility vs historical volatility
- Time decay (Theta) impact on position
- Greeks analysis (Delta, Gamma, Vega)
- Risk-defined strategies preferred over unlimited risk

OUTPUT REQUIREMENTS:
1. Honest confidence level (be conservative - most should be 60-80%)
2. Clear reasoning based on the data provided
3. Specific entry/exit points with stop-loss levels
4. List of key supporting factors AND potential risks
5. Acknowledge what you DON'T know or can't predict

CRITICAL: You MUST respond with valid JSON only. No additional text before or after the JSON.
The JSON structure is MANDATORY and must match exactly the format specified in the user prompt.

Remember: You are providing ANALYSIS and SUGGESTIONS, not financial advice. The trader makes the final decision and bears all responsibility for their actions.`;
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
OPTIONS DATA (3, 6, 9 MONTH TIMEFRAMES)
═══════════════════════════════════════════════════════════════

Underlying Price: $${optionsData.underlyingPrice.toFixed(2)}

You have options data for THREE timeframes. Analyze each and recommend the BEST strategy:
`;

        optionsData.strategies.forEach((strategy, idx) => {
            prompt += `\n━━━ ${strategy.targetMonths}-MONTH OPTIONS ━━━\nExpiration: ${new Date(strategy.expiration).toLocaleDateString()} (${strategy.daysToExpiry} days)\n\n`;
            
            // ATM Call
            const atmCall = strategy.atm.call;
            if (atmCall) {
                prompt += `ATM CALL ($${atmCall.strike}):\n`;
                prompt += `  Premium: $${atmCall.lastPrice?.toFixed(2) || 'N/A'} (Bid: $${atmCall.bid?.toFixed(2) || 'N/A'}, Ask: $${atmCall.ask?.toFixed(2) || 'N/A'})\n`;
                prompt += `  IV: ${(atmCall.impliedVolatility * 100).toFixed(1)}% | Volume: ${atmCall.volume || 0} | OI: ${atmCall.openInterest || 0}\n`;
                if (atmCall.delta) {
                    prompt += `  Greeks: Δ=${atmCall.delta.toFixed(3)}, Θ=${atmCall.theta?.toFixed(3) || 'N/A'}, Γ=${atmCall.gamma?.toFixed(4) || 'N/A'}, Vega=${atmCall.vega?.toFixed(3) || 'N/A'}\n`;
                }
            }
            
            // ATM Put
            const atmPut = strategy.atm.put;
            if (atmPut) {
                prompt += `\nATM PUT ($${atmPut.strike}):\n`;
                prompt += `  Premium: $${atmPut.lastPrice?.toFixed(2) || 'N/A'} (Bid: $${atmPut.bid?.toFixed(2) || 'N/A'}, Ask: $${atmPut.ask?.toFixed(2) || 'N/A'})\n`;
                prompt += `  IV: ${(atmPut.impliedVolatility * 100).toFixed(1)}% | Volume: ${atmPut.volume || 0} | OI: ${atmPut.openInterest || 0}\n`;
                if (atmPut.delta) {
                    prompt += `  Greeks: Δ=${atmPut.delta.toFixed(3)}, Θ=${atmPut.theta?.toFixed(3) || 'N/A'}, Γ=${atmPut.gamma?.toFixed(4) || 'N/A'}, Vega=${atmPut.vega?.toFixed(3) || 'N/A'}\n`;
                }
            }
            
            // OTM options for spreads
            if (strategy.otm.calls.length > 0) {
                const otmCall = strategy.otm.calls[0];
                prompt += `\nOTM CALL for Spreads ($${otmCall.strike}): Premium=$${otmCall.lastPrice?.toFixed(2) || 'N/A'}, IV=${(otmCall.impliedVolatility * 100).toFixed(1)}%\n`;
            }
            if (strategy.otm.puts.length > 0) {
                const otmPut = strategy.otm.puts[0];
                prompt += `OTM PUT for Spreads ($${otmPut.strike}): Premium=$${otmPut.lastPrice?.toFixed(2) || 'N/A'}, IV=${(otmPut.impliedVolatility * 100).toFixed(1)}%\n`;
            }
        });
    }

    prompt += `
═══════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════

Please analyze ${ticker} (${companyName}) objectively and provide an HONEST trading recommendation.

ANALYSIS GUIDELINES:
1. Synthesize ALL data above (technical, fundamental, sentiment, market conditions)
2. Identify BOTH bullish AND bearish signals - be balanced
3. If signals are mixed or data is insufficient, don't force a BUY/SELL - recommend HOLD
4. Be realistic with confidence levels:
   - 90-100%: Extremely rare, only with overwhelming evidence
   - 70-89%: Strong conviction with clear data support
   - 50-69%: Moderate confidence, some uncertainty
   - Below 50%: Weak signals, recommend HOLD or wait
5. For stock trades: Consider realistic position sizing (not too aggressive)
6. For OPTIONS: You have 3, 6, and 9-month data. COMPARE ALL THREE TIMEFRAMES:
   - Analyze theta decay impact for each timeframe
   - Compare premium costs vs time value
   - Consider IV levels across different expirations
   - Recommend the BEST timeframe and strategy with clear reasoning
   - Prefer defined-risk strategies (spreads over naked options)
7. Always provide STOP LOSS levels - risk management is critical

RISK ACKNOWLEDGMENT:
- Clearly state what could go WRONG with this trade
- Mention any data gaps or uncertainty in the analysis
- Note external factors that could invalidate the thesis

═══════════════════════════════════════════════════════════════
REQUIRED OUTPUT FORMAT (STRICT)
═══════════════════════════════════════════════════════════════

⚠️ CRITICAL: Your response MUST be ONLY valid JSON. No text before or after.
⚠️ MANDATORY: All fields below are REQUIRED. Use null if data is unavailable.
⚠️ STRUCTURE: Follow this exact structure - do not add or remove fields.

Provide your analysis in this EXACT JSON format:

{
  "recommendations": [
    {
      "tradingType": "STOCK" | "OPTIONS",
      "decision": "BUY" | "SELL" | "HOLD",
      "confidence": <0-100>,
      "timeHorizon": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
      
      // For STOCK recommendations
      "stockTrade": {
        "quantity": <number>,
        "entryPrice": <number>,
        "targetPrice": <number>,
        "stopLoss": <number>
      },
      
      // For OPTIONS recommendations - MUST include comparison of 3, 6, 9 month options
      "optionsComparison": "<STRING: 2-3 sentences comparing 3-month vs 6-month vs 9-month options. Discuss theta decay, premium costs, and why you selected your recommended timeframe.>",
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
      
      "reasoning": "<STRING: 2-4 sentences explaining WHY this trade makes sense based on the data provided. Reference specific indicators.>",
      "keyFactors": [
        "<STRING: Most important bullish/supportive factor>",
        "<STRING: Second key factor>",
        "<STRING: Third key factor>"
      ],
      "risks": [
        "<STRING: Primary risk that could invalidate this trade>",
        "<STRING: Secondary risk or concern>",
        "<STRING: Third risk factor or uncertainty>"
      ],
      "riskLevel": "<STRING: Must be exactly 'LOW', 'MEDIUM', or 'HIGH'>",
      "probabilitySuccess": <NUMBER: Integer 0-100, realistic estimate>
    }
  ],
  "comparison": "<If both stock and options analyzed: Compare their risk/reward profiles. Which is better for this specific situation and why? Be honest about tradeoffs.>",
  "finalRecommendation": "STOCK" | "OPTIONS" | "NEITHER"
}

EXAMPLE RESPONSE (follow this structure exactly):
{
  "recommendations": [{
    "tradingType": "STOCK",
    "decision": "BUY",
    "confidence": 72,
    "timeHorizon": "MEDIUM_TERM",
    "stockTrade": {
      "quantity": 25,
      "entryPrice": 230.45,
      "targetPrice": 250.00,
      "stopLoss": 220.00
    },
    "optionsTrade": null,
    "reasoning": "Technical indicators show uptrend with RSI at 62 (not overbought). CAN SLIM score of 72/100 indicates solid fundamentals. Entry near current price with 4.5% stop provides 1:1.8 risk/reward.",
    "keyFactors": [
      "Strong uptrend with golden cross (SMA 50 > SMA 200)",
      "CAN SLIM fundamentals score B+ (72/100)",
      "RSI has room to run before overbought zone"
    ],
    "risks": [
      "Mixed news sentiment suggests institutional uncertainty",
      "Trading near upper Bollinger Band (potential resistance)",
      "High P/E of 28.5 leaves no margin for earnings miss"
    ],
    "riskLevel": "MEDIUM",
    "probabilitySuccess": 65
  }],
  "comparison": "Stock trade preferred over options due to lower complexity and theta decay concerns in current low-volatility environment.",
  "finalRecommendation": "STOCK"
}

QUALITY CHECK BEFORE RESPONDING:
✓ Is my response VALID JSON (use a JSON validator)?
✓ Did I include ALL required fields (no missing fields)?
✓ Is my confidence level realistic (not over-optimistic)?
✓ Did I list REAL risks (not generic)?
✓ Is my stop-loss tight enough to limit downside?
✓ Would I personally take this trade with my own money?
✓ Did I acknowledge any data limitations or uncertainties?

⚠️ FINAL WARNING: Response must be ONLY JSON. No markdown, no explanations, no code blocks.
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
        optionsComparison: primaryRec.optionsComparison || null,
        optionsLegs: primaryRec.optionsTrade?.legs || null,
        optionsMaxProfit: primaryRec.optionsTrade?.maxProfit || null,
        optionsMaxLoss: primaryRec.optionsTrade?.maxLoss || null,
        optionsBreakeven: primaryRec.optionsTrade?.breakeven || null,
        optionsCollateralRequired: primaryRec.optionsTrade?.collateralRequired || null,
        
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
                takeProfit: decision.targetPrice, // Database uses takeProfit, not targetPrice
                stopLoss: decision.stopLoss,
                optionsStrategy: decision.optionsStrategy,
                optionsComparison: decision.optionsComparison,
                optionsLegs: decision.optionsLegs,
                maxProfit: decision.optionsMaxProfit,
                maxLoss: decision.optionsMaxLoss,
                breakeven: decision.optionsBreakeven,
                collateralRequired: decision.optionsCollateralRequired,
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
