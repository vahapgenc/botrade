# What We Send to OpenAI - Detailed Breakdown

This document shows **exactly** what data we send to OpenAI's GPT models when requesting a trading decision.

---

## 📨 Two-Part Message Structure

### 1. SYSTEM PROMPT (Sets AI's Role)
```
You are an expert stock and options trading analyst with 20+ years of experience. 
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
- Risk-defined vs unlimited risk strategies
```

### 2. USER PROMPT (The Actual Data)

This is where we send all the market data. Here's an example for AAPL:

```
Analyze AAPL (Apple Inc.) and provide a trading recommendation.

TRADING TYPE: STOCK

CURRENT PRICE: $243.36

═══════════════════════════════════════════════════════════════
TECHNICAL ANALYSIS
═══════════════════════════════════════════════════════════════

Trend: UPTREND (Strength: 75/100)

Moving Averages:
- SMA 20: $238.45
- SMA 50: $230.12
- EMA 12: $241.20

MACD:
- Value: 1.2345
- Signal: 0.9876
- Histogram: 0.2469
- Crossover: BULLISH

RSI: 58.34 (NEUTRAL - Moderate momentum)

Bollinger Bands: MIDDLE (NEUTRAL)

Composite Score: 68/100 (MODERATELY BULLISH)

═══════════════════════════════════════════════════════════════
FUNDAMENTAL ANALYSIS (CAN SLIM)
═══════════════════════════════════════════════════════════════

Overall Score: 78/100
Rating: STRONG

Grades: C=B+, A=A, N=B+, S=A-, L=A, I=A-, M=B+

P/E Ratio: 32.45
Market Cap: $3,765.50B

═══════════════════════════════════════════════════════════════
NEWS SENTIMENT (Last 7 Days)
═══════════════════════════════════════════════════════════════

Source: NewsAPI
Articles: 36
Overall: NEUTRAL (Score: 0.0089)
Distribution: 0 bullish, 0 bearish, 36 neutral

Trading Signal: HOLD (NEUTRAL)

═══════════════════════════════════════════════════════════════
MARKET SENTIMENT
═══════════════════════════════════════════════════════════════

Fear & Greed Index: 44/100 (FEAR)
VIX: 18.00 (NEUTRAL)
```

---

## 📊 For OPTIONS Trading Type

When `tradingType = "OPTIONS"` or `"BOTH"`, we add this additional section:

```
═══════════════════════════════════════════════════════════════
OPTIONS DATA
═══════════════════════════════════════════════════════════════

Underlying Price: $243.36

Available Expiries (Near-term):

1. 1/17/2026 (14 days):
   ATM Call (245): Last=$4.50, Bid=$4.45, Ask=$4.55, IV=28.5%, OI=5,234
   Greeks: Δ=0.52, Θ=-0.08, Vega=0.15
   
   ATM Put (245): Last=$5.20, Bid=$5.15, Ask=$5.25, IV=29.1%, OI=4,891
   Greeks: Δ=-0.48, Θ=-0.07, Vega=0.14

2. 2/21/2026 (49 days):
   ATM Call (245): Last=$7.80, Bid=$7.75, Ask=$7.90, IV=26.8%, OI=3,456
   Greeks: Δ=0.54, Θ=-0.05, Vega=0.22
   
   ATM Put (245): Last=$8.40, Bid=$8.35, Ask=$8.50, IV=27.3%, OI=2,987
   Greeks: Δ=-0.46, Θ=-0.04, Vega=0.21

3. 3/21/2026 (77 days):
   ATM Call (245): Last=$10.50, Bid=$10.45, Ask=$10.60, IV=25.5%, OI=2,134
   Greeks: Δ=0.55, Θ=-0.04, Vega=0.28
   
   ATM Put (245): Last=$11.20, Bid=$11.15, Ask=$11.30, IV=26.0%, OI=1,876
   Greeks: Δ=-0.45, Θ=-0.03, Vega=0.27
```

---

## 📋 What We Ask AI to Return

At the end of the prompt, we specify the exact JSON structure we want back:

```
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
```

---

## 🎯 Example Response from AI

Here's what GPT-4 might return:

```json
{
  "recommendations": [
    {
      "tradingType": "STOCK",
      "decision": "BUY",
      "confidence": 75,
      "timeHorizon": "MEDIUM_TERM",
      "stockTrade": {
        "quantity": 100,
        "entryPrice": 243.50,
        "targetPrice": 265.00,
        "stopLoss": 235.00
      },
      "reasoning": "AAPL shows strong technical momentum with MACD crossover and RSI in neutral territory, allowing room for growth. The uptrend is confirmed by price above all major moving averages. While market sentiment shows fear (44/100), this often presents buying opportunities in fundamentally strong stocks. CAN SLIM score of 78/100 indicates solid fundamentals with strong institutional support and new highs.",
      "keyFactors": [
        "Bullish MACD crossover with strong momentum",
        "Price above all major moving averages (SMA 20, 50, EMA 12)",
        "Strong CAN SLIM fundamentals (A grades in Annual earnings, Leadership, Market direction)"
      ],
      "risks": [
        "Market fear sentiment could trigger broader selloff",
        "Neutral RSI suggests limited near-term upside momentum",
        "High P/E of 32.45 may limit valuation expansion"
      ],
      "riskLevel": "MEDIUM",
      "probabilitySuccess": 68
    },
    {
      "tradingType": "OPTIONS",
      "decision": "BUY",
      "confidence": 70,
      "timeHorizon": "SHORT_TERM",
      "optionsTrade": {
        "strategy": "BULL_CALL_SPREAD",
        "legs": [
          {
            "action": "BUY",
            "type": "CALL",
            "strike": 245,
            "expiry": "2026-02-21",
            "premium": 7.80,
            "contracts": 5
          },
          {
            "action": "SELL",
            "type": "CALL",
            "strike": 255,
            "expiry": "2026-02-21",
            "premium": 3.20,
            "contracts": 5
          }
        ],
        "maxProfit": 2300,
        "maxLoss": 2300,
        "breakeven": 249.60,
        "collateralRequired": 2300
      },
      "reasoning": "Bull call spread offers defined risk exposure with favorable risk/reward. Moderate IV (26-27%) suggests reasonable option pricing. The 49-day expiry provides sufficient time for the technical setup to play out while limiting theta decay compared to shorter-dated options.",
      "keyFactors": [
        "Defined risk strategy (max loss $2,300)",
        "1:1 risk/reward ratio with potential 100% return",
        "Moderate IV prevents overpaying for premium"
      ],
      "risks": [
        "Stock must move above $249.60 by expiry for profit",
        "Theta decay accelerates in final 30 days",
        "Limited profit potential capped at $255"
      ],
      "riskLevel": "MEDIUM",
      "probabilitySuccess": 65
    }
  ],
  "comparison": "Stock trade offers unlimited upside potential but requires $24,350 capital (100 shares × $243.50). Options spread requires only $2,300 capital (10x less) but caps profit at $2,300. For smaller accounts or those seeking defined risk, the bull call spread is preferable. For larger accounts with longer time horizon, stock purchase offers better reward potential.",
  "finalRecommendation": "OPTIONS"
}
```

---

## 💰 Token Usage & Cost

### Typical Request:
- **Input Tokens:** ~2,000-3,000 (all the market data we send)
- **Output Tokens:** ~500-800 (AI's response)
- **Total:** ~2,500-3,800 tokens

### Cost per Request:
- **gpt-3.5-turbo:** ~$0.005 per decision
- **gpt-4-turbo:** ~$0.035 per decision
- **gpt-4:** ~$0.10 per decision

### Monthly Cost (50 decisions/day):
- **gpt-3.5-turbo:** $7.50/month
- **gpt-4-turbo:** $52.50/month
- **gpt-4:** $150/month

---

## 🎓 Key Insights

### What Makes This Prompt Powerful:

1. **Comprehensive Data Integration**
   - Technical indicators (RSI, MACD, Bollinger Bands, Moving Averages)
   - Fundamental analysis (CAN SLIM scoring system)
   - News sentiment (multi-source aggregation)
   - Market sentiment (Fear & Greed, VIX)
   - Options data (Greeks, IV, Open Interest)

2. **Structured Output**
   - Forces JSON format for consistent parsing
   - Requires specific fields (decision, confidence, reasoning)
   - Separates stock vs options recommendations
   - Includes risk assessment

3. **Expert Persona**
   - System prompt establishes 20+ years experience
   - Guides AI to think like a professional trader
   - Emphasizes risk management and clear reasoning

4. **Actionable Intelligence**
   - Specific entry/exit prices
   - Position sizing guidance
   - Risk/reward ratios
   - Success probability estimates

5. **Multi-Strategy Support**
   - Can recommend stocks OR options OR both
   - Compares strategies side-by-side
   - Adapts to time horizon (short/medium/long term)

---

## 🔧 Configuration

You can adjust the AI's behavior by modifying:

1. **Temperature** (currently 0.3)
   - Lower (0.1-0.3): More consistent, conservative decisions
   - Higher (0.6-0.9): More creative, varied strategies

2. **Max Tokens** (currently 2000)
   - Increase for more detailed explanations
   - Decrease to reduce costs

3. **Model Selection**
   - gpt-3.5-turbo: Fast, cheap, good for testing
   - gpt-4-turbo: Best quality, recommended for production
   - gpt-4: Highest quality, most expensive

---

**File Location:** [src/services/ai/aiEngine.js](../src/services/ai/aiEngine.js) (lines 165-351)  
**Function:** `buildPrompt(data)`
