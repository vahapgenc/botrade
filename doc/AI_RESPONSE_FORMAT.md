# AI Response Format Specification

## 🎯 **Purpose**
This document defines the EXACT JSON format that the AI MUST return for every trading analysis. This ensures consistent parsing and display in the UI.

---

## ⚠️ **Critical Requirements**

### **1. ONLY JSON**
- ✅ Response must be PURE JSON
- ❌ NO markdown code blocks (\`\`\`json)
- ❌ NO explanations before or after
- ❌ NO additional text

### **2. ALL Fields Required**
- Every field listed below is **MANDATORY**
- Use `null` for optional/unavailable data
- Never omit fields

### **3. Exact Field Names**
- Field names are **case-sensitive**
- Must match EXACTLY as specified
- No variations allowed

---

## 📋 **Complete JSON Structure**

```json
{
  "recommendations": [
    {
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
      
      "reasoning": "Technical indicators show uptrend with RSI at 62. CAN SLIM score of 72/100 indicates solid fundamentals.",
      
      "keyFactors": [
        "Strong uptrend with golden cross",
        "Solid fundamentals (CAN SLIM B+)",
        "RSI has room before overbought"
      ],
      
      "risks": [
        "Mixed news sentiment",
        "Near upper Bollinger Band",
        "High P/E ratio"
      ],
      
      "riskLevel": "MEDIUM",
      "probabilitySuccess": 65
    }
  ],
  
  "comparison": "Stock trade preferred over options due to lower complexity.",
  "finalRecommendation": "STOCK"
}
```

---

## 📖 **Field Specifications**

### **Root Level**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recommendations` | Array | ✅ Yes | List of trading recommendations (usually 1-2) |
| `comparison` | String | ✅ Yes | Compare different strategies (or "N/A" if only one) |
| `finalRecommendation` | String | ✅ Yes | "STOCK", "OPTIONS", or "NEITHER" |

---

### **Recommendation Object**

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `tradingType` | String | ✅ Yes | "STOCK" or "OPTIONS" | Type of trade |
| `decision` | String | ✅ Yes | "BUY", "SELL", "HOLD" | Action recommendation |
| `confidence` | Number | ✅ Yes | 0-100 (integer) | Confidence level |
| `timeHorizon` | String | ✅ Yes | "SHORT_TERM", "MEDIUM_TERM", "LONG_TERM" | Trade duration |
| `stockTrade` | Object | ✅ Yes | See below | Stock trade details (null if OPTIONS) |
| `optionsTrade` | Object | ✅ Yes | See below | Options trade details (null if STOCK) |
| `reasoning` | String | ✅ Yes | 2-4 sentences | Why this trade makes sense |
| `keyFactors` | Array[String] | ✅ Yes | 3 items | Main bullish/supportive factors |
| `risks` | Array[String] | ✅ Yes | 3 items | Main risks/concerns |
| `riskLevel` | String | ✅ Yes | "LOW", "MEDIUM", "HIGH" | Risk assessment |
| `probabilitySuccess` | Number | ✅ Yes | 0-100 (integer) | Success probability |

---

### **stockTrade Object**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quantity` | Number | ✅ Yes | Number of shares (integer) |
| `entryPrice` | Number | ✅ Yes | Suggested entry price (decimal) |
| `targetPrice` | Number | ✅ Yes | Target/take-profit price (decimal) |
| `stopLoss` | Number | ✅ Yes | Stop-loss price (decimal) |

**Example:**
```json
"stockTrade": {
  "quantity": 25,
  "entryPrice": 230.45,
  "targetPrice": 250.00,
  "stopLoss": 220.00
}
```

---

### **optionsTrade Object**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `strategy` | String | ✅ Yes | Strategy name (see values below) |
| `legs` | Array | ✅ Yes | Array of option legs (1-4 items) |
| `maxProfit` | Number | ✅ Yes | Maximum profit potential |
| `maxLoss` | Number | ✅ Yes | Maximum loss potential |
| `breakeven` | Number | ✅ Yes | Breakeven price |
| `collateralRequired` | Number | ✅ Yes | Required collateral/margin |

**Strategy Values:**
- `LONG_CALL` - Bullish, buy call
- `LONG_PUT` - Bearish, buy put
- `COVERED_CALL` - Own stock + sell call
- `PROTECTIVE_PUT` - Own stock + buy put
- `BULL_CALL_SPREAD` - Buy + sell calls
- `BEAR_PUT_SPREAD` - Buy + sell puts

**Example:**
```json
"optionsTrade": {
  "strategy": "BULL_CALL_SPREAD",
  "legs": [
    {
      "action": "BUY",
      "type": "CALL",
      "strike": 230,
      "expiry": "2026-02-21",
      "premium": 8.50,
      "contracts": 2
    },
    {
      "action": "SELL",
      "type": "CALL",
      "strike": 240,
      "expiry": "2026-02-21",
      "premium": 4.20,
      "contracts": 2
    }
  ],
  "maxProfit": 860,
  "maxLoss": 340,
  "breakeven": 233.40,
  "collateralRequired": 340
}
```

---

### **Option Leg Object**

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `action` | String | ✅ Yes | "BUY" or "SELL" | Buy or sell the option |
| `type` | String | ✅ Yes | "CALL", "PUT", "STOCK" | Option type |
| `strike` | Number | ✅ Yes | Strike price | Strike price |
| `expiry` | String | ✅ Yes | "YYYY-MM-DD" | Expiration date |
| `premium` | Number | ✅ Yes | Price per share | Option premium |
| `contracts` | Number | ✅ Yes | Number of contracts | How many contracts |

---

## ✅ **Validation Checklist**

Before sending response, AI must verify:

- [ ] Response is ONLY JSON (no extra text)
- [ ] All required fields present
- [ ] Field names match exactly (case-sensitive)
- [ ] Enums use exact allowed values
- [ ] Arrays have correct number of items
- [ ] Numbers are valid (not strings)
- [ ] Dates in "YYYY-MM-DD" format
- [ ] Either `stockTrade` OR `optionsTrade` is populated (other is `null`)

---

## 🚫 **Common Mistakes to Avoid**

### **❌ Wrong: Markdown formatting**
```markdown
\`\`\`json
{
  "recommendations": [...]
}
\`\`\`
```

### **✅ Correct: Pure JSON**
```json
{
  "recommendations": [...]
}
```

---

### **❌ Wrong: Missing fields**
```json
{
  "recommendations": [{
    "decision": "BUY",
    "confidence": 75
  }]
}
```

### **✅ Correct: All required fields**
```json
{
  "recommendations": [{
    "tradingType": "STOCK",
    "decision": "BUY",
    "confidence": 75,
    "timeHorizon": "MEDIUM_TERM",
    "stockTrade": { ... },
    "optionsTrade": null,
    "reasoning": "...",
    "keyFactors": [...],
    "risks": [...],
    "riskLevel": "MEDIUM",
    "probabilitySuccess": 65
  }],
  "comparison": "...",
  "finalRecommendation": "STOCK"
}
```

---

### **❌ Wrong: Incorrect enum values**
```json
{
  "decision": "buy",  // lowercase
  "riskLevel": "Med", // abbreviated
  "timeHorizon": "MEDIUM" // missing _TERM
}
```

### **✅ Correct: Exact enum values**
```json
{
  "decision": "BUY",  // uppercase
  "riskLevel": "MEDIUM", // full word
  "timeHorizon": "MEDIUM_TERM" // with _TERM
}
```

---

## 🔧 **Implementation**

### **Location in Code**
File: `app/src/services/ai/aiEngine.js`
- System Prompt: Line ~146
- Format Spec: Line ~280
- Example Response: Line ~315

### **Parsing**
```javascript
// Backend parses the response
const aiResponse = JSON.parse(completion.choices[0].message.content);

// Frontend displays
document.getElementById('aiDecision').textContent = aiData.decision;
document.getElementById('aiConfidence').textContent = aiData.confidence + '%';
```

---

## 📊 **Example Responses for Different Scenarios**

### **Scenario 1: Strong Buy Signal (Stock)**
```json
{
  "recommendations": [{
    "tradingType": "STOCK",
    "decision": "BUY",
    "confidence": 78,
    "timeHorizon": "MEDIUM_TERM",
    "stockTrade": {
      "quantity": 30,
      "entryPrice": 150.25,
      "targetPrice": 165.00,
      "stopLoss": 145.00
    },
    "optionsTrade": null,
    "reasoning": "Strong uptrend confirmed by MACD bullish crossover and RSI at 58 (room to run). CAN SLIM score of 82/100 indicates excellent fundamentals. Entry provides 3:1 risk/reward ratio.",
    "keyFactors": [
      "Golden cross: SMA 50 crossed above SMA 200",
      "Outstanding CAN SLIM fundamentals (A- rating)",
      "Positive earnings surprise last quarter with guidance raise"
    ],
    "risks": [
      "Overall market showing signs of overbought conditions",
      "High valuation (P/E 32) vulnerable to sector rotation",
      "Upcoming Fed meeting could trigger volatility"
    ],
    "riskLevel": "MEDIUM",
    "probabilitySuccess": 72
  }],
  "comparison": "N/A - Stock only analysis",
  "finalRecommendation": "STOCK"
}
```

### **Scenario 2: Hold Signal (Mixed Signals)**
```json
{
  "recommendations": [{
    "tradingType": "STOCK",
    "decision": "HOLD",
    "confidence": 55,
    "timeHorizon": "SHORT_TERM",
    "stockTrade": {
      "quantity": 0,
      "entryPrice": 85.50,
      "targetPrice": 90.00,
      "stopLoss": 82.00
    },
    "optionsTrade": null,
    "reasoning": "Mixed signals present: RSI at 72 suggests overbought, but fundamentals remain solid. News sentiment neutral. Recommend waiting for pullback to 80-82 range before entering.",
    "keyFactors": [
      "Strong fundamental metrics (CAN SLIM 75/100)",
      "Consistent revenue growth over 4 quarters",
      "Sector performing well relative to market"
    ],
    "risks": [
      "RSI overbought at 72 - likely near-term pullback",
      "Trading above upper Bollinger Band (resistance)",
      "Volume declining on recent price increase (divergence)"
    ],
    "riskLevel": "HIGH",
    "probabilitySuccess": 48
  }],
  "comparison": "Recommend waiting for better entry point",
  "finalRecommendation": "NEITHER"
}
```

### **Scenario 3: Options Strategy**
```json
{
  "recommendations": [{
    "tradingType": "OPTIONS",
    "decision": "BUY",
    "confidence": 70,
    "timeHorizon": "SHORT_TERM",
    "stockTrade": null,
    "optionsTrade": {
      "strategy": "BULL_CALL_SPREAD",
      "legs": [
        {
          "action": "BUY",
          "type": "CALL",
          "strike": 200,
          "expiry": "2026-02-21",
          "premium": 6.50,
          "contracts": 5
        },
        {
          "action": "SELL",
          "type": "CALL",
          "strike": 210,
          "expiry": "2026-02-21",
          "premium": 2.80,
          "contracts": 5
        }
      ],
      "maxProfit": 3150,
      "maxLoss": 1850,
      "breakeven": 203.70,
      "collateralRequired": 1850
    },
    "reasoning": "Bullish technical setup with defined risk. IV at 28% is below historical average (good time to buy premium). Bull call spread provides leverage with capped downside. 30 DTE allows for move to develop.",
    "keyFactors": [
      "IV relatively low at 28% - favorable for buying options",
      "Technical indicators suggest move to 210 within 30 days",
      "Defined risk strategy limits maximum loss to $1,850"
    ],
    "risks": [
      "Theta decay accelerates in final 2 weeks",
      "If price stays flat or drops, entire premium at risk",
      "Earnings announcement in 25 days could increase IV"
    ],
    "riskLevel": "MEDIUM",
    "probabilitySuccess": 62
  }],
  "comparison": "Options preferred here due to high capital efficiency. Stock would require $10,000 for equivalent exposure vs $1,850 for spread. Max profit capped but so is risk.",
  "finalRecommendation": "OPTIONS"
}
```

---

## 🎯 **Summary**

**Golden Rules:**
1. ✅ Response is ONLY JSON
2. ✅ All fields present (use `null` when needed)
3. ✅ Exact field names and enum values
4. ✅ Validate before sending

This strict format ensures the frontend can reliably parse and display AI recommendations without errors!
