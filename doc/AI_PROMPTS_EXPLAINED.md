# AI Trading Analysis Prompts

This document explains how we ask the AI to analyze stocks and options, and shows the exact prompts used.

---

## 🎯 **Philosophy: Honest & Data-Driven Analysis**

Our AI prompts are designed to be:
- ✅ **Honest** - No false promises, acknowledges uncertainty
- ✅ **Balanced** - Considers both bullish AND bearish signals
- ✅ **Risk-Aware** - Always includes stop-loss and risk factors
- ✅ **Conservative** - Realistic confidence levels (most trades 60-80%)
- ✅ **Data-Driven** - Based only on provided technical/fundamental data

---

## 📋 **System Prompt (Sets AI's Personality)**

We tell the AI to act as a **professional analyst**, not a fortune teller:

```
You are a professional trading analyst providing data-driven investment analysis. 
Your role is to analyze market data objectively and present balanced recommendations.

IMPORTANT PRINCIPLES:
- Be honest about uncertainty - markets are inherently unpredictable
- No recommendation is guaranteed - always acknowledge risks
- Base decisions on DATA PROVIDED, not speculation
- If data is insufficient or conflicting, recommend HOLD or MORE RESEARCH
- Never promise returns or guarantee outcomes
- Consider both upside potential AND downside risks equally
```

### **Why This Matters:**
- Traditional "expert with 20 years experience" prompts often produce over-confident recommendations
- Our approach produces more realistic, balanced analysis
- AI acknowledges what it DOESN'T know (critical for trading)

---

## 📊 **Data We Provide to AI**

For each stock analysis, we send:

### **1. Technical Analysis**
```
Trend: UPTREND (Strength: 75/100)
RSI: 62.5 (Neutral zone)
MACD: Bullish crossover
Bollinger Bands: Near upper band
Moving Averages: SMA 50 > SMA 200 (bullish)
Composite Score: 68/100
```

### **2. Fundamental Analysis (CAN SLIM)**
```
Overall Score: 72/100
Rating: B+
Grades: C=A, A=B, N=B+, S=A-, L=B, I=B+, M=B
P/E Ratio: 28.5
Market Cap: $2,850B
```

### **3. News Sentiment**
```
Articles Analyzed: 20
Overall Sentiment: Slightly Positive
Score: 0.15 (on -1 to +1 scale)
Distribution: 8 bullish, 5 bearish, 7 neutral
Trading Signal: HOLD (NEUTRAL strength)
```

### **4. Market Conditions**
```
Fear & Greed Index: 55/100 (Neutral)
VIX: 14.2 (Low volatility, calm market)
```

### **5. Options Data** (if analyzing options)
```
Underlying Price: $230.45
Available expiries with strikes, IVs, Greeks
Premium costs and open interest
```

---

## 🤖 **What We Ask AI to Do**

Here's the actual request we send:

```
Please analyze AAPL (Apple Inc.) objectively and provide an HONEST trading 
recommendation.

ANALYSIS GUIDELINES:
1. Synthesize ALL data above (technical, fundamental, sentiment, market conditions)
2. Identify BOTH bullish AND bearish signals - be balanced
3. If signals are mixed or data is insufficient, don't force a BUY/SELL - 
   recommend HOLD
4. Be realistic with confidence levels:
   - 90-100%: Extremely rare, only with overwhelming evidence
   - 70-89%: Strong conviction with clear data support
   - 50-69%: Moderate confidence, some uncertainty
   - Below 50%: Weak signals, recommend HOLD or wait
5. For stock trades: Consider realistic position sizing (not too aggressive)
6. For options: Prefer defined-risk strategies, acknowledge theta decay
7. Always provide STOP LOSS levels - risk management is critical

RISK ACKNOWLEDGMENT:
- Clearly state what could go WRONG with this trade
- Mention any data gaps or uncertainty in the analysis
- Note external factors that could invalidate the thesis
```

---

## 💡 **Example AI Response**

Based on our prompt, AI returns something like:

```json
{
  "recommendations": [{
    "tradingType": "STOCK",
    "decision": "BUY",
    "confidence": 72,
    "timeHorizon": "MEDIUM_TERM",
    
    "stockTrade": {
      "quantity": 25,
      "entryPrice": 230.50,
      "targetPrice": 250.00,
      "stopLoss": 220.00
    },
    
    "reasoning": "Technical indicators show uptrend with RSI not yet overbought. 
    Fundamentals remain strong with CAN SLIM score of 72/100. However, sentiment 
    is only slightly positive, suggesting caution. Entry near current price with 
    4.5% stop-loss provides good risk/reward ratio of 1:1.8",
    
    "keyFactors": [
      "Strong uptrend with SMA 50 > SMA 200 golden cross",
      "Solid CAN SLIM fundamentals (B+ rating)",
      "RSI at 62 - room to run before overbought"
    ],
    
    "risks": [
      "News sentiment is mixed - could indicate institutional uncertainty",
      "Trading near upper Bollinger Band - potential short-term resistance",
      "High P/E of 28.5 leaves little room for earnings disappointment"
    ],
    
    "riskLevel": "MEDIUM",
    "probabilitySuccess": 65
  }]
}
```

---

## 🔍 **Quality Checks AI Must Pass**

Before responding, AI is instructed to verify:

- ✓ Is my confidence level realistic (not over-optimistic)?
- ✓ Did I list REAL risks (not generic)?
- ✓ Is my stop-loss tight enough to limit downside?
- ✓ Would I personally take this trade with my own money?
- ✓ Did I acknowledge any data limitations or uncertainties?

---

## ⚖️ **Key Differences from Typical Trading Bots**

| Typical Bot | Our Approach |
|------------|--------------|
| "95% confidence!" | Realistic 60-75% for most trades |
| "Guaranteed profit" | Clear risks and stop-loss |
| Forces BUY/SELL | Will recommend HOLD if unclear |
| Generic risks | Specific, data-based risks |
| Ignores context | Considers market sentiment |
| Unlimited risk | Prefers defined-risk strategies |

---

## 🛡️ **Important Disclaimers**

The AI provides **analysis and suggestions**, NOT:
- ❌ Financial advice
- ❌ Guaranteed outcomes
- ❌ Investment recommendations (you decide)
- ❌ Predictions (markets are unpredictable)

**You are responsible** for:
- ✅ Final trading decisions
- ✅ Understanding the risks
- ✅ Position sizing appropriate for your account
- ✅ Following your own risk management rules

---

## 📝 **Example Real-World Scenarios**

### **Scenario 1: Clear Buy Signal**
```
Data: Strong uptrend, RSI 55, positive news, CAN SLIM A+
AI Response: BUY, 78% confidence
Reasoning: Multiple confirming signals, low risk
```

### **Scenario 2: Mixed Signals**
```
Data: Uptrend but RSI 75 (overbought), mixed news, decent fundamentals
AI Response: HOLD, 55% confidence
Reasoning: Wait for pullback or clearer signals
```

### **Scenario 3: Clear Sell Signal**
```
Data: Downtrend, RSI 35 (falling), negative news, weak fundamentals
AI Response: SELL (or avoid), 72% confidence
Reasoning: Multiple bearish indicators, high risk
```

### **Scenario 4: Insufficient Data**
```
Data: No recent news, low volume, unclear trend
AI Response: HOLD, 45% confidence
Reasoning: Not enough information for conviction
```

---

## 🎓 **How to Interpret AI Recommendations**

### **Confidence Levels:**
- **80-100%**: Very strong signal (rare)
- **65-79%**: Good conviction, reasonable trade
- **50-64%**: Moderate - small position or wait
- **Below 50%**: Weak - probably skip this trade

### **Risk Levels:**
- **LOW**: Tight stop-loss, strong support, clear thesis
- **MEDIUM**: Standard risk/reward, some uncertainty
- **HIGH**: Wide stop needed, conflicting signals, volatile

### **Time Horizons:**
- **SHORT_TERM**: 1-4 weeks (technical focus)
- **MEDIUM_TERM**: 1-3 months (balanced approach)
- **LONG_TERM**: 3+ months (fundamental focus)

---

## 🔧 **Customization**

You can modify prompts in: `app/src/services/ai/aiEngine.js`

**System Prompt:** Line 146 - `getSystemPrompt()`  
**Analysis Prompt:** Line 173 - `buildPrompt()`

---

## 📞 **Questions?**

The AI is only as good as:
1. The data we feed it
2. The prompt instructions we give
3. Your interpretation of its recommendations

Always use AI as ONE tool among many in your trading toolkit!
