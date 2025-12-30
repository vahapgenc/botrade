# AI-Powered Algorithmic Trading Platform (Node.js)

## ⚠️ Disclaimer
**EDUCATIONAL USE ONLY.** This software communicates with the Interactive Brokers API and executes real financial transactions. Algorithmic trading involves significant risk of loss. The AI strategies generated are probabilistic and not guaranteed. **Always test thoroughly in a Paper Trading environment before using real capital.**

---

## 1. Project Overview
This platform automates the entire trading lifecycle with a comprehensive two-part analysis system:

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ALGORITHMIC TRADING PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PART 1: MARKET SENTIMENT ENGINE                   │   │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │   │
│  │  │     VIX     │  │  Fear & Greed   │  │   AAII Sentiment      │  │   │
│  │  │ Volatility  │  │     Index       │  │      Survey           │  │   │
│  │  └──────┬──────┘  └───────┬─────────┘  └───────────┬────────────┘  │   │
│  │         │                 │                        │               │   │
│  │         └─────────────────┼────────────────────────┘               │   │
│  │                           ▼                                        │   │
│  │                  ┌────────────────┐                                │   │
│  │                  │  REDIS CACHE   │                                │   │
│  │                  │ (Sentiment DB) │                                │   │
│  │                  └───────┬────────┘                                │   │
│  └──────────────────────────┼──────────────────────────────────────────┘   │
│                             │                                              │
│  ┌──────────────────────────▼──────────────────────────────────────────┐   │
│  │                    PART 2: TECHNICAL ANALYSIS                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ SELECTORS: [Asset Type ▼] [Asset ▼] [Timeframe: 1d|8h|4h|1h]│   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │   │
│  │  │ TREND INDICATORS │  │ MOMENTUM INDIC.  │  │ VOLUME ANALYSIS │   │   │
│  │  │ • Moving Averages│  │ • RSI            │  │ • OBV           │   │   │
│  │  │ • MACD           │  │ • Stochastic     │  │ • A/D Line      │   │   │
│  │  │ • Parabolic SAR  │  │ • CCI            │  │ • Volume SMA    │   │   │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │   │
│  │  │ VOLATILITY       │  │ FUNDAMENTAL      │  │ NEWS ANALYSIS   │   │   │
│  │  │ • Bollinger Bands│  │ • CAN SLIM       │  │ • Asset News    │   │   │
│  │  │ • Keltner Channel│  │ • EPS Growth     │  │ • Global News   │   │   │
│  │  │ • ATR            │  │ • Revenue Growth │  │ • Sentiment     │   │   │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                      │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │                         AI DECISION ENGINE                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    GPT-4 TRADING ADVISOR                     │   │   │
│  │  │  • Analyzes all indicators + sentiment + news                │   │   │
│  │  │  • Portfolio-aware decisions (budget, positions)             │   │   │
│  │  │  • Risk management & position sizing                         │   │   │
│  │  │  • BUY / SELL / HOLD recommendations                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                      │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │                      EXECUTION & PORTFOLIO                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │   │
│  │  │ IBKR Connection │  │ Order Execution │  │ Portfolio Tracker   │ │   │
│  │  │ • Paper Trading │  │ • Market Orders │  │ • Positions         │ │   │
│  │  │ • Live Trading  │  │ • Limit Orders  │  │ • P&L               │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

### Core Technologies
- **Runtime**: Node.js v18+
- **Language**: JavaScript (ES6+)
- **Web Framework**: Express.js (REST API & Dashboard)

### Data & APIs
- **Market Data**: Financial Modeling Prep (primary), Polygon.io, Alpha Vantage (backup)
- **News Data**: NewsAPI.org
- **AI Engine**: OpenAI GPT-4 (trading decisions)
- **Broker Integration**: Interactive Brokers TWS/Gateway via @stoqey/ib

### Technical Analysis
- **Indicators Library**: technicalindicators (RSI, MACD, Bollinger, Stochastic, etc.)
- **Data Processing**: Custom calculators for OBV, A/D Line, CAN SLIM scoring

### Data Storage & Caching
- **Cache**: Redis (sentiment data, 60-min TTL) or in-memory fallback
- **Database**: PostgreSQL (primary) - supports complex queries, concurrent connections, production-ready
- **ORM**: Prisma (type-safe queries, auto-migrations, database client generation)
- **Backup**: JSON files for portfolio & trade history (fallback)

### Frontend
- **UI**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js or TradingView widgets (optional)
- **Real-time Updates**: Server-Sent Events (SSE) or WebSocket

### Development & Operations
- **Environment Management**: dotenv
- **Logging**: Winston or Pino
- **Testing**: Jest (unit tests), Supertest (API tests)
- **Process Management**: PM2 (production)
- **Error Monitoring**: Sentry (optional)

### Notifications
- **Email**: Nodemailer (Gmail, SendGrid, AWS SES)
- **Telegram**: node-telegram-bot-api
- **Discord**: discord.js (optional)

### Dependencies Summary
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "openai": "^4.20.1",
    "technicalindicators": "^3.1.0",
    "@stoqey/ib": "^1.4.0",
    "redis": "^4.6.0",
    "winston": "^3.11.0",
    "nodemailer": "^6.9.7",
    "node-telegram-bot-api": "^0.64.0",
    "@prisma/client": "^5.7.1",
    "pm2": "^5.3.0"
  },
  "devDependencies": {
    "prisma": "^5.7.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2"
  }
}
```

---

## 2. Project Structure
```
trading-bot/
├── .env                          # Environment variables & API keys
├── package.json                  # Node.js dependencies
├── config/
│   └── settings.js               # Global configuration
│
├── src/
│   ├── index.js                  # Main entry point
│   │
│   ├── part1-sentiment/          # PART 1: Market Sentiment
│   │   ├── sentimentEngine.js    # Main sentiment orchestrator
│   │   ├── vixFetcher.js         # VIX Volatility Index
│   │   ├── fearGreedFetcher.js   # CNN Fear & Greed Index
│   │   ├── aaiiSentiment.js      # AAII Sentiment Survey
│   │   └── sentimentCache.js     # Redis/Memory cache for sentiment
│   │
│   ├── part2-technical/          # PART 2: Technical Analysis
│   │   ├── analysisEngine.js     # Main analysis orchestrator
│   │   ├── dataFetcher.js        # Market data fetcher (multi-timeframe)
│   │   ├── indicators/
│   │   │   ├── trendIndicators.js    # MA, MACD, Parabolic SAR
│   │   │   ├── momentumIndicators.js # RSI, Stochastic, CCI
│   │   │   ├── volumeIndicators.js   # OBV, A/D Line
│   │   │   └── volatilityIndicators.js # Bollinger, Keltner, ATR
│   │   ├── canslim.js            # CAN SLIM fundamental analysis
│   │   └── newsAnalyzer.js       # News fetcher & sentiment
│   │
│   ├── ai/
│   │   ├── aiEngine.js           # AI strategy generator
│   │   ├── promptBuilder.js      # Builds comprehensive AI prompts
│   │   └── responseParser.js     # Parses AI trading decisions
│   │
│   ├── portfolio/
│   │   ├── portfolioManager.js   # Track positions & budget
│   │   ├── positionSizer.js      # Calculate position sizes
│   │   └── riskManager.js        # Risk management rules
│   │
│   ├── execution/
│   │   ├── ibkrConnector.js      # IBKR connection handler
│   │   └── orderExecutor.js      # Order placement logic
│   │
│   └── ui/
│       ├── server.js             # Express server for UI
│       ├── routes/
│       │   ├── sentiment.js      # Sentiment API routes
│       │   ├── analysis.js       # Technical analysis routes
│       │   └── trading.js        # Trading action routes
│       └── public/
│           ├── index.html        # Main dashboard
│           ├── css/
│           │   └── styles.css
│           └── js/
│               └── app.js        # Frontend logic
│
└── data/
    ├── portfolio.json            # Local portfolio storage
    └── trade_history.json        # Trade log
```

---

## 3. Detailed Feature Specifications

### PART 1: Market Sentiment Engine

#### 3.1 VIX Volatility Index
```javascript
// Data Source: CBOE via Financial Modeling Prep or Yahoo Finance
// Interpretation:
// VIX < 12    = Low volatility, complacency (potential market top)
// VIX 12-20   = Normal market conditions
// VIX 20-30   = Elevated fear, uncertainty
// VIX > 30    = High fear, potential capitulation (contrarian buy signal)

const VIX_INTERPRETATION = {
    extreme_low: { range: [0, 12], signal: 'CAUTION', description: 'Market complacency - potential top' },
    normal: { range: [12, 20], signal: 'NEUTRAL', description: 'Normal volatility' },
    elevated: { range: [20, 30], signal: 'FEAR', description: 'Elevated uncertainty' },
    extreme: { range: [30, 100], signal: 'EXTREME_FEAR', description: 'Panic - contrarian buy zone' }
};
```

#### 3.2 CNN Fear & Greed Index
```javascript
// Data Source: CNN Money API / Web scraping
// Scale: 0-100
// Interpretation:
// 0-25   = Extreme Fear (Contrarian BUY signal)
// 25-45  = Fear
// 45-55  = Neutral
// 55-75  = Greed
// 75-100 = Extreme Greed (Contrarian SELL signal)

const FEAR_GREED_INTERPRETATION = {
    extreme_fear: { range: [0, 25], signal: 'BUY', description: 'Extreme fear - buying opportunity' },
    fear: { range: [25, 45], signal: 'LEAN_BUY', description: 'Fear present' },
    neutral: { range: [45, 55], signal: 'NEUTRAL', description: 'Balanced sentiment' },
    greed: { range: [55, 75], signal: 'LEAN_SELL', description: 'Greed emerging' },
    extreme_greed: { range: [75, 100], signal: 'SELL', description: 'Extreme greed - take profits' }
};
```

#### 3.3 AAII Sentiment Survey
```javascript
// Data Source: AAII.com (weekly survey)
// Measures: Bullish %, Bearish %, Neutral %
// Contrarian Indicator: High bullish = market top, High bearish = market bottom

const AAII_INTERPRETATION = {
    // Bull-Bear Spread Analysis
    extreme_bullish: { spread: [30, 100], signal: 'CAUTION', description: 'Crowd too bullish' },
    bullish: { spread: [10, 30], signal: 'LEAN_SELL', description: 'Above average optimism' },
    neutral: { spread: [-10, 10], signal: 'NEUTRAL', description: 'Balanced sentiment' },
    bearish: { spread: [-30, -10], signal: 'LEAN_BUY', description: 'Elevated pessimism' },
    extreme_bearish: { spread: [-100, -30], signal: 'BUY', description: 'Capitulation - buying opportunity' }
};
```

#### 3.4 Sentiment Cache System
```javascript
// Cache Structure (Redis or In-Memory)
{
    "timestamp": "2025-12-30T10:00:00Z",
    "ttl": 3600, // 1 hour cache
    "sentiment_data": {
        "vix": {
            "value": 18.5,
            "change": -0.5,
            "interpretation": "NEUTRAL",
            "signal_strength": 50
        },
        "fear_greed": {
            "value": 35,
            "interpretation": "FEAR",
            "components": {
                "market_momentum": 40,
                "stock_strength": 30,
                "put_call_ratio": 45,
                "market_volatility": 25,
                "safe_haven_demand": 35,
                "junk_bond_demand": 40
            },
            "signal_strength": 65
        },
        "aaii": {
            "bullish": 28.5,
            "bearish": 38.2,
            "neutral": 33.3,
            "bull_bear_spread": -9.7,
            "interpretation": "NEUTRAL",
            "signal_strength": 45
        },
        "composite_score": {
            "value": 42,
            "signal": "LEAN_BUY",
            "confidence": 60
        }
    }
}
```

---

### PART 2: Technical Analysis Engine

#### 3.5 Asset Selection System
```javascript
// Asset Types & Options
const ASSET_TYPES = {
    STOCKS: {
        label: 'Stocks',
        exchanges: ['NYSE', 'NASDAQ', 'AMEX'],
        examples: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA']
    },
    ETF: {
        label: 'ETFs',
        categories: ['Index', 'Sector', 'Bond', 'Commodity'],
        examples: ['SPY', 'QQQ', 'IWM', 'GLD', 'XLF', 'XLE']
    },
    CRYPTO: {
        label: 'Cryptocurrency',
        exchanges: ['Coinbase', 'Binance'],
        examples: ['BTC-USD', 'ETH-USD', 'SOL-USD']
    },
    FOREX: {
        label: 'Forex',
        pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD']
    }
};

// Timeframe Options
const TIMEFRAMES = {
    '1d': { label: '1 Day', candleCount: 365, apiInterval: 'daily' },
    '8h': { label: '8 Hours', candleCount: 180, apiInterval: '8hour' },
    '4h': { label: '4 Hours', candleCount: 360, apiInterval: '4hour' },
    '1h': { label: '1 Hour', candleCount: 720, apiInterval: '1hour' }
};
```

#### 3.6 Technical Indicators Suite

##### Trend Indicators
```javascript
// Moving Averages
const MOVING_AVERAGES = {
    SMA_20: { period: 20, type: 'SMA', use: 'Short-term trend' },
    SMA_50: { period: 50, type: 'SMA', use: 'Medium-term trend' },
    SMA_200: { period: 200, type: 'SMA', use: 'Long-term trend (Golden/Death Cross)' },
    EMA_9: { period: 9, type: 'EMA', use: 'Fast signal line' },
    EMA_21: { period: 21, type: 'EMA', use: 'Medium signal line' }
};

// MACD Configuration
const MACD_CONFIG = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    interpretation: {
        bullish_cross: 'MACD crosses above signal line',
        bearish_cross: 'MACD crosses below signal line',
        histogram_growing: 'Momentum increasing',
        histogram_shrinking: 'Momentum decreasing',
        divergence: 'Price vs MACD divergence signals reversal'
    }
};

// Parabolic SAR
const PARABOLIC_SAR = {
    step: 0.02,
    max: 0.2,
    interpretation: {
        price_above_sar: 'Uptrend - Hold/Buy',
        price_below_sar: 'Downtrend - Sell/Short',
        sar_flip: 'Trend reversal signal'
    }
};
```

##### Momentum Indicators
```javascript
// RSI Configuration
const RSI_CONFIG = {
    period: 14,
    overbought: 70,
    oversold: 30,
    interpretation: {
        above_70: 'Overbought - potential sell signal',
        below_30: 'Oversold - potential buy signal',
        divergence: 'Price vs RSI divergence indicates reversal',
        centerline_cross: 'Momentum shift'
    }
};

// Stochastic Oscillator
const STOCHASTIC_CONFIG = {
    kPeriod: 14,
    dPeriod: 3,
    smooth: 3,
    overbought: 80,
    oversold: 20,
    interpretation: {
        k_crosses_d_up: 'Bullish crossover',
        k_crosses_d_down: 'Bearish crossover',
        overbought_zone: 'Watch for reversal down',
        oversold_zone: 'Watch for reversal up'
    }
};

// CCI (Commodity Channel Index)
const CCI_CONFIG = {
    period: 20,
    interpretation: {
        above_100: 'Overbought / Strong uptrend',
        below_minus100: 'Oversold / Strong downtrend',
        range_100: 'Normal trading range',
        zero_cross: 'Trend direction change'
    }
};
```

##### Volume Indicators
```javascript
// OBV (On-Balance Volume)
const OBV_INTERPRETATION = {
    rising_obv_rising_price: 'Confirmed uptrend',
    rising_obv_falling_price: 'Accumulation - bullish divergence',
    falling_obv_rising_price: 'Distribution - bearish divergence',
    falling_obv_falling_price: 'Confirmed downtrend'
};

// A/D Line (Accumulation/Distribution)
const AD_LINE_INTERPRETATION = {
    rising_ad: 'Buying pressure dominant',
    falling_ad: 'Selling pressure dominant',
    divergence_bullish: 'A/D rising while price falling = accumulation',
    divergence_bearish: 'A/D falling while price rising = distribution'
};

// Volume Analysis
const VOLUME_ANALYSIS = {
    volume_sma_period: 20,
    spike_multiplier: 2.0, // 2x average = spike
    interpretation: {
        high_volume_up: 'Strong buying interest',
        high_volume_down: 'Strong selling pressure',
        low_volume_up: 'Weak rally - potential reversal',
        low_volume_down: 'Weak selling - potential support'
    }
};
```

##### Volatility Indicators
```javascript
// Bollinger Bands
const BOLLINGER_CONFIG = {
    period: 20,
    stdDev: 2,
    interpretation: {
        price_above_upper: 'Overbought / Breakout continuation',
        price_below_lower: 'Oversold / Breakdown',
        squeeze: 'Low volatility - breakout imminent',
        expansion: 'High volatility - trend in progress',
        walk_the_band: 'Strong trend continuation'
    }
};

// Keltner Channels
const KELTNER_CONFIG = {
    emaPeriod: 20,
    atrPeriod: 10,
    multiplier: 2,
    interpretation: {
        price_above_upper: 'Strong bullish momentum',
        price_below_lower: 'Strong bearish momentum',
        within_channel: 'Normal price action',
        breakout: 'Potential trend start'
    }
};

// ATR (Average True Range)
const ATR_CONFIG = {
    period: 14,
    use: 'Position sizing and stop-loss calculation',
    stop_loss_multiplier: 2 // 2x ATR for stop-loss
};
```

#### 3.7 CAN SLIM Analysis
```javascript
// CAN SLIM Scoring System
const CANSLIM_CRITERIA = {
    C: {
        name: 'Current Quarterly Earnings',
        requirement: 'EPS growth >= 25% YoY',
        weight: 15,
        check: (currentEPS, yearAgoEPS) => {
            const growth = ((currentEPS - yearAgoEPS) / Math.abs(yearAgoEPS)) * 100;
            return { pass: growth >= 25, value: growth };
        }
    },
    A: {
        name: 'Annual Earnings Growth',
        requirement: '5-year annual EPS growth >= 25%',
        weight: 15,
        check: (fiveYearGrowth) => ({ pass: fiveYearGrowth >= 25, value: fiveYearGrowth })
    },
    N: {
        name: 'New Highs',
        requirement: 'Price within 5% of 52-week high',
        weight: 15,
        check: (currentPrice, high52w) => {
            const nearHigh = currentPrice >= (high52w * 0.95);
            return { pass: nearHigh, value: ((currentPrice / high52w) * 100).toFixed(1) };
        }
    },
    S: {
        name: 'Supply & Demand',
        requirement: 'Volume surge on up days',
        weight: 10,
        check: (volumeData) => ({ pass: volumeData.upDayVolumeRatio > 1.5, value: volumeData.upDayVolumeRatio })
    },
    L: {
        name: 'Leader or Laggard',
        requirement: 'RS Rating >= 80',
        weight: 15,
        check: (rsRating) => ({ pass: rsRating >= 80, value: rsRating })
    },
    I: {
        name: 'Institutional Sponsorship',
        requirement: 'Increasing institutional ownership',
        weight: 15,
        check: (instOwnership) => ({ pass: instOwnership.trend === 'increasing', value: instOwnership.percentage })
    },
    M: {
        name: 'Market Direction',
        requirement: 'Market in confirmed uptrend',
        weight: 15,
        check: (marketTrend) => ({ pass: marketTrend === 'uptrend', value: marketTrend })
    }
};
```

#### 3.8 News Analysis
```javascript
// News Sources & Analysis
const NEWS_CONFIG = {
    sources: {
        asset_specific: [
            'https://financialmodelingprep.com/api/v3/stock_news',
            'https://newsapi.org/v2/everything',
            'https://api.polygon.io/v2/reference/news'
        ],
        global_market: [
            'https://financialmodelingprep.com/api/v3/fmp/articles',
            'https://newsapi.org/v2/top-headlines?category=business'
        ]
    },
    sentiment_analysis: {
        provider: 'OpenAI',
        categories: ['BULLISH', 'BEARISH', 'NEUTRAL'],
        impact_levels: ['HIGH', 'MEDIUM', 'LOW']
    },
    cache_ttl: 1800 // 30 minutes
};

// News Scoring
const NEWS_SCORING = {
    weight_by_recency: {
        '0-1h': 1.0,
        '1-6h': 0.8,
        '6-24h': 0.5,
        '24-48h': 0.3
    },
    impact_multiplier: {
        HIGH: 2.0,
        MEDIUM: 1.0,
        LOW: 0.5
    }
};
```

---

### PART 3: AI Decision Engine

#### 3.9 Complete Data Flow Example (Part 1 + Part 2 → AI)

Here's a real-world example of what the AI receives after both analysis phases:

```javascript
// ============================================================================
// STEP 1: PART 1 OUTPUT - Market Sentiment (Cached Data)
// ============================================================================

const PART1_SENTIMENT_OUTPUT = {
    timestamp: "2025-12-30T14:30:00Z",
    cache_age_minutes: 15,
    
    // VIX Analysis
    vix: {
        current_value: 18.5,
        previous_close: 19.0,
        change: -0.5,
        change_percent: -2.63,
        interpretation: "NEUTRAL",
        zone: "Normal volatility (12-20 range)",
        signal: "NEUTRAL",
        signal_strength: 50,
        recommendation: "Normal market conditions - no special precautions needed"
    },
    
    // Fear & Greed Index
    fear_greed: {
        current_value: 35,
        previous_value: 32,
        change: +3,
        interpretation: "FEAR",
        zone: "Fear zone (25-45 range)",
        signal: "LEAN_BUY",
        signal_strength: 65,
        
        // 7 Component Breakdown
        components: {
            market_momentum: { value: 40, weight: 14.3 },    // S&P 500 vs 125-day MA
            stock_strength: { value: 30, weight: 14.3 },     // NYSE new highs vs lows
            stock_breadth: { value: 35, weight: 14.3 },      // Advance/decline ratio
            put_call_ratio: { value: 45, weight: 14.3 },     // Options sentiment
            market_volatility: { value: 25, weight: 14.3 },  // VIX vs average
            safe_haven: { value: 35, weight: 14.3 },         // Bonds vs Stocks
            junk_bond_demand: { value: 40, weight: 14.3 }    // Credit spreads
        },
        
        recommendation: "Market showing fear - contrarian buying opportunity"
    },
    
    // AAII Sentiment Survey
    aaii: {
        survey_date: "2025-12-27",
        data_age_days: 3,
        
        current_readings: {
            bullish_percent: 28.5,
            bearish_percent: 38.2,
            neutral_percent: 33.3
        },
        
        historical_averages: {
            bullish_avg: 37.5,      // Long-term average
            bearish_avg: 31.0,
            neutral_avg: 31.5
        },
        
        analysis: {
            bull_bear_spread: -9.7,  // 28.5 - 38.2 = -9.7
            spread_interpretation: "NEUTRAL",
            spread_zone: "Slightly bearish sentiment (-10 to +10 is neutral)",
            
            // Contrarian Analysis
            contrarian_signal: "NEUTRAL_TO_SLIGHT_BUY",
            reasoning: "Bearish sentiment elevated but not extreme. More bearish than average is slightly bullish (contrarian)."
        },
        
        signal: "NEUTRAL",
        signal_strength: 45,
        recommendation: "Sentiment balanced - no strong contrarian signal"
    },
    
    // COMPOSITE SENTIMENT SCORE
    composite: {
        weighted_score: 42,         // 0-100 scale (0=extreme fear, 100=extreme greed)
        interpretation: "LEAN_BULLISH",
        confidence: 60,
        
        calculation: {
            vix_contribution: 15,        // 30% weight * 50 strength
            fear_greed_contribution: 19, // 40% weight * 65 strength  
            aaii_contribution: 8,        // 30% weight * 45 strength
            total: 42
        },
        
        market_mood: "Cautiously Pessimistic - Good for Contrarian Buys",
        recommendation: "Slight risk-on bias. Market fear creates selective opportunities."
    }
};

// ============================================================================
// STEP 2: PART 2 OUTPUT - Technical + Fundamental Analysis
// ============================================================================

const PART2_ANALYSIS_OUTPUT = {
    // Basic Info
    ticker: "NVDA",
    company_name: "NVIDIA Corporation",
    sector: "Technology",
    industry: "Semiconductors",
    current_price: 495.50,
    timestamp: "2025-12-30T14:35:00Z",
    timeframe_analyzed: "1d",  // Daily candles
    
    // ==================== TECHNICAL ANALYSIS ====================
    
    technical: {
        // TREND INDICATORS
        trend: {
            // Moving Averages
            moving_averages: {
                sma_20: 488.25,
                sma_50: 475.80,
                sma_200: 420.30,
                ema_9: 492.10,
                ema_21: 486.50,
                
                alignment: "BULLISH",  // Price > SMA20 > SMA50 > SMA200
                golden_cross: true,    // SMA50 crossed above SMA200
                price_vs_ma200: 17.9,  // % above 200-day MA
                
                interpretation: "Strong uptrend - all MAs aligned bullishly"
            },
            
            // MACD
            macd: {
                macd_line: 8.5,
                signal_line: 6.2,
                histogram: 2.3,
                crossover: "BULLISH",          // MACD above signal
                crossover_bars_ago: 3,
                histogram_trend: "EXPANDING",  // Momentum increasing
                
                interpretation: "Bullish momentum - recent crossover"
            },
            
            // Parabolic SAR
            parabolic_sar: {
                sar_value: 482.30,
                price_vs_sar: "ABOVE",
                trend: "UPTREND",
                bars_in_trend: 12,
                
                interpretation: "Confirmed uptrend - price above SAR for 12 bars"
            },
            
            overall_trend: "STRONG_BULLISH",
            trend_score: 85
        },
        
        // MOMENTUM INDICATORS
        momentum: {
            // RSI
            rsi: {
                value: 62.5,
                zone: "NEUTRAL",               // Between 30-70
                previous_value: 58.2,
                direction: "RISING",
                
                divergence: {
                    detected: false,
                    type: null
                },
                
                interpretation: "Healthy momentum - room to run before overbought"
            },
            
            // Stochastic
            stochastic: {
                k_line: 72.3,
                d_line: 68.5,
                zone: "APPROACHING_OVERBOUGHT",  // 70-80 range
                crossover: "BULLISH",            // K above D
                crossover_bars_ago: 2,
                
                interpretation: "Bullish crossover but approaching overbought"
            },
            
            // CCI
            cci: {
                value: 85.2,
                zone: "NORMAL",                  // -100 to +100
                trend: "RISING",
                
                interpretation: "Within normal range, trending up"
            },
            
            overall_momentum: "BULLISH",
            momentum_score: 75
        },
        
        // VOLUME INDICATORS
        volume: {
            // Current Volume Stats
            current_volume: 52500000,
            avg_volume_20d: 45200000,
            volume_ratio: 1.16,                  // 16% above average
            volume_trend: "ABOVE_AVERAGE",
            
            // OBV (On-Balance Volume)
            obv: {
                current: 2850000000,
                sma_20: 2720000000,
                trend: "RISING",
                price_obv_correlation: "CONFIRMED",  // Both rising
                
                divergence: {
                    detected: false,
                    type: null
                },
                
                interpretation: "Strong accumulation - OBV confirming price uptrend"
            },
            
            // A/D Line
            ad_line: {
                current: 185000000,
                sma_20: 165000000,
                trend: "RISING",
                strength: "STRONG",
                
                interpretation: "Buying pressure dominant - institutional accumulation"
            },
            
            overall_volume: "BULLISH_CONFIRMATION",
            volume_score: 80
        },
        
        // VOLATILITY INDICATORS
        volatility: {
            // Bollinger Bands
            bollinger: {
                upper_band: 510.20,
                middle_band: 488.50,
                lower_band: 466.80,
                
                price_position: "UPPER_HALF",    // Between middle and upper
                bandwidth: 43.40,
                bandwidth_percentile: 65,         // Moderate volatility
                
                squeeze: false,
                walking_the_band: false,
                
                interpretation: "Price in bullish zone - room to reach upper band"
            },
            
            // Keltner Channels
            keltner: {
                upper_channel: 505.30,
                centerline: 488.25,
                lower_channel: 471.20,
                
                price_position: "ABOVE_CENTERLINE",
                
                interpretation: "Price above centerline shows strength"
            },
            
            // ATR (Average True Range)
            atr: {
                value: 14.25,
                percentage: 2.88,                 // 2.88% of price
                trend: "STABLE",
                
                // For Risk Management
                stop_loss_suggestion: 467.00,     // Price - (2 × ATR)
                take_profit_suggestion: 538.50,   // Price + (3 × ATR)
                
                interpretation: "Normal volatility - good for position sizing"
            },
            
            overall_volatility: "MODERATE",
            volatility_score: 70
        },
        
        // TECHNICAL SUMMARY
        technical_summary: {
            overall_signal: "BULLISH",
            confidence: 78,
            strength: "STRONG",
            
            bullish_factors: [
                "All moving averages aligned bullishly",
                "MACD bullish crossover (3 bars ago)",
                "Price above Parabolic SAR",
                "RSI healthy at 62.5 (room to run)",
                "Volume confirming uptrend (OBV rising)",
                "Strong accumulation on A/D Line"
            ],
            
            bearish_factors: [
                "Stochastic approaching overbought",
                "Short-term profit-taking possible"
            ],
            
            risk_level: "MODERATE"
        }
    },
    
    // ==================== FUNDAMENTAL ANALYSIS ====================
    
    fundamental: {
        // COMPANY FINANCIALS (Latest Quarter)
        financials: {
            // Income Statement
            revenue: 35082000000,               // $35.08B quarterly
            revenue_growth_yoy: 0.94,           // 94% YoY growth! 🔥
            revenue_growth_qoq: 0.17,           // 17% QoQ growth
            
            gross_profit: 26265000000,
            gross_margin: 0.749,                // 74.9% - EXCEPTIONAL
            
            operating_income: 21872000000,
            operating_margin: 0.623,            // 62.3% - OUTSTANDING
            
            net_income: 19309000000,
            net_margin: 0.550,                  // 55% - ELITE
            
            eps: 7.84,                          // $7.84 per share
            eps_diluted: 7.81,
            eps_growth_yoy: 1.11,               // 111% EPS growth! 🚀
            eps_growth_qoq: 0.20,               // 20% sequential growth
            
            shares_outstanding: 2462000000,
            
            // Cash Flow
            free_cash_flow: 16821000000,
            fcf_margin: 0.480,                  // 48% FCF margin
            
            // Balance Sheet Health
            cash: 38533000000,
            total_debt: 9708000000,
            net_cash: 28825000000,              // Fortress balance sheet!
            current_ratio: 4.32,
            debt_to_equity: 0.16                // Very low debt
        },
        
        // VALUATION METRICS
        valuation: {
            market_cap: 1220000000000,          // $1.22T
            enterprise_value: 1191000000000,
            
            pe_ratio: 39.2,                     // P/E
            forward_pe: 28.5,                   // Forward P/E (lower = growth priced in)
            peg_ratio: 0.35,                    // <1 = undervalued relative to growth!
            
            price_to_sales: 34.8,
            price_to_book: 52.1,
            ev_to_ebitda: 45.2,
            
            price_to_fcf: 25.4,
            
            interpretation: "Premium valuation justified by explosive growth + margins"
        },
        
        // CAN SLIM ANALYSIS (100-point scoring)
        canslim: {
            total_score: 92,
            max_score: 100,
            rating: "EXCEPTIONAL",
            
            breakdown: {
                C: {
                    name: "Current Quarterly Earnings",
                    score: 15,
                    max: 15,
                    passed: true,
                    data: {
                        eps_growth_yoy: 111,
                        requirement: 25,
                        status: "🔥 CRUSHING IT - 111% EPS growth"
                    }
                },
                
                A: {
                    name: "Annual Earnings Growth",
                    score: 15,
                    max: 15,
                    passed: true,
                    data: {
                        five_year_eps_cagr: 62,
                        requirement: 25,
                        status: "🚀 EXCEPTIONAL - 62% 5-year CAGR"
                    }
                },
                
                N: {
                    name: "New Highs",
                    score: 13,
                    max: 15,
                    passed: true,
                    data: {
                        price_vs_52w_high: 94.2,  // 94.2% of 52-week high
                        requirement: 95,
                        status: "✅ NEAR HIGH - 6% from ATH"
                    }
                },
                
                S: {
                    name: "Supply & Demand",
                    score: 14,
                    max: 10,
                    passed: true,
                    data: {
                        volume_on_up_days_ratio: 1.65,
                        requirement: 1.5,
                        status: "✅ STRONG - 65% more volume on up days"
                    }
                },
                
                L: {
                    name: "Leader or Laggard",
                    score: 15,
                    max: 15,
                    passed: true,
                    data: {
                        relative_strength_rating: 96,
                        requirement: 80,
                        status: "🏆 MARKET LEADER - RS 96"
                    }
                },
                
                I: {
                    name: "Institutional Sponsorship",
                    score: 12,
                    max: 15,
                    passed: true,
                    data: {
                        institutional_ownership: 67.5,
                        ownership_trend: "INCREASING",
                        top_funds_count: 3420,
                        status: "✅ STRONG - 67.5% institutional ownership"
                    }
                },
                
                M: {
                    name: "Market Direction",
                    score: 8,
                    max: 15,
                    passed: false,
                    data: {
                        spy_trend: "UPTREND_WEAKENING",
                        spy_above_200ma: true,
                        market_breadth: 58,  // % stocks above 200-day MA
                        status: "⚠️ MIXED - Market showing some weakness"
                    }
                }
            },
            
            summary: "Elite CAN SLIM candidate - only market direction slightly weak"
        },
        
        // GROWTH SCORE (Finding the Next Gold!)
        growth_score: {
            total_score: 98,
            max_score: 100,
            percentage: 98.0,
            rating: "🥇 EXCEPTIONAL - This IS a growth monster!",
            
            breakdown: {
                revenue_growth: {
                    score: 25,
                    max: 25,
                    finding: "🔥 EXPLOSIVE revenue growth (94%+)"
                },
                profitability: {
                    score: 20,
                    max: 20,
                    finding: "💎 ELITE margins (55% net margin)"
                },
                eps_growth: {
                    score: 30,
                    max: 30,
                    finding: "🚀 MONSTER EPS growth (111%)"
                },
                cash_flow: {
                    score: 15,
                    max: 15,
                    finding: "💵 EXCEPTIONAL cash generation (48% FCF margin)"
                },
                balance_sheet: {
                    score: 8,
                    max: 10,
                    finding: "🏦 FORTRESS balance sheet ($28.8B net cash)"
                }
            },
            
            key_findings: [
                "🚀 EXPLOSIVE EPS growth of 111%",
                "🔥 Revenue growing 94% YoY",
                "💎 Premium margins (75% gross, 55% net)",
                "🏦 Fortress balance sheet ($28.8B net cash)",
                "💵 48% free cash flow margin",
                "⚠️ Premium valuation (P/E 39) but PEG 0.35 suggests still undervalued"
            ]
        },
        
        // FUNDAMENTAL SUMMARY
        fundamental_summary: {
            overall_rating: "EXCEPTIONAL",
            confidence: 95,
            
            recommendation: "STRONG BUY - Elite growth company with fortress financials",
            risk_level: "MODERATE",
            risk_factors: [
                "High valuation multiples (P/E 39)",
                "Cyclical semiconductor industry",
                "Heavy AI exposure (concentrated bet)"
            ]
        }
    },
    
    // ==================== NEWS ANALYSIS ====================
    
    news: {
        // Asset-Specific News
        asset_news: {
            total_articles: 18,
            timeframe_hours: 48,
            
            sentiment_score: 72,           // 0-100 (bearish to bullish)
            sentiment: "BULLISH",
            impact: "MEDIUM",
            
            top_headlines: [
                {
                    title: "NVIDIA announces new AI chip breakthrough",
                    source: "Reuters",
                    published: "2025-12-30T10:15:00Z",
                    age_hours: 4,
                    sentiment: "VERY_BULLISH",
                    impact: "HIGH",
                    summary: "New Blackwell Ultra chips show 40% performance improvement"
                },
                {
                    title: "Major cloud providers increase NVIDIA orders",
                    source: "Bloomberg",
                    published: "2025-12-29T16:30:00Z",
                    age_hours: 22,
                    sentiment: "BULLISH",
                    impact: "MEDIUM",
                    summary: "AWS, Azure, GCP expanding AI infrastructure"
                },
                {
                    title: "Analyst raises price target to $600",
                    source: "CNBC",
                    published: "2025-12-29T09:00:00Z",
                    age_hours: 29,
                    sentiment: "BULLISH",
                    impact: "MEDIUM",
                    summary: "JPMorgan maintains overweight rating"
                }
            ],
            
            ai_summary: "Predominantly positive news flow. New product announcements and strong demand signals from cloud providers. Analyst community remains bullish."
        },
        
        // Global Market News
        global_news: {
            total_articles: 35,
            timeframe_hours: 48,
            
            sentiment_score: 58,           // Slightly positive
            sentiment: "NEUTRAL_TO_POSITIVE",
            impact: "MEDIUM",
            
            key_themes: [
                "Fed interest rate policy - holding steady",
                "Tech sector showing strength",
                "AI investment boom continues",
                "Some profit-taking in mega-caps",
                "Year-end portfolio rebalancing"
            ],
            
            market_moving_news: [
                {
                    headline: "Fed maintains rates, signals data-dependent approach",
                    impact: "POSITIVE",
                    relevance_to_tech: "HIGH"
                },
                {
                    headline: "Q4 GDP beats expectations",
                    impact: "POSITIVE",
                    relevance_to_tech: "MEDIUM"
                }
            ],
            
            ai_summary: "Macro backdrop favorable for tech. Fed on hold, economy strong, AI theme intact."
        },
        
        // NEWS SUMMARY
        news_summary: {
            overall_sentiment: "BULLISH",
            confidence: 75,
            catalyst_present: true,
            catalyst_type: "PRODUCT_ANNOUNCEMENT",
            
            recommendation: "News flow supportive of upside. New product cycle positive catalyst."
        }
    }
};

// ============================================================================
// STEP 3: WORKFLOW - How Market Context is REUSED for Multiple Assets
// ============================================================================

/*
IMPORTANT ARCHITECTURAL CONCEPT:

1. MARKET CONTEXT (Part 1) = GLOBAL FOR ALL ASSETS
   - Fetch ONCE per hour (cached)
   - VIX, Fear & Greed, AAII sentiment don't change per stock
   - Same sentiment applies to NVDA, AAPL, MSFT, TSLA, etc.
   
2. ASSET ANALYSIS (Part 2) = SPECIFIC PER ASSET
   - Each stock gets its own technical/fundamental analysis
   - NVDA has different price, RSI, EPS than AAPL
   
WORKFLOW EXAMPLE:
┌─────────────────────────────────────────────────────────────────────┐
│ 14:30 - User clicks "Refresh Sentiment" button                     │
│         → Fetch VIX, Fear & Greed, AAII                             │
│         → Cache result for 60 minutes                               │
│         → PART1_SENTIMENT_OUTPUT stored in Redis/Memory             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 14:35 - User analyzes NVDA                                          │
│         → Load cached PART1_SENTIMENT_OUTPUT (no new API calls!)    │
│         → Fetch NVDA-specific data (price, financials, news)        │
│         → Combine: market_context + nvda_analysis → AI decision     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 14:40 - User analyzes AAPL                                          │
│         → Load cached PART1_SENTIMENT_OUTPUT (still valid!)         │
│         → Fetch AAPL-specific data                                  │
│         → Combine: market_context + aapl_analysis → AI decision     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 14:45 - User analyzes TSLA                                          │
│         → Load cached PART1_SENTIMENT_OUTPUT (still valid!)         │
│         → Fetch TSLA-specific data                                  │
│         → Combine: market_context + tsla_analysis → AI decision     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 15:31 - Cache expires (60 minutes later)                            │
│         → Next analysis will refresh market sentiment               │
└─────────────────────────────────────────────────────────────────────┘

EFFICIENCY GAIN:
- Without caching: Analyzing 10 stocks = 10 VIX calls + 10 Fear/Greed calls
- With caching: Analyzing 10 stocks = 1 VIX call + 1 Fear/Greed call
- Saves 90% of sentiment API calls!
*/

// ============================================================================
// STEP 3: COMBINED COMPREHENSIVE AI INPUT (PER ASSET)
// ============================================================================

const COMPREHENSIVE_AI_INPUT = {
    analysis_id: "NVDA_20251230_143500",
    timestamp: "2025-12-30T14:35:00Z",
    
    // PART 1: Market Sentiment Context (GLOBAL - CACHED - REUSED FOR ALL STOCKS)
    market_context: PART1_SENTIMENT_OUTPUT,  // ✅ Fetched once, reused for NVDA, AAPL, TSLA, etc.
    
    // PART 2: Asset Analysis (ASSET-SPECIFIC - FRESH FOR EACH STOCK)
    asset_analysis: PART2_ANALYSIS_OUTPUT,   // ❌ Unique to NVDA only
    
    // PORTFOLIO CONTEXT
    portfolio: {
        total_budget: 100000,
        available_cash: 65000,
        invested_amount: 35000,
        cash_percentage: 65,
        
        current_positions: [
            {
                ticker: "MSFT",
                quantity: 50,
                entry_price: 380.00,
                current_price: 385.50,
                position_value: 19275,
                unrealized_pnl: 275,
                unrealized_pnl_pct: 1.45,
                days_held: 15
            },
            {
                ticker: "AAPL",
                quantity: 85,
                entry_price: 185.00,
                current_price: 187.20,
                position_value: 15912,
                unrealized_pnl: 187,
                unrealized_pnl_pct: 1.19,
                days_held: 8
            }
        ],
        
        risk_parameters: {
            max_position_size_pct: 10,          // Max 10% per position
            max_position_size_usd: 10000,       // Max $10k per position
            max_risk_per_trade_pct: 2,          // Risk max 2% of portfolio
            max_total_exposure_pct: 80,         // Max 80% invested
            current_exposure_pct: 35,           // Currently 35% invested
            available_for_new_positions: 45     // Can add 45% more
        },
        
        performance: {
            total_return_pct: 1.32,
            realized_pnl: 0,
            unrealized_pnl: 462,
            win_rate: 0,                        // No closed trades yet
            sharpe_ratio: null
        }
    },
    
    // TRADING CONSTRAINTS
    constraints: {
        trading_hours: "OPEN",                  // Market is open
        day_trades_remaining: 3,
        daily_loss_limit_reached: false,
        max_daily_trades: 10,
        trades_today: 1
    }
};

// ============================================================================
// STEP 4: AI PROMPT (What GPT-4 Receives)
// ============================================================================

const AI_PROMPT_TEMPLATE = `
You are an elite quantitative hedge fund trading system with 20 years of market experience.

# MARKET CONTEXT (Sentiment Analysis)
VIX: ${COMPREHENSIVE_AI_INPUT.market_context.vix.current_value} (${COMPREHENSIVE_AI_INPUT.market_context.vix.interpretation})
Fear & Greed: ${COMPREHENSIVE_AI_INPUT.market_context.fear_greed.current_value}/100 (${COMPREHENSIVE_AI_INPUT.market_context.fear_greed.interpretation})
AAII Sentiment: Bull ${COMPREHENSIVE_AI_INPUT.market_context.aaii.current_readings.bullish_percent}% / Bear ${COMPREHENSIVE_AI_INPUT.market_context.aaii.current_readings.bearish_percent}%
Composite Market Mood: ${COMPREHENSIVE_AI_INPUT.market_context.composite.market_mood}

# ASSET ANALYSIS: ${COMPREHENSIVE_AI_INPUT.asset_analysis.ticker}
Current Price: $${COMPREHENSIVE_AI_INPUT.asset_analysis.current_price}
Sector: ${COMPREHENSIVE_AI_INPUT.asset_analysis.sector}

## Technical Analysis (Score: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.technical_summary.confidence}/100)
- Trend: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.trend.overall_trend} (Score: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.trend.trend_score})
- Momentum: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.momentum.overall_momentum} (RSI: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.momentum.rsi.value})
- Volume: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.volume.overall_volume} (OBV: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.volume.obv.trend})
- MACD: ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.trend.macd.crossover} crossover ${COMPREHENSIVE_AI_INPUT.asset_analysis.technical.trend.macd.crossover_bars_ago} bars ago

## Fundamental Analysis (Growth Score: ${COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.growth_score.total_score}/100)
- Revenue Growth: ${(COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.financials.revenue_growth_yoy * 100).toFixed(1)}% YoY
- EPS Growth: ${(COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.financials.eps_growth_yoy * 100).toFixed(1)}% YoY
- Net Margin: ${(COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.financials.net_margin * 100).toFixed(1)}%
- CAN SLIM Score: ${COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.canslim.total_score}/100 (${COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.canslim.rating})
- Valuation: P/E ${COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.valuation.pe_ratio}, PEG ${COMPREHENSIVE_AI_INPUT.asset_analysis.fundamental.valuation.peg_ratio}

## News Sentiment
- Asset News: ${COMPREHENSIVE_AI_INPUT.asset_analysis.news.asset_news.sentiment} (Score: ${COMPREHENSIVE_AI_INPUT.asset_analysis.news.asset_news.sentiment_score}/100)
- Global News: ${COMPREHENSIVE_AI_INPUT.asset_analysis.news.global_news.sentiment}
- Recent Catalyst: ${COMPREHENSIVE_AI_INPUT.asset_analysis.news.news_summary.catalyst_present ? COMPREHENSIVE_AI_INPUT.asset_analysis.news.news_summary.catalyst_type : 'None'}

# PORTFOLIO STATUS
Total Capital: $${COMPREHENSIVE_AI_INPUT.portfolio.total_budget.toLocaleString()}
Available Cash: $${COMPREHENSIVE_AI_INPUT.portfolio.available_cash.toLocaleString()} (${COMPREHENSIVE_AI_INPUT.portfolio.cash_percentage}%)
Current Positions: ${COMPREHENSIVE_AI_INPUT.portfolio.current_positions.length} (${COMPREHENSIVE_AI_INPUT.portfolio.risk_parameters.current_exposure_pct}% invested)
Max Position Size: $${COMPREHENSIVE_AI_INPUT.portfolio.risk_parameters.max_position_size_usd.toLocaleString()}
Max Risk Per Trade: ${COMPREHENSIVE_AI_INPUT.portfolio.risk_parameters.max_risk_per_trade_pct}%

# YOUR TASK
Analyze ALL the data above and provide a trading decision for ${COMPREHENSIVE_AI_INPUT.asset_analysis.ticker}.

Return a JSON object with this EXACT structure:
{
  "decision": {
    "action": "BUY" | "SELL" | "HOLD",
    "confidence": 0-100,
    "quantity": number of shares,
    "entry_price": proposed entry,
    "stop_loss": stop loss price,
    "take_profit": take profit target,
    "position_size_usd": dollar amount
  },
  "reasoning": {
    "primary_factors": ["array", "of", "main", "reasons"],
    "supporting_factors": ["array", "of", "supporting", "reasons"],
    "risk_factors": ["array", "of", "risks"],
    "summary": "one paragraph summary"
  },
  "risk_assessment": {
    "risk_level": "LOW" | "MEDIUM" | "HIGH",
    "max_loss_pct": percentage,
    "reward_risk_ratio": ratio
  },
  "alternative_scenarios": {
    "if_price_drops_5pct": "action plan",
    "if_price_rises_5pct": "action plan"
  }
}

Be analytical, precise, and consider ALL factors including sentiment, technicals, fundamentals, news, and portfolio constraints.
`;

console.log("=== COMPREHENSIVE AI INPUT READY ===");
console.log(JSON.stringify(COMPREHENSIVE_AI_INPUT, null, 2));
console.log("\n=== AI PROMPT ===");
console.log(AI_PROMPT_TEMPLATE);
```

---

## 3.11 Complete Input/Output Examples with Real Data

### Example 1: RAW API RESPONSES → PROCESSED DATA → AI INPUT

```javascript
// ============================================================================
// RAW API RESPONSE #1: VIX from Financial Modeling Prep
// ============================================================================

// API Call: GET https://financialmodelingprep.com/api/v3/quote/%5EVIX?apikey=xxx
const VIX_RAW_API_RESPONSE = [
    {
        "symbol": "^VIX",
        "name": "CBOE Volatility Index",
        "price": 18.5,
        "changesPercentage": -2.63,
        "change": -0.5,
        "dayLow": 18.2,
        "dayHigh": 19.1,
        "yearHigh": 45.2,
        "yearLow": 12.3,
        "marketCap": null,
        "priceAvg50": 17.8,
        "priceAvg200": 19.2,
        "volume": 0,
        "avgVolume": 0,
        "exchange": "CBOE",
        "open": 19.0,
        "previousClose": 19.0,
        "eps": null,
        "pe": null,
        "timestamp": 1735574400
    }
];

// PROCESSED FOR OUR SYSTEM
const VIX_PROCESSED = {
    current_value: 18.5,
    previous_close: 19.0,
    change: -0.5,
    change_percent: -2.63,
    interpretation: "NEUTRAL",  // Our logic: 12-20 = NEUTRAL
    zone: "Normal volatility (12-20 range)",
    signal: "NEUTRAL",
    signal_strength: 50,
    recommendation: "Normal market conditions - no special precautions needed"
};

// ============================================================================
// RAW API RESPONSE #2: Fear & Greed Index (Web Scraping/API)
// ============================================================================

// API Call: Scraped from CNN or alternative API
const FEAR_GREED_RAW_API_RESPONSE = {
    "name": "Fear and Greed Index",
    "value": 35,
    "valueText": "Fear",
    "description": "Based on 7 indicators",
    "timestamp": 1735574400,
    "components": {
        "junkBondDemand": 40,
        "marketMomentum": 40,
        "marketVolatility": 25,
        "putCallRatio": 45,
        "stockPriceBreadth": 35,
        "stockPriceStrength": 30,
        "safeHavenDemand": 35
    }
};

// PROCESSED FOR OUR SYSTEM
const FEAR_GREED_PROCESSED = {
    current_value: 35,
    previous_value: 32,
    change: 3,
    interpretation: "FEAR",
    zone: "Fear zone (25-45 range)",
    signal: "LEAN_BUY",  // Contrarian signal
    signal_strength: 65,
    components: {
        market_momentum: { value: 40, weight: 14.3 },
        stock_strength: { value: 30, weight: 14.3 },
        stock_breadth: { value: 35, weight: 14.3 },
        put_call_ratio: { value: 45, weight: 14.3 },
        market_volatility: { value: 25, weight: 14.3 },
        safe_haven: { value: 35, weight: 14.3 },
        junk_bond_demand: { value: 40, weight: 14.3 }
    },
    recommendation: "Market showing fear - contrarian buying opportunity"
};

// ============================================================================
// RAW API RESPONSE #3: Historical Price Data for NVDA
// ============================================================================

// API Call: GET https://financialmodelingprep.com/api/v3/historical-chart/1day/NVDA?apikey=xxx
const NVDA_PRICE_RAW_API_RESPONSE = [
    // Last 5 days only (actual API returns 5000+ days)
    { "date": "2025-12-30 15:30:00", "open": 490.50, "high": 498.20, "low": 489.10, "close": 495.50, "volume": 52500000 },
    { "date": "2025-12-27 16:00:00", "open": 485.20, "high": 492.80, "low": 484.50, "close": 491.20, "volume": 48200000 },
    { "date": "2025-12-26 16:00:00", "open": 482.10, "high": 487.50, "low": 480.20, "close": 485.30, "volume": 41800000 },
    { "date": "2025-12-24 13:00:00", "open": 480.00, "high": 483.20, "low": 478.50, "close": 482.10, "volume": 28500000 },
    { "date": "2025-12-23 16:00:00", "open": 478.30, "high": 481.90, "low": 476.20, "close": 479.50, "volume": 45600000 }
    // ... 360 more days for 1-year data
];

// PROCESSED - CALCULATE RSI
const closes = NVDA_PRICE_RAW_API_RESPONSE.map(d => d.close).reverse();
const rsi = RSI.calculate({ values: closes, period: 14 }); // Returns [51.2, 55.8, ..., 62.5]

const RSI_PROCESSED = {
    value: 62.5,  // Latest RSI
    previous_value: 58.2,
    zone: "NEUTRAL",  // 30-70 range
    direction: "RISING",
    divergence: { detected: false, type: null },
    interpretation: "Healthy momentum - room to run before overbought"
};

// ============================================================================
// RAW API RESPONSE #4: Financial Statements for NVDA
// ============================================================================

// API Call: GET https://financialmodelingprep.com/api/v3/income-statement/NVDA?limit=8&apikey=xxx
const NVDA_FINANCIALS_RAW_API_RESPONSE = [
    {
        "date": "2024-10-31",  // Q3 2024
        "symbol": "NVDA",
        "reportedCurrency": "USD",
        "cik": "0001045810",
        "fillingDate": "2024-11-20",
        "acceptedDate": "2024-11-20 16:05:32",
        "calendarYear": "2024",
        "period": "Q3",
        "revenue": 35082000000,
        "costOfRevenue": 8817000000,
        "grossProfit": 26265000000,
        "grossProfitRatio": 0.74867,
        "researchAndDevelopmentExpenses": 3129000000,
        "generalAndAdministrativeExpenses": 1264000000,
        "sellingAndMarketingExpenses": 0,
        "operatingExpenses": 4393000000,
        "operatingIncome": 21872000000,
        "operatingIncomeRatio": 0.62336,
        "totalOtherIncomeExpensesNet": 0,
        "incomeBeforeTax": 21872000000,
        "incomeBeforeTaxRatio": 0.62336,
        "incomeTaxExpense": 2563000000,
        "netIncome": 19309000000,
        "netIncomeRatio": 0.55037,
        "eps": 7.84,
        "epsdiluted": 7.81,
        "weightedAverageShsOut": 2462000000,
        "weightedAverageShsOutDil": 2472000000
    },
    {
        "date": "2023-10-31",  // Q3 2023 (same quarter last year)
        "symbol": "NVDA",
        "revenue": 18120000000,
        "netIncome": 9243000000,
        "eps": 3.71,
        "epsdiluted": 3.68
        // ... more fields
    }
    // ... 6 more quarters
];

// PROCESSED - CALCULATE GROWTH RATES
const current_q = NVDA_FINANCIALS_RAW_API_RESPONSE[0];
const year_ago_q = NVDA_FINANCIALS_RAW_API_RESPONSE[4];

const FINANCIALS_PROCESSED = {
    revenue: 35082000000,
    revenue_growth_yoy: (35082000000 - 18120000000) / 18120000000, // = 0.94 (94%!)
    revenue_growth_qoq: 0.17,
    
    gross_margin: 0.749,
    operating_margin: 0.623,
    net_margin: 0.550,
    
    eps: 7.84,
    eps_growth_yoy: (7.84 - 3.71) / 3.71, // = 1.11 (111%!)
    eps_growth_qoq: 0.20,
    
    shares_outstanding: 2462000000
};

// ============================================================================
// RAW API RESPONSE #5: News for NVDA
// ============================================================================

// API Call: GET https://financialmodelingprep.com/api/v3/stock_news?tickers=NVDA&limit=20&apikey=xxx
const NVDA_NEWS_RAW_API_RESPONSE = [
    {
        "symbol": "NVDA",
        "publishedDate": "2025-12-30 10:15:00",
        "title": "NVIDIA announces new AI chip breakthrough with Blackwell Ultra",
        "image": "https://example.com/image.jpg",
        "site": "Reuters",
        "text": "NVIDIA Corporation today unveiled its next-generation Blackwell Ultra chips, showing a 40% performance improvement over previous models...",
        "url": "https://reuters.com/article/123"
    },
    {
        "symbol": "NVDA",
        "publishedDate": "2025-12-29 16:30:00",
        "title": "Major cloud providers increase NVIDIA orders for AI infrastructure",
        "image": "https://example.com/image2.jpg",
        "site": "Bloomberg",
        "text": "Amazon Web Services, Microsoft Azure, and Google Cloud are significantly expanding their orders of NVIDIA's H100 and upcoming Blackwell chips...",
        "url": "https://bloomberg.com/article/456"
    },
    {
        "symbol": "NVDA",
        "publishedDate": "2025-12-29 09:00:00",
        "title": "JPMorgan raises NVIDIA price target to $600, maintains overweight",
        "image": "https://example.com/image3.jpg",
        "site": "CNBC",
        "text": "JPMorgan analyst Harlan Sur raised the firm's price target on NVIDIA to $600 from $550, citing strong AI demand...",
        "url": "https://cnbc.com/article/789"
    }
];

// PROCESSED - AI SENTIMENT ANALYSIS (using OpenAI)
const NEWS_PROCESSED = {
    total_articles: 18,
    timeframe_hours: 48,
    sentiment_score: 72,  // 0-100 (AI analyzed all articles)
    sentiment: "BULLISH",
    impact: "MEDIUM",
    
    top_headlines: [
        {
            title: "NVIDIA announces new AI chip breakthrough",
            published: "2025-12-30T10:15:00Z",
            age_hours: 4,
            sentiment: "VERY_BULLISH",
            impact: "HIGH",
            summary: "New Blackwell Ultra chips show 40% performance improvement"
        },
        {
            title: "Major cloud providers increase NVIDIA orders",
            published: "2025-12-29T16:30:00Z",
            age_hours: 22,
            sentiment: "BULLISH",
            impact: "MEDIUM",
            summary: "AWS, Azure, GCP expanding AI infrastructure"
        }
    ],
    
    ai_summary: "Predominantly positive news flow. New product announcements and strong demand signals from cloud providers. Analyst community remains bullish."
};

// ============================================================================
// STEP 5: COMBINED AI INPUT (Everything Together)
// ============================================================================

const FINAL_AI_INPUT = {
    timestamp: "2025-12-30T14:35:00Z",
    
    // FROM PART 1 (Cached, Global)
    market_context: {
        vix: VIX_PROCESSED,
        fear_greed: FEAR_GREED_PROCESSED,
        aaii: { /* AAII data */ },
        composite: { score: 42, signal: "LEAN_BUY" }
    },
    
    // FROM PART 2 (Fresh, Asset-Specific)
    asset_analysis: {
        ticker: "NVDA",
        current_price: 495.50,
        
        technical: {
            trend: { /* MA, MACD, SAR data */ },
            momentum: { rsi: RSI_PROCESSED, /* Stochastic, CCI */ },
            volume: { /* OBV, A/D Line */ },
            volatility: { /* Bollinger, Keltner, ATR */ }
        },
        
        fundamental: {
            financials: FINANCIALS_PROCESSED,
            canslim: { total_score: 92, rating: "EXCEPTIONAL" },
            growth_score: { total_score: 98, rating: "🥇 EXCEPTIONAL" }
        },
        
        news: NEWS_PROCESSED
    },
    
    // Portfolio (DETAILED - AI needs to understand correlations!)
    portfolio: {
        total_budget: 100000,
        available_cash: 65000,
        invested_amount: 35000,
        
        // DETAILED CURRENT POSITIONS
        // Why detailed? AI needs to know:
        // 1. Sector exposure (both MSFT & NVDA = heavy tech)
        // 2. Correlation risk (NVDA & AMD move together)
        // 3. P&L context (is position underwater or winning?)
        // 4. Time held (short-term vs long-term capital gains)
        current_positions: [
            {
                ticker: "MSFT",
                company_name: "Microsoft Corporation",
                sector: "Technology",
                industry: "Software",
                
                quantity: 50,
                entry_price: 380.00,
                current_price: 385.50,
                entry_date: "2025-12-15",
                days_held: 15,
                
                position_value: 19275,          // 50 × $385.50
                cost_basis: 19000,              // 50 × $380.00
                unrealized_pnl: 275,
                unrealized_pnl_pct: 1.45,
                
                portfolio_weight_pct: 19.3,     // $19,275 / $100,000
                
                // Why this matters for NVDA decision:
                // - Already 19% in tech
                // - MSFT uses NVDA chips (correlated)
                // - Adding NVDA = 29% tech concentration
                correlation_notes: "MSFT is major NVDA customer (Azure AI)"
            },
            {
                ticker: "AAPL",
                company_name: "Apple Inc.",
                sector: "Technology",
                industry: "Consumer Electronics",
                
                quantity: 85,
                entry_price: 185.00,
                current_price: 187.20,
                entry_date: "2025-12-22",
                days_held: 8,
                
                position_value: 15912,          // 85 × $187.20
                cost_basis: 15725,              // 85 × $185.00
                unrealized_pnl: 187,
                unrealized_pnl_pct: 1.19,
                
                portfolio_weight_pct: 15.9,     // $15,912 / $100,000
                
                // Why this matters for NVDA decision:
                // - Another tech position
                // - Total tech = 35% before NVDA
                // - But AAPL less correlated (consumer vs enterprise)
                correlation_notes: "Lower correlation - consumer vs semiconductor"
            }
        ],
        
        // SECTOR EXPOSURE (Critical for AI decision!)
        sector_exposure: {
            Technology: {
                total_value: 35187,
                percentage: 35.2,
                tickers: ["MSFT", "AAPL"],
                note: "Already concentrated in tech"
            }
            // Other sectors: 0%
        },
        
        // RISK METRICS
        risk_parameters: {
            max_position_size_pct: 10,
            max_sector_exposure_pct: 50,        // Max 50% in one sector
            current_sector_exposure_pct: 35.2,  // Tech already at 35%
            remaining_sector_capacity_pct: 14.8 // Can add 14.8% more tech
        }
    }
};

// ============================================================================
// STEP 6: AI OUTPUT (What GPT-4 Returns)
// ============================================================================

const AI_OUTPUT_EXAMPLE = {
    "decision": {
        "action": "BUY",
        "confidence": 85,
        "quantity": 20,
        "entry_price": 495.50,
        "stop_loss": 467.00,     // Price - (2 × ATR)
        "take_profit": 538.50,    // Price + (3 × ATR)
        "position_size_usd": 9910
    },
    
    "reasoning": {
        "primary_factors": [
            "Exceptional growth fundamentals: 94% revenue growth, 111% EPS growth",
            "Strong technical setup: All MAs aligned bullishly, MACD bullish crossover",
            "Product catalyst: Blackwell Ultra announcement (40% performance boost)",
            "Market sentiment moderately supportive (Fear & Greed 35 = contrarian buy)"
        ],
        
        "supporting_factors": [
            "CAN SLIM score 92/100 - Elite candidate",
            "Growth score 98/100 - Exceptional metrics across all categories",
            "Healthy momentum: RSI 62.5 (room to run before overbought)",
            "Strong institutional accumulation: OBV and A/D Line rising",
            "Premium margins: 75% gross, 55% net (pricing power)",
            "Fortress balance sheet: $28.8B net cash"
        ],
        
        "risk_factors": [
            "Premium valuation: P/E 39.2 (but PEG 0.35 suggests undervalued)",
            "Stochastic approaching overbought (72) - watch for short-term pullback",
            "High concentration risk: Heavy AI exposure",
            "Market direction weak: CAN SLIM 'M' criterion failed"
        ],
        
        "summary": "NVDA presents a rare combination of exceptional growth (98/100 score), strong technical setup, and positive catalyst. The 94% revenue growth and 111% EPS growth are extraordinary. While valuation is premium (P/E 39), the PEG ratio of 0.35 indicates growth is not fully priced in. Technical indicators show bullish alignment with recent MACD crossover and healthy RSI. The Blackwell Ultra announcement provides near-term catalyst. Risk is moderate given the premium valuation and potential for profit-taking. Recommended position size of 20 shares (~$10k, 10% of portfolio) with tight stop at $467 (2×ATR) provides 2.2:1 reward-risk ratio."
    },
    
    "risk_assessment": {
        "risk_level": "MODERATE",
        "max_loss_pct": 5.8,      // (495.50 - 467.00) / 495.50
        "reward_risk_ratio": 2.2,  // (538.50 - 495.50) / (495.50 - 467.00)
        "portfolio_impact": {
            "position_weight_pct": 9.9,
            "risk_amount_usd": 570,    // 20 shares × $28.50 stop distance
            "risk_of_portfolio_pct": 0.57
        }
    },
    
    "alternative_scenarios": {
        "if_price_drops_5pct": "If price drops to $470 (-5%), re-evaluate. This would be near our stop loss ($467). If fundamentals remain intact and drop is market-driven, consider averaging down. If company-specific negative news, exit position.",
        
        "if_price_rises_5pct": "If price rises to $520 (+5%), move stop loss to breakeven ($495.50). Consider taking partial profits (50% of position) and let remainder run with trailing stop.",
        
        "if_volume_spike_down": "If unusual volume spike on down days, re-evaluate for distribution. Check for institutional selling.",
        
        "if_new_negative_catalyst": "If competitor announcement or regulatory headwind emerges, exit immediately regardless of technical levels."
    },
    
    "execution_plan": {
        "order_type": "LIMIT",
        "limit_price": 495.50,
        "time_in_force": "DAY",
        "notes": "Enter at current price or better. If not filled today, reassess tomorrow. Avoid chasing if price gaps up >2%."
    }
};

// ============================================================================
// STEP 7: USER SEES THIS IN DASHBOARD
// ============================================================================

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                        AI TRADING RECOMMENDATION                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🎯 DECISION: BUY NVDA                              Confidence: 85%       ║
║  📊 Quantity: 20 shares                             Value: $9,910         ║
║  💰 Entry: $495.50  |  🛑 Stop: $467.00  |  🎯 Target: $538.50           ║
║  📈 Risk/Reward: 1:2.2                              Risk: $570 (0.57%)    ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ✅ PRIMARY REASONS                                                       ║
║  • Exceptional growth: 94% revenue, 111% EPS                              ║
║  • Strong technicals: Bullish MA alignment, MACD crossover                ║
║  • Catalyst: Blackwell Ultra announcement                                 ║
║  • Market sentiment: Contrarian buy zone (Fear & Greed 35)                ║
║                                                                           ║
║  ⚠️  RISKS TO WATCH                                                       ║
║  • Premium P/E 39.2 (but PEG 0.35 undervalued)                            ║
║  • Stochastic approaching overbought                                      ║
║  • High AI concentration risk                                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);
```

### Example 2: Complete Request/Response Cycle

```javascript
// ============================================================================
// COMPLETE WORKFLOW: User Action → System Response
// ============================================================================

// USER ACTION #1: Clicks "Refresh Sentiment" button at 14:30
console.log("User clicked: Refresh Sentiment");

// SYSTEM RESPONSE #1: Fetch sentiment data
const sentimentRequests = [
    fetch('https://financialmodelingprep.com/api/v3/quote/%5EVIX?apikey=xxx'),
    fetch('https://cnn-fear-greed-api.com/v1/current'),
    fetch('https://aaii.com/api/sentiment/weekly')
];

const [vixData, fearGreedData, aaiiData] = await Promise.all(sentimentRequests);

// CACHE RESULT
cache.set('market_sentiment', {
    vix: { value: 18.5, signal: "NEUTRAL" },
    fear_greed: { value: 35, signal: "LEAN_BUY" },
    aaii: { bullish: 28.5, bearish: 38.2, signal: "NEUTRAL" },
    composite: { score: 42, signal: "LEAN_BUY" }
}, 3600); // 1 hour TTL

console.log("✅ Sentiment cached for 60 minutes");

// ────────────────────────────────────────────────────────────────────────────

// USER ACTION #2: Selects NVDA, Daily timeframe, clicks "Analyze" at 14:35
console.log("User analyzing: NVDA (1d timeframe)");

// SYSTEM RESPONSE #2: Load cached sentiment + fetch NVDA data
const cachedSentiment = cache.get('market_sentiment'); // ✅ No API call needed!

const nvdaRequests = [
    fetch('https://financialmodelingprep.com/api/v3/historical-chart/1day/NVDA?apikey=xxx'),
    fetch('https://financialmodelingprep.com/api/v3/income-statement/NVDA?limit=8&apikey=xxx'),
    fetch('https://financialmodelingprep.com/api/v3/balance-sheet-statement/NVDA?limit=4&apikey=xxx'),
    fetch('https://financialmodelingprep.com/api/v3/stock_news?tickers=NVDA&limit=20&apikey=xxx')
];

const [priceData, financials, balanceSheet, news] = await Promise.all(nvdaRequests);

// CALCULATE INDICATORS
const rsi = calculateRSI(priceData);
const macd = calculateMACD(priceData);
const obv = calculateOBV(priceData);
// ... all other indicators

// SEND TO AI
const aiResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
        role: "user",
        content: buildPrompt(cachedSentiment, nvdaAnalysis, portfolio)
    }],
    response_format: { type: "json_object" }
});

console.log("✅ AI Decision:", aiResponse.decision.action, aiResponse.decision.confidence + "%");

// ────────────────────────────────────────────────────────────────────────────

// USER ACTION #3: Analyzes AAPL at 14:40 (5 minutes later)
console.log("User analyzing: AAPL (1d timeframe)");

// SYSTEM RESPONSE #3: Reuse cached sentiment!
const stillCachedSentiment = cache.get('market_sentiment'); // ✅ Still valid!

const aaplRequests = [
    fetch('https://financialmodelingprep.com/api/v3/historical-chart/1day/AAPL?apikey=xxx'),
    fetch('https://financialmodelingprep.com/api/v3/income-statement/AAPL?limit=8&apikey=xxx'),
    // ... AAPL-specific data only
];

// VIX, Fear & Greed, AAII not fetched again! Saved 3 API calls.
console.log("✅ Reusing cached sentiment (55 minutes remaining)");
```

#### 3.10 AI Prompt Structure
```javascript
// Comprehensive AI Input Schema
const AI_INPUT_SCHEMA = {
    // Part 1: Market Sentiment
    market_sentiment: {
        vix: { value: 0, signal: '', confidence: 0 },
        fear_greed: { value: 0, signal: '', confidence: 0 },
        aaii: { bullish: 0, bearish: 0, spread: 0, signal: '', confidence: 0 },
        composite_sentiment: { score: 0, signal: '' }
    },
    
    // Part 2: Asset Analysis
    asset_analysis: {
        ticker: '',
        current_price: 0,
        timeframe: '',
        
        // Trend Indicators
        trend: {
            ma_alignment: '', // 'bullish' | 'bearish' | 'mixed'
            macd: { value: 0, signal: '', histogram: 0, crossover: '' },
            parabolic_sar: { value: 0, trend: '' }
        },
        
        // Momentum
        momentum: {
            rsi: { value: 0, zone: '', divergence: false },
            stochastic: { k: 0, d: 0, signal: '' },
            cci: { value: 0, zone: '' }
        },
        
        // Volume
        volume: {
            obv_trend: '',
            ad_line_trend: '',
            volume_vs_average: 0,
            interpretation: ''
        },
        
        // Volatility
        volatility: {
            bollinger: { position: '', bandwidth: 0, squeeze: false },
            keltner: { position: '' },
            atr: { value: 0, percentage: 0 }
        },
        
        // Fundamentals
        canslim: {
            total_score: 0,
            max_score: 100,
            criteria_passed: [],
            criteria_failed: []
        },
        
        // News
        news: {
            asset_sentiment: { score: 0, signal: '' },
            global_sentiment: { score: 0, signal: '' },
            key_headlines: []
        }
    },
    
    // Portfolio Context
    portfolio: {
        total_budget: 0,
        available_cash: 0,
        current_positions: [],
        max_position_size_pct: 0,
        risk_tolerance: '' // 'conservative' | 'moderate' | 'aggressive'
    }
};

// AI Output Schema
const AI_OUTPUT_SCHEMA = {
    decision: {
        action: 'BUY' | 'SELL' | 'HOLD',
        confidence: 0, // 0-100
        quantity: 0,
        entry_price: 0,
        stop_loss: 0,
        take_profit: 0,
        position_size_usd: 0
    },
    reasoning: {
        primary_factors: [],
        supporting_factors: [],
        risk_factors: [],
        summary: ''
    },
    risk_assessment: {
        risk_level: 'LOW' | 'MEDIUM' | 'HIGH',
        max_loss_pct: 0,
        reward_risk_ratio: 0
    }
};
```

---

### PART 4: Portfolio Management

#### 3.10 Portfolio & Position Management
```javascript
// Portfolio Configuration
const PORTFOLIO_CONFIG = {
    initial_budget: 100000, // $100,000 starting capital
    max_position_pct: 10, // Max 10% per position
    max_total_exposure: 80, // Max 80% invested at any time
    reserve_cash_pct: 20, // Always keep 20% cash
    
    position_sizing: {
        method: 'risk_based', // 'fixed' | 'risk_based' | 'kelly'
        max_risk_per_trade_pct: 2, // Risk max 2% of portfolio per trade
        atr_multiplier_for_stop: 2
    }
};

// Position Tracking
const POSITION_SCHEMA = {
    ticker: '',
    type: 'LONG' | 'SHORT',
    quantity: 0,
    entry_price: 0,
    entry_date: '',
    current_price: 0,
    unrealized_pnl: 0,
    unrealized_pnl_pct: 0,
    stop_loss: 0,
    take_profit: 0,
    position_value: 0,
    portfolio_weight_pct: 0
};
```

---

## 4. API Endpoints & Data Sources

### 4.1 Required API Keys
```bash
# .env file configuration
# Market Data
FMP_API_KEY=xxx              # Financial Modeling Prep (financialmodelingprep.com)
POLYGON_API_KEY=xxx          # Polygon.io for real-time data
ALPHA_VANTAGE_KEY=xxx        # Alpha Vantage (backup source)

# News & Sentiment
NEWSAPI_KEY=xxx              # NewsAPI.org for news aggregation

# AI
OPENAI_API_KEY=xxx           # OpenAI GPT-4

# Execution
IB_HOST=127.0.0.1
IB_PORT=7497                 # 7497=Paper, 7496=Live
IB_CLIENT_ID=1

# Cache
REDIS_URL=redis://localhost:6379  # Optional: Redis for caching
```

### 4.2 Data Source Endpoints & Financial Data Support

```javascript
const API_ENDPOINTS = {
    // Financial Modeling Prep (PRIMARY SOURCE - Has EVERYTHING!)
    // ✅ Market Data ✅ Financials ✅ News ✅ Sentiment
    fmp: {
        base: 'https://financialmodelingprep.com/api/v3',
        
        // Market Data
        historical: '/historical-chart/{interval}/{symbol}',
        quote: '/quote/{symbol}',
        
        // FINANCIAL STATEMENTS (Annual & Quarterly)
        income_statement: '/income-statement/{symbol}',              // Revenue, EPS, Net Income
        balance_sheet: '/balance-sheet-statement/{symbol}',          // Assets, Debt, Equity
        cash_flow: '/cash-flow-statement/{symbol}',                  // Operating CF, Free CF
        
        // FINANCIAL METRICS & RATIOS
        key_metrics: '/key-metrics/{symbol}',                        // P/E, ROE, ROA, etc.
        financial_ratios: '/ratios/{symbol}',                        // All profitability ratios
        enterprise_value: '/enterprise-values/{symbol}',             // EV, EV/EBITDA
        financial_growth: '/financial-growth/{symbol}',              // Growth rates
        
        // COMPANY PROFILE & FUNDAMENTALS
        profile: '/profile/{symbol}',                                // Industry, sector, market cap
        rating: '/rating/{symbol}',                                  // DCF valuation, rating
        dcf: '/discounted-cash-flow/{symbol}',                       // Intrinsic value
        
        // EARNINGS & ESTIMATES
        earnings_calendar: '/historical/earning_calendar/{symbol}',  // Earnings dates
        earnings_surprises: '/earnings-surprises/{symbol}',          // Beat/miss history
        analyst_estimates: '/analyst-estimates/{symbol}',            // Consensus estimates
        
        // INSIDER TRADING & INSTITUTIONAL
        insider_trading: '/insider-trading',                         // Insider buys/sells
        institutional_holders: '/institutional-holder/{symbol}',     // Who owns the stock
        
        // SENTIMENT & NEWS
        news: '/stock_news',
        vix: '/quote/%5EVIX',
        fear_greed: '/fear-greed-index',
        
        // SCREENER
        stock_screener: '/stock-screener'                            // Find stocks by criteria
    },
    
    // Polygon.io (Market Data & News ONLY - NO FINANCIALS!)
    // ⚠️ Use for real-time data, NOT for fundamental analysis
    polygon: {
        base: 'https://api.polygon.io',
        aggregates: '/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from}/{to}',
        news: '/v2/reference/news',
        // ❌ NO FINANCIAL STATEMENTS
        // ❌ NO BALANCE SHEET
        // ❌ NO INCOME STATEMENT
    },
    
    // Alpha Vantage (BACKUP for fundamentals)
    alpha_vantage: {
        base: 'https://www.alphavantage.co/query',
        income_statement: '?function=INCOME_STATEMENT',
        balance_sheet: '?function=BALANCE_SHEET',
        cash_flow: '?function=CASH_FLOW',
        overview: '?function=OVERVIEW'
    },
    
    // NewsAPI (General News)
    newsapi: {
        base: 'https://newsapi.org/v2',
        everything: '/everything',
        headlines: '/top-headlines'
    }
};
```

### 4.3 Complete Financial Analysis System

#### 4.3.1 Financial Data Structure
```javascript
// Complete financial profile for a stock
const FINANCIAL_DATA_SCHEMA = {
    // BASIC INFO
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    market_cap: 3000000000000,
    
    // INCOME STATEMENT (Quarterly & Annual)
    income_statement: {
        revenue: 394328000000,              // Total sales
        revenue_growth_yoy: 0.0822,         // 8.22% growth YoY
        cost_of_goods_sold: 214137000000,
        gross_profit: 180191000000,
        gross_margin: 0.457,                // 45.7%
        
        operating_expenses: 55013000000,
        operating_income: 125178000000,
        operating_margin: 0.317,            // 31.7%
        
        interest_expense: 3933000000,
        pretax_income: 123456000000,
        income_tax: 19300000000,
        tax_rate: 0.156,                    // 15.6%
        
        net_income: 100913000000,
        net_margin: 0.256,                  // 25.6%
        
        eps: 6.42,                          // Earnings Per Share
        eps_diluted: 6.38,
        eps_growth_yoy: 0.137,              // 13.7% EPS growth
        
        shares_outstanding: 15728700000,
        weighted_avg_shares: 15812500000
    },
    
    // BALANCE SHEET
    balance_sheet: {
        // Assets
        total_assets: 352755000000,
        cash_and_equivalents: 29965000000,
        short_term_investments: 31590000000,
        total_current_assets: 143566000000,
        
        property_plant_equipment: 43715000000,
        goodwill: 0,
        intangible_assets: 0,
        
        // Liabilities
        total_liabilities: 290437000000,
        current_liabilities: 145308000000,
        short_term_debt: 11128000000,
        long_term_debt: 98959000000,
        total_debt: 110087000000,
        
        // Equity
        total_equity: 62318000000,
        retained_earnings: 5562000000,
        
        // Ratios
        current_ratio: 0.99,                // Current Assets / Current Liabilities
        quick_ratio: 0.82,                  // (Current Assets - Inventory) / Current Liabilities
        debt_to_equity: 1.77,               // Total Debt / Total Equity
        debt_to_assets: 0.31                // Total Debt / Total Assets
    },
    
    // CASH FLOW STATEMENT
    cash_flow: {
        operating_cash_flow: 118254000000,  // Cash from operations
        capital_expenditures: -10959000000,
        free_cash_flow: 107295000000,       // OCF - CapEx (MOST IMPORTANT!)
        free_cash_flow_margin: 0.272,       // 27.2% of revenue
        
        dividends_paid: -14996000000,
        share_buybacks: -77550000000,       // Stock repurchases
        
        investing_cash_flow: -3705000000,
        financing_cash_flow: -103510000000,
        
        net_change_in_cash: 10839000000
    },
    
    // KEY FINANCIAL METRICS
    metrics: {
        // Profitability
        return_on_equity: 1.62,             // 162% ROE (Net Income / Equity)
        return_on_assets: 0.286,            // 28.6% ROA
        return_on_invested_capital: 0.518,  // 51.8% ROIC
        
        // Efficiency
        asset_turnover: 1.12,               // Revenue / Total Assets
        inventory_turnover: 38.5,           // COGS / Inventory
        receivables_turnover: 14.2,
        
        // Valuation
        pe_ratio: 31.2,                     // Price / Earnings
        price_to_book: 48.1,                // Price / Book Value
        price_to_sales: 7.6,                // Market Cap / Revenue
        ev_to_ebitda: 24.8,                 // Enterprise Value / EBITDA
        peg_ratio: 2.3,                     // P/E / Growth Rate
        
        // Growth
        revenue_growth_3yr: 0.089,          // 8.9% CAGR
        revenue_growth_5yr: 0.112,          // 11.2% CAGR
        eps_growth_3yr: 0.145,              // 14.5% CAGR
        eps_growth_5yr: 0.178,              // 17.8% CAGR
        
        // Dividend (if applicable)
        dividend_yield: 0.0045,             // 0.45%
        dividend_payout_ratio: 0.149,       // 14.9% of earnings
        
        // Quality
        altman_z_score: 3.5,                // >2.6 = Safe
        piotroski_f_score: 8                // Max 9 = Excellent
    }
};
```

#### 4.3.2 Growth Company Identifier (Finding the Next Gold!)

```javascript
// CRITERIA FOR FINDING NEXT GROWTH WINNER
const GROWTH_COMPANY_CRITERIA = {
    // PHASE 1: Revenue Growth (Are sales accelerating?)
    revenue: {
        min_quarterly_growth_yoy: 0.20,     // 20%+ revenue growth
        min_annual_growth_3yr: 0.25,        // 25%+ 3-year CAGR
        accelerating: true,                 // Q4 > Q3 > Q2 growth rates
        weight: 25
    },
    
    // PHASE 2: Profitability (Are they making money?)
    profitability: {
        gross_margin_min: 0.40,             // 40%+ gross margin (high quality)
        operating_margin_min: 0.10,         // 10%+ operating margin
        net_margin_min: 0.05,               // 5%+ net margin (or improving)
        net_income_positive: true,          // Must be profitable
        margin_expanding: true,             // Margins improving YoY
        weight: 20
    },
    
    // PHASE 3: EPS Growth (The Golden Metric!)
    eps: {
        min_quarterly_growth_yoy: 0.25,     // 25%+ EPS growth (CAN SLIM "C")
        min_annual_growth_5yr: 0.25,        // 25%+ 5-year CAGR (CAN SLIM "A")
        last_4_quarters_all_positive: true, // Consistent beats
        accelerating: true,                 // EPS growth accelerating
        weight: 30                          // HIGHEST WEIGHT!
    },
    
    // PHASE 4: Cash Flow (Real money, not accounting tricks)
    cash_flow: {
        free_cash_flow_positive: true,      // Generating cash
        fcf_growth_yoy: 0.15,               // 15%+ FCF growth
        ocf_greater_than_net_income: true,  // Quality earnings
        fcf_margin_min: 0.15,               // 15%+ FCF margin
        weight: 15
    },
    
    // PHASE 5: Balance Sheet Health
    balance_sheet: {
        current_ratio_min: 1.5,             // Can pay short-term debts
        debt_to_equity_max: 0.5,            // Low debt (or none!)
        cash_greater_than_debt: true,       // Net cash position is ideal
        weight: 10
    }
};

// SCORING FUNCTION
function scoreGrowthPotential(financials) {
    let score = 0;
    let max_score = 100;
    let findings = [];
    
    // Revenue Score (25 points)
    if (financials.income_statement.revenue_growth_yoy >= 0.40) {
        score += 25;
        findings.push('🔥 EXPLOSIVE revenue growth (40%+)');
    } else if (financials.income_statement.revenue_growth_yoy >= 0.20) {
        score += 20;
        findings.push('✅ Strong revenue growth (20-40%)');
    } else if (financials.income_statement.revenue_growth_yoy >= 0.10) {
        score += 10;
        findings.push('⚠️ Moderate growth (10-20%)');
    }
    
    // Profitability Score (20 points)
    if (financials.income_statement.net_margin >= 0.20) {
        score += 20;
        findings.push('💰 Highly profitable (20%+ net margin)');
    } else if (financials.income_statement.net_margin >= 0.10) {
        score += 15;
        findings.push('✅ Profitable (10-20% margin)');
    } else if (financials.income_statement.net_margin > 0) {
        score += 8;
        findings.push('⚠️ Low profitability');
    }
    
    // EPS Score (30 points) - MOST IMPORTANT!
    if (financials.income_statement.eps_growth_yoy >= 0.50) {
        score += 30;
        findings.push('🚀 MONSTER EPS growth (50%+)');
    } else if (financials.income_statement.eps_growth_yoy >= 0.25) {
        score += 25;
        findings.push('🔥 Strong EPS growth (25-50%)');
    } else if (financials.income_statement.eps_growth_yoy >= 0.15) {
        score += 15;
        findings.push('✅ Decent EPS growth (15-25%)');
    }
    
    // Cash Flow Score (15 points)
    if (financials.cash_flow.free_cash_flow > 0 &&
        financials.cash_flow.free_cash_flow_margin >= 0.20) {
        score += 15;
        findings.push('💵 Excellent cash generation');
    } else if (financials.cash_flow.free_cash_flow > 0) {
        score += 10;
        findings.push('✅ Positive cash flow');
    }
    
    // Balance Sheet Score (10 points)
    if (financials.balance_sheet.cash_and_equivalents > 
        financials.balance_sheet.total_debt) {
        score += 10;
        findings.push('🏦 Net cash position (fortress balance sheet)');
    } else if (financials.balance_sheet.debt_to_equity < 0.5) {
        score += 7;
        findings.push('✅ Low debt levels');
    }
    
    return {
        score,
        max_score,
        percentage: (score / max_score * 100).toFixed(1),
        rating: getGrowthRating(score),
        findings
    };
}

function getGrowthRating(score) {
    if (score >= 85) return '🥇 EXCEPTIONAL - Next 10-bagger candidate';
    if (score >= 70) return '🥈 STRONG - High growth potential';
    if (score >= 55) return '🥉 GOOD - Solid growth story';
    if (score >= 40) return '⚠️ AVERAGE - Limited upside';
    return '❌ WEAK - Avoid';
}
```

#### 4.3.3 Example: AppLovin Corp Analysis (From Your Image)

```javascript
// Based on the financial data you shared
const APPLOVIN_EXAMPLE = {
    ticker: 'APP',
    company: 'AppLovin Corp.',
    
    // From Income Statement
    revenue_2024: 4.71,                     // $4.71B (43.44% growth!)
    revenue_growth: 0.4344,                 // 43.44% YoY - EXCELLENT
    
    gross_margin: 0.7365,                   // 73.65% - OUTSTANDING
    operating_margin: 0.4029,               // 40.29% - EXCEPTIONAL
    net_margin: 0.3349,                     // 33.49% - EXCELLENT
    
    eps_2024: 4.68,                         // $4.68
    eps_growth: 3.6413,                     // 364.13% - EXPLOSIVE! 🚀
    
    // From Balance Sheet
    current_ratio: 2.19,                    // Strong liquidity
    quick_ratio: 2.19,                      // Can easily pay bills
    
    // Valuation
    pe_ratio: 157.51,                       // High (but justified by growth?)
    
    // GROWTH SCORE CALCULATION
    growth_score: {
        revenue: 25,        // Max points (43% growth)
        profitability: 20,  // Max points (33% net margin)
        eps: 30,            // Max points (364% growth!)
        cash_flow: 15,      // Assume strong (need cash flow data)
        balance_sheet: 10,  // Max points (2.19 current ratio)
        
        total: 100,
        rating: '🥇 EXCEPTIONAL - This IS the next gold!'
    },
    
    findings: [
        '🚀 EXPLOSIVE EPS growth of 364%',
        '🔥 Revenue growing 43% YoY',
        '💎 Premium margins (73% gross, 33% net)',
        '🏦 Strong balance sheet (2.19 current ratio)',
        '⚠️ High P/E (157) - priced for perfection'
    ],
    
    recommendation: 'STRONG BUY candidate - Confirm with technical analysis'
};
```

---

## 5. UI Dashboard Specifications

### 5.1 Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ALGORITHMIC TRADING DASHBOARD                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ PART 1: MARKET SENTIMENT                              [🔄 Refresh Sentiment]│
├───────────────────────┬───────────────────────┬─────────────────────────────┤
│   VIX: 18.5          │  Fear & Greed: 35     │  AAII: Bull 28% / Bear 38%  │
│   ▼ Normal           │  ▼ Fear               │  ▼ Neutral (Spread: -10)    │
│   Signal: NEUTRAL    │  Signal: LEAN_BUY     │  Signal: NEUTRAL            │
├───────────────────────┴───────────────────────┴─────────────────────────────┤
│ COMPOSITE SENTIMENT: 42 - LEAN BULLISH                    Cached: 5 min ago │
├─────────────────────────────────────────────────────────────────────────────┤
│ PART 2: TECHNICAL ANALYSIS                                                  │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│ │ Asset Type: ▼   │ │ Asset: ▼        │ │ Timeframe: ▼    │  [📊 Analyze] │
│ │ [Stocks      ]  │ │ [AAPL         ] │ │ [1 Day       ]  │               │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘                │
├─────────────────────────────────────────────────────────────────────────────┤
│ ANALYSIS RESULTS FOR: AAPL @ $185.50 (1D Timeframe)                        │
├────────────────────────┬────────────────────────┬───────────────────────────┤
│ TREND INDICATORS       │ MOMENTUM INDICATORS    │ VOLUME INDICATORS         │
│ • MA Alignment: Bullish│ • RSI: 58 (Neutral)    │ • OBV: Rising ↑           │
│ • MACD: Bullish Cross  │ • Stochastic: 72/65    │ • A/D Line: Positive      │
│ • SAR: Uptrend         │ • CCI: 45 (Normal)     │ • Vol Spike: No           │
├────────────────────────┼────────────────────────┼───────────────────────────┤
│ VOLATILITY             │ CAN SLIM (75/100)      │ NEWS SENTIMENT            │
│ • Bollinger: Middle    │ ✓ C: EPS +32%          │ • Asset: Neutral (52)     │
│ • Keltner: In Channel  │ ✓ A: 5yr +28%          │ • Global: Positive (61)   │
│ • ATR: $2.85 (1.5%)    │ ✓ N: Near 52w High     │ • Headlines: 12           │
│                        │ ✗ L: RS 72 < 80        │                           │
├────────────────────────┴────────────────────────┴───────────────────────────┤
│ PORTFOLIO STATUS                                                            │
│ Budget: $100,000 | Cash: $65,000 | Invested: $35,000 (35%)                 │
│ Positions: NVDA (500 @ $120), MSFT (50 @ $380)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ AI RECOMMENDATION                                    [🤖 Get AI Decision]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ DECISION: BUY AAPL                                                      │ │
│ │ Confidence: 78%                                                         │ │
│ │ Quantity: 25 shares ($4,637.50)                                         │ │
│ │ Entry: $185.50 | Stop Loss: $179.80 | Take Profit: $198.00              │ │
│ │ Risk/Reward: 1:2.2                                                      │ │
│ │                                                                         │ │
│ │ REASONING:                                                              │ │
│ │ • Primary: Bullish MA alignment + MACD crossover                        │ │
│ │ • Supporting: Strong CAN SLIM score, neutral sentiment                  │ │
│ │ • Risk: RSI approaching overbought territory                            │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [✅ EXECUTE TRADE]  [❌ REJECT]  [📝 MODIFY]                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup & dependency installation
- [ ] Configuration management
- [ ] Basic Express server with UI skeleton
- [ ] Data fetcher for market data (multi-timeframe)
- [ ] Redis/memory cache setup
- [ ] Logging framework (Winston/Pino)
- [ ] Error handling middleware

### Phase 2: Sentiment Engine (Week 3)
- [ ] VIX fetcher implementation
- [ ] Fear & Greed Index fetcher
- [ ] AAII Sentiment parser
- [ ] Sentiment cache system
- [ ] Composite sentiment calculator
- [ ] UI: Sentiment panel with refresh button

### Phase 3: Technical Analysis (Week 4-5)
- [ ] All trend indicators (MA, MACD, SAR)
- [ ] All momentum indicators (RSI, Stochastic, CCI)
- [ ] All volume indicators (OBV, A/D Line)
- [ ] All volatility indicators (Bollinger, Keltner, ATR)
- [ ] CAN SLIM analysis
- [ ] News aggregation & sentiment
- [ ] UI: Asset selector & analysis display

### Phase 4: AI Integration (Week 6)
- [ ] Prompt builder with all analysis data
- [ ] AI response parser
- [ ] Portfolio context injection
- [ ] Position sizing logic
- [ ] UI: AI recommendation display

### Phase 5: Execution & Polish (Week 7-8)
- [ ] IBKR connection manager
- [ ] Order execution logic
- [ ] Portfolio tracker
- [ ] Trade history logging
- [ ] Error handling & recovery
- [ ] Testing with paper trading

---

## 7. Missing Critical Components to Add

### 7.1 Error Handling & Logging
```javascript
// Logging Configuration
const LOGGING_CONFIG = {
    framework: 'winston', // or 'pino'
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    
    transports: [
        { type: 'console', level: 'debug' },
        { type: 'file', filename: 'logs/error.log', level: 'error' },
        { type: 'file', filename: 'logs/combined.log', level: 'info' },
        { type: 'file', filename: 'logs/trades.log', level: 'info', filter: 'trade_*' }
    ],
    
    // Structured logging
    format: {
        timestamp: true,
        json: true,
        metadata: ['user_id', 'ticker', 'order_id']
    }
};

// Error Categories
const ERROR_TYPES = {
    API_ERROR: 'API request failed',
    RATE_LIMIT: 'API rate limit exceeded',
    IBKR_CONNECTION: 'IBKR connection lost',
    INVALID_DATA: 'Data validation failed',
    AI_TIMEOUT: 'AI request timeout',
    ORDER_REJECTED: 'Order rejected by broker',
    INSUFFICIENT_FUNDS: 'Not enough cash',
    SYSTEM_ERROR: 'Unexpected system error'
};

// Retry Strategy
const RETRY_CONFIG = {
    max_retries: 3,
    initial_delay_ms: 1000,
    backoff_multiplier: 2,
    max_delay_ms: 30000,
    retry_on: ['API_ERROR', 'RATE_LIMIT', 'AI_TIMEOUT']
};
```

### 7.2 API Rate Limiting Strategy
```javascript
// Rate Limit Handling
const RATE_LIMITS = {
    fmp: {
        free: { requests_per_minute: 250, requests_per_day: 250 },
        starter: { requests_per_minute: 300, requests_per_day: 750 },
        professional: { requests_per_minute: 750, requests_per_day: 'unlimited' }
    },
    
    polygon: {
        basic: { requests_per_minute: 5, requests_per_day: 'unlimited' },
        starter: { requests_per_minute: 100, requests_per_day: 'unlimited' }
    },
    
    openai: {
        gpt4: { requests_per_minute: 500, tokens_per_minute: 30000 },
        rate_limit_strategy: 'exponential_backoff'
    }
};

// Queue System for API Requests
const REQUEST_QUEUE = {
    enabled: true,
    max_concurrent: 5,
    priority_levels: ['critical', 'high', 'normal', 'low'],
    timeout_ms: 30000
};
```

### 7.3 Database Schema (Prisma + PostgreSQL)

**File: `prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Portfolio - Track current open positions
model Portfolio {
  id                Int      @id @default(autoincrement())
  ticker            String   @db.VarChar(10)
  quantity          Int
  entryPrice        Decimal  @db.Decimal(10, 2)
  entryDate         DateTime
  stopLoss          Decimal? @db.Decimal(10, 2)
  takeProfit        Decimal? @db.Decimal(10, 2)
  sector            String?  @db.VarChar(50)
  industry          String?  @db.VarChar(100)
  correlationNotes  String?  @db.Text
  status            String   @default("OPEN") @db.VarChar(20) // OPEN, CLOSED
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([ticker])
  @@index([status])
  @@map("portfolio")
}

// Trade History - All executed trades (closed positions)
model TradeHistory {
  id                 Int       @id @default(autoincrement())
  orderId            String?   @unique @db.VarChar(50)
  ticker             String    @db.VarChar(10)
  action             String    @db.VarChar(10) // BUY, SELL
  quantity           Int
  entryPrice         Decimal   @db.Decimal(10, 2)
  exitPrice          Decimal?  @db.Decimal(10, 2)
  entryDate          DateTime
  exitDate           DateTime?
  realizedPnl        Decimal?  @db.Decimal(10, 2)
  realizedPnlPct     Decimal?  @db.Decimal(5, 2)
  holdDurationDays   Int?
  strategyUsed       String?   @db.VarChar(50)
  aiConfidence       Int?
  success            Boolean?
  notes              String?   @db.Text
  
  // Tax-related fields
  costBasis          Decimal?  @db.Decimal(10, 2) // Total cost including fees
  proceeds           Decimal?  @db.Decimal(10, 2) // Total sale amount minus fees
  commission         Decimal?  @db.Decimal(5, 2) // Broker commission/fees
  taxLotMethod       String?   @db.VarChar(20) // FIFO, LIFO, SpecificID, AvgCost
  washSale           Boolean   @default(false) // IRS wash sale flag
  shortTerm          Boolean?  // <1 year holding = short-term capital gains
  taxYear            Int?      // Tax year for reporting
  
  createdAt          DateTime  @default(now())

  @@index([ticker])
  @@index([entryDate])
  @@index([taxYear])
  @@map("trade_history")
}

// AI Decisions - Store all AI analysis and recommendations
model AIDecision {
  id                Int      @id @default(autoincrement())
  ticker            String   @db.VarChar(10)
  timestamp         DateTime @default(now())
  
  // Input data sent to AI
  marketContext     Json     @db.JsonB // VIX, Fear & Greed, AAII sentiment
  assetAnalysis     Json     @db.JsonB // Technical, fundamental, news
  portfolioContext  Json     @db.JsonB // Current positions, cash, exposure
  
  // AI Response
  aiModel           String   @db.VarChar(50) // gpt-4, gpt-4-turbo
  decision          String   @db.VarChar(10) // BUY, SELL, HOLD
  confidence        Int      // 0-100
  quantity          Int?
  entryPrice        Decimal? @db.Decimal(10, 2)
  stopLoss          Decimal? @db.Decimal(10, 2)
  takeProfit        Decimal? @db.Decimal(10, 2)
  positionSizeUsd   Decimal? @db.Decimal(10, 2)
  
  // AI Reasoning (for audit trail)
  primaryFactors    Json     @db.JsonB // Array of main reasons
  supportingFactors Json     @db.JsonB // Array of supporting reasons
  riskFactors       Json     @db.JsonB // Array of risks
  reasoning         String   @db.Text  // Full summary
  
  // Risk Assessment
  riskLevel         String   @db.VarChar(10) // LOW, MEDIUM, HIGH
  maxLossPct        Decimal? @db.Decimal(5, 2)
  rewardRiskRatio   Decimal? @db.Decimal(5, 2)
  
  // Execution tracking
  executed          Boolean  @default(false) // Was recommendation executed?
  executedAt        DateTime?
  actualOutcome     String?  @db.Text // What actually happened
  performancePnl    Decimal? @db.Decimal(10, 2) // Actual P&L if executed
  
  // API Usage (for cost tracking)
  promptTokens      Int?
  completionTokens  Int?
  totalTokens       Int?
  apiCostUsd        Decimal? @db.Decimal(6, 4) // OpenAI API cost
  
  @@index([ticker])
  @@index([timestamp])
  @@index([decision])
  @@index([executed])
  @@map("ai_decisions")
}

// Tax Transactions - Detailed transaction log for IRS reporting
model TaxTransaction {
  id                Int       @id @default(autoincrement())
  transactionDate   DateTime
  taxYear           Int
  
  // Transaction details
  ticker            String    @db.VarChar(10)
  description       String    @db.VarChar(255) // "Bought 20 shares of NVDA"
  transactionType   String    @db.VarChar(20) // BUY, SELL, DIVIDEND, SPLIT, TRANSFER
  quantity          Decimal   @db.Decimal(12, 6) // Support fractional shares
  pricePerShare     Decimal   @db.Decimal(10, 2)
  totalAmount       Decimal   @db.Decimal(12, 2)
  commission        Decimal   @db.Decimal(6, 2)
  
  // Capital Gains (for SELL transactions)
  costBasis         Decimal?  @db.Decimal(12, 2)
  proceeds          Decimal?  @db.Decimal(12, 2)
  capitalGain       Decimal?  @db.Decimal(12, 2) // proceeds - costBasis
  gainType          String?   @db.VarChar(20) // SHORT_TERM, LONG_TERM
  
  // Wash Sale tracking
  washSale          Boolean   @default(false)
  relatedTradeId    Int?      // Link to trade that triggered wash sale
  washSaleAmount    Decimal?  @db.Decimal(10, 2)
  
  // Tax forms
  form8949Required  Boolean   @default(false) // IRS Form 8949 (capital gains)
  form1099BReceived Boolean   @default(false) // Broker tax form received
  
  // Audit trail
  orderId           String?   @db.VarChar(50) // Link to broker order ID
  confirmationNum   String?   @db.VarChar(50) // Broker confirmation
  notes             String?   @db.Text
  
  createdAt         DateTime  @default(now())
  
  @@index([taxYear])
  @@index([ticker])
  @@index([transactionType])
  @@index([transactionDate])
  @@map("tax_transactions")
}

// Analysis Cache - Store computed analysis results
model AnalysisCache {
  id           Int      @id @default(autoincrement())
  ticker       String   @db.VarChar(10)
  timeframe    String   @db.VarChar(10)
  analysisType String   @db.VarChar(20) // sentiment, technical, fundamental, news
  data         Json     @db.JsonB // Prisma native JSON support
  timestamp    DateTime
  expiry       DateTime

  @@index([ticker, timeframe, analysisType])
  @@index([expiry])
  @@map("analysis_cache")
}

// Performance Metrics - Daily portfolio performance tracking
model PerformanceMetrics {
  id                   Int      @id @default(autoincrement())
  date                 DateTime @unique @db.Date
  totalValue           Decimal  @db.Decimal(12, 2)
  cash                 Decimal  @db.Decimal(12, 2)
  invested             Decimal  @db.Decimal(12, 2)
  dailyReturnPct       Decimal? @db.Decimal(5, 2)
  cumulativeReturnPct  Decimal? @db.Decimal(8, 2)
  sharpeRatio          Decimal? @db.Decimal(5, 2)
  maxDrawdownPct       Decimal? @db.Decimal(5, 2)
  winRate              Decimal? @db.Decimal(5, 2)
  totalTrades          Int?
  winningTrades        Int?
  losingTrades         Int?
  avgWinPct            Decimal? @db.Decimal(5, 2)
  avgLossPct           Decimal? @db.Decimal(5, 2)
  profitFactor         Decimal? @db.Decimal(5, 2) // (total_wins / total_losses)

  @@index([date(sort: Desc)])
  @@map("performance_metrics")
}
```

---

### 7.3.1 Prisma Setup & Usage

**Initialize Prisma:**
```bash
# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma (database schema)
# - .env file (with DATABASE_URL)
```

**Environment Variable (.env):**
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/trading_bot?schema=public"
```

**Run Migrations:**
```bash
# Create migration from schema
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy

# Generate Prisma Client (run after schema changes)
npx prisma generate
```

**Using Prisma in Code:**
```javascript
// File: src/database/prisma.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'], // Enable query logging
});

module.exports = prisma;
```

**Example Queries:**
```javascript
const prisma = require('./database/prisma');

// CREATE - Add new position
const newPosition = await prisma.portfolio.create({
    data: {
        ticker: 'NVDA',
        quantity: 20,
        entryPrice: 495.50,
        entryDate: new Date(),
        stopLoss: 467.00,
        takeProfit: 538.50,
        sector: 'Technology',
        industry: 'Semiconductors',
        correlationNotes: 'Part of AI infrastructure theme'
    }
});

// READ - Get all open positions
const openPositions = await prisma.portfolio.findMany({
    where: { status: 'OPEN' },
    orderBy: { entryDate: 'desc' }
});

// READ - Get position by ticker
const nvdaPosition = await prisma.portfolio.findFirst({
    where: { 
        ticker: 'NVDA',
        status: 'OPEN'
    }
});

// UPDATE - Update position
await prisma.portfolio.update({
    where: { id: 1 },
    data: { 
        quantity: 25,
        stopLoss: 480.00
    }
});

// DELETE - Close position (mark as closed)
await prisma.portfolio.update({
    where: { id: 1 },
    data: { status: 'CLOSED' }
});

// COMPLEX QUERY - Get sector exposure
const sectorExposure = await prisma.portfolio.groupBy({
    by: ['sector'],
    where: { status: 'OPEN' },
    _sum: {
        quantity: true
    },
    _count: true
});

// TRANSACTION - Close position + record trade history
await prisma.$transaction(async (tx) => {
    // 1. Mark position as closed
    await tx.portfolio.update({
        where: { id: positionId },
        data: { status: 'CLOSED' }
    });
    
    // 2. Create trade history record
    await tx.tradeHistory.create({
        data: {
            orderId: 'ORD123456',
            ticker: 'NVDA',
            action: 'SELL',
            quantity: 20,
            entryPrice: 495.50,
            exitPrice: 520.00,
            entryDate: new Date('2025-12-01'),
            exitDate: new Date(),
            realizedPnl: 490.00,
            realizedPnlPct: 4.94,
            holdDurationDays: 30,
            strategyUsed: 'AI-MOMENTUM',
            aiConfidence: 85,
            success: true
        }
    });
});

// AGGREGATIONS - Performance stats
const tradeStats = await prisma.tradeHistory.aggregate({
    _count: true,
    _avg: {
        realizedPnlPct: true,
        holdDurationDays: true
    },
    _sum: {
        realizedPnl: true
    },
    where: {
        exitDate: {
            gte: new Date('2025-01-01')
        }
    }
});

// RAW SQL (when needed)
const complexQuery = await prisma.$queryRaw`
    SELECT ticker, AVG(realized_pnl_pct) as avg_return
    FROM trade_history
    WHERE success = true
    GROUP BY ticker
    ORDER BY avg_return DESC
    LIMIT 10
`;

// STORE AI DECISION - Before executing trade
const aiDecision = await prisma.aIDecision.create({
    data: {
        ticker: 'NVDA',
        marketContext: {
            vix: 18.5,
            fearGreed: 35,
            aaii: { bullish: 28.5, bearish: 38.2 }
        },
        assetAnalysis: {
            technical: { rsi: 62.5, macd: 'bullish' },
            fundamental: { epsGrowth: 111, revenue: 94 },
            news: { sentiment: 'BULLISH', score: 72 }
        },
        portfolioContext: {
            cash: 65000,
            positions: 2,
            exposure: 35
        },
        aiModel: 'gpt-4-turbo',
        decision: 'BUY',
        confidence: 85,
        quantity: 20,
        entryPrice: 495.50,
        stopLoss: 467.00,
        takeProfit: 538.50,
        positionSizeUsd: 9910,
        primaryFactors: [
            'Exceptional growth fundamentals',
            'Strong technical setup'
        ],
        supportingFactors: [
            'CAN SLIM score 92/100',
            'Growth score 98/100'
        ],
        riskFactors: [
            'Premium valuation P/E 39.2',
            'High concentration risk'
        ],
        reasoning: 'NVDA presents a rare combination...',
        riskLevel: 'MODERATE',
        maxLossPct: 5.8,
        rewardRiskRatio: 2.2,
        promptTokens: 3500,
        completionTokens: 850,
        totalTokens: 4350,
        apiCostUsd: 0.0435 // $0.0435 per request
    }
});

// MARK AI DECISION AS EXECUTED
await prisma.aIDecision.update({
    where: { id: aiDecision.id },
    data: {
        executed: true,
        executedAt: new Date()
    }
});

// STORE TAX TRANSACTION - Every buy/sell
const taxTx = await prisma.taxTransaction.create({
    data: {
        transactionDate: new Date(),
        taxYear: 2025,
        ticker: 'NVDA',
        description: 'Bought 20 shares of NVIDIA Corporation',
        transactionType: 'BUY',
        quantity: 20,
        pricePerShare: 495.50,
        totalAmount: 9910.00,
        commission: 1.00,
        orderId: 'ORD123456',
        confirmationNum: 'CONF789012',
        notes: 'AI-recommended purchase based on growth score 98/100'
    }
});

// TAX YEAR SUMMARY - Get all transactions for tax reporting
const taxReport2025 = await prisma.taxTransaction.findMany({
    where: { 
        taxYear: 2025,
        transactionType: 'SELL'
    },
    orderBy: { transactionDate: 'asc' }
});

// CALCULATE CAPITAL GAINS
const capitalGains = await prisma.taxTransaction.aggregate({
    where: {
        taxYear: 2025,
        transactionType: 'SELL'
    },
    _sum: {
        capitalGain: true
    }
});

// SHORT-TERM vs LONG-TERM GAINS
const gainsByType = await prisma.taxTransaction.groupBy({
    by: ['gainType'],
    where: {
        taxYear: 2025,
        transactionType: 'SELL'
    },
    _sum: {
        capitalGain: true
    }
});

// WASH SALES - Identify potential issues
const washSales = await prisma.taxTransaction.findMany({
    where: {
        taxYear: 2025,
        washSale: true
    }
});

// AI PERFORMANCE TRACKING
const aiPerformance = await prisma.aIDecision.findMany({
    where: {
        executed: true,
        performancePnl: { not: null }
    },
    select: {
        ticker: true,
        decision: true,
        confidence: true,
        performancePnl: true,
        riskLevel: true,
        timestamp: true
    }
});

// AI COST TRACKING
const aiCosts = await prisma.aIDecision.aggregate({
    where: {
        timestamp: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
        }
    },
    _sum: {
        apiCostUsd: true,
        totalTokens: true
    },
    _count: true
});
```

### 7.4 Backtesting Framework
```javascript
// Backtesting Configuration
const BACKTEST_CONFIG = {
    start_date: '2020-01-01',
    end_date: '2024-12-31',
    initial_capital: 100000,
    
    data_source: 'historical',
    timeframe: '1d',
    slippage_pct: 0.05, // 0.05% slippage per trade
    commission_per_trade: 1.00, // $1 per trade
    
    benchmark: 'SPY', // Compare against S&P 500
    
    metrics_to_calculate: [
        'total_return',
        'cagr',
        'sharpe_ratio',
        'sortino_ratio',
        'max_drawdown',
        'win_rate',
        'profit_factor',
        'avg_trade_duration',
        'calmar_ratio'
    ]
};

// Walk-Forward Testing
const WALK_FORWARD_CONFIG = {
    enabled: true,
    in_sample_period: 252, // 1 year for training
    out_sample_period: 63, // 3 months for testing
    step_size: 21 // Move forward 1 month at a time
};
```

### 7.5 Order Management System
```javascript
// Order Status Tracking
const ORDER_STATUS = {
    PENDING: 'Order submitted, awaiting confirmation',
    FILLED: 'Order fully executed',
    PARTIALLY_FILLED: 'Order partially executed',
    CANCELLED: 'Order cancelled',
    REJECTED: 'Order rejected by broker',
    EXPIRED: 'Order expired'
};

// Order Types
const ORDER_TYPES = {
    MARKET: {
        type: 'MKT',
        execution: 'immediate',
        slippage_risk: 'high'
    },
    LIMIT: {
        type: 'LMT',
        execution: 'when_price_reached',
        slippage_risk: 'low'
    },
    STOP_LOSS: {
        type: 'STP',
        execution: 'when_stop_triggered',
        purpose: 'risk_management'
    },
    STOP_LIMIT: {
        type: 'STP LMT',
        execution: 'limit_after_stop',
        purpose: 'risk_management'
    },
    TRAILING_STOP: {
        type: 'TRAIL',
        execution: 'dynamic_stop',
        purpose: 'profit_protection'
    }
};

// Order Validation
const ORDER_VALIDATION = {
    checks: [
        'sufficient_cash',
        'position_size_limit',
        'sector_exposure_limit',
        'daily_trade_limit',
        'risk_per_trade_limit',
        'market_hours',
        'ticker_exists'
    ],
    
    rejection_reasons: {
        INSUFFICIENT_CASH: 'Not enough cash for purchase',
        POSITION_TOO_LARGE: 'Exceeds max position size',
        SECTOR_LIMIT: 'Exceeds sector exposure limit',
        DAILY_LIMIT: 'Exceeded daily trade limit',
        RISK_LIMIT: 'Exceeds risk per trade limit',
        MARKET_CLOSED: 'Market is closed',
        INVALID_TICKER: 'Ticker not found'
    }
};
```

### 7.6 Market Hours & Calendar
```javascript
// Market Hours Detection
const MARKET_HOURS = {
    regular: {
        open: '09:30',
        close: '16:00',
        timezone: 'America/New_York'
    },
    
    pre_market: {
        open: '04:00',
        close: '09:30',
        enabled: false // Don't trade pre-market by default
    },
    
    after_hours: {
        open: '16:00',
        close: '20:00',
        enabled: false // Don't trade after-hours by default
    },
    
    // Market closed days (US holidays)
    holidays_2025: [
        '2025-01-01', // New Year's Day
        '2025-01-20', // MLK Day
        '2025-02-17', // Presidents' Day
        '2025-04-18', // Good Friday
        '2025-05-26', // Memorial Day
        '2025-07-04', // Independence Day
        '2025-09-01', // Labor Day
        '2025-11-27', // Thanksgiving
        '2025-12-25'  // Christmas
    ]
};

// Trading Schedule Validator
function isTradingHours() {
    const now = new Date();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isHoliday = MARKET_HOURS.holidays_2025.includes(now.toISOString().split('T')[0]);
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour * 60 + minute;
    
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return isWeekday && !isHoliday && time >= marketOpen && time < marketClose;
}
```

### 7.7 Notification System
```javascript
// Notification Channels
const NOTIFICATION_CONFIG = {
    enabled: true,
    
    channels: {
        email: {
            enabled: true,
            service: 'gmail', // or SendGrid, AWS SES
            to: 'trader@example.com',
            events: ['trade_executed', 'daily_summary', 'error_critical']
        },
        
        telegram: {
            enabled: true,
            bot_token: 'YOUR_BOT_TOKEN',
            chat_id: 'YOUR_CHAT_ID',
            events: ['trade_executed', 'stop_loss_hit', 'target_reached', 'error']
        },
        
        discord: {
            enabled: false,
            webhook_url: 'YOUR_WEBHOOK_URL',
            events: ['trade_executed', 'daily_summary']
        },
        
        console: {
            enabled: true,
            events: ['all']
        }
    },
    
    // Event Templates
    templates: {
        trade_executed: {
            title: '🚀 Trade Executed',
            body: 'Action: {action} | Ticker: {ticker} | Quantity: {quantity} | Price: ${price} | Confidence: {confidence}%'
        },
        
        stop_loss_hit: {
            title: '🛑 Stop Loss Triggered',
            body: 'Ticker: {ticker} | Entry: ${entry} | Exit: ${exit} | Loss: {loss_pct}%'
        },
        
        target_reached: {
            title: '🎯 Target Reached',
            body: 'Ticker: {ticker} | Entry: ${entry} | Exit: ${exit} | Gain: {gain_pct}%'
        },
        
        daily_summary: {
            title: '📊 Daily Summary',
            body: 'P&L: ${pnl} ({pnl_pct}%) | Trades: {trades_today} | Portfolio: ${portfolio_value}'
        },
        
        error_critical: {
            title: '❌ Critical Error',
            body: 'Error: {error_message} | Time: {timestamp} | Action Required!'
        }
    }
};
```

### 7.8 Configuration Management
```javascript
// Environment-Specific Configs
const CONFIG_ENVIRONMENTS = {
    development: {
        mode: 'development',
        ibkr_port: 7497, // Paper trading
        log_level: 'debug',
        cache_ttl: 300, // 5 minutes for faster testing
        max_position_size_usd: 1000, // Small positions for testing
        ai_enabled: true,
        notification_enabled: false
    },
    
    paper_trading: {
        mode: 'paper',
        ibkr_port: 7497,
        log_level: 'info',
        cache_ttl: 3600,
        max_position_size_usd: 10000,
        ai_enabled: true,
        notification_enabled: true,
        real_market_data: true
    },
    
    production: {
        mode: 'live',
        ibkr_port: 7496, // Live trading
        log_level: 'warn',
        cache_ttl: 3600,
        max_position_size_usd: 10000,
        ai_enabled: true,
        notification_enabled: true,
        require_2fa: true,
        max_daily_loss_pct: 5,
        emergency_stop: true
    }
};

// Feature Flags
const FEATURE_FLAGS = {
    multi_timeframe_analysis: true,
    news_analysis: true,
    canslim_scoring: true,
    correlation_matrix: true,
    backtesting: true,
    paper_trading: true,
    live_trading: false, // Disable live trading until fully tested
    trailing_stops: true,
    auto_rebalance: false
};
```

### 7.9 Performance Monitoring
```javascript
// Real-time Performance Metrics
const PERFORMANCE_MONITORING = {
    metrics: {
        // Portfolio metrics
        total_value: 0,
        cash: 0,
        invested: 0,
        
        // Returns
        daily_return_pct: 0,
        weekly_return_pct: 0,
        monthly_return_pct: 0,
        ytd_return_pct: 0,
        total_return_pct: 0,
        
        // Risk metrics
        sharpe_ratio: 0,
        sortino_ratio: 0,
        max_drawdown_pct: 0,
        current_drawdown_pct: 0,
        
        // Trading metrics
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        avg_win_pct: 0,
        avg_loss_pct: 0,
        profit_factor: 0,
        avg_hold_time_days: 0,
        
        // Benchmarking
        sp500_return_pct: 0,
        alpha: 0, // Excess return vs benchmark
        beta: 1.0 // Volatility vs benchmark
    },
    
    // Update frequency
    update_interval_ms: 60000, // Update every minute
    
    // Alerts
    alerts: {
        drawdown_threshold_pct: 10,
        daily_loss_threshold_pct: 5,
        win_rate_threshold: 40,
        low_sharpe_ratio: 0.5
    }
};
```

### 7.10 WebSocket / Real-time Data (Optional)
```javascript
// Real-time Data Streaming
const WEBSOCKET_CONFIG = {
    enabled: false, // Enable for high-frequency trading
    
    polygon_websocket: {
        url: 'wss://socket.polygon.io/stocks',
        subscriptions: ['T.*', 'Q.*', 'A.*'], // Trades, Quotes, Aggregates
        reconnect: true,
        heartbeat_interval: 30000
    },
    
    ibkr_websocket: {
        enabled: true,
        subscriptions: ['positions', 'orders', 'account_updates'],
        update_interval: 1000 // 1 second
    },
    
    // Use cases
    use_cases: [
        'Real-time order status updates',
        'Live portfolio value tracking',
        'Instant price alerts',
        'High-frequency trading (sub-second decisions)'
    ]
};
```

---

## 8. Risk Management Rules

```javascript
const RISK_RULES = {
    // Position Limits
    max_single_position_pct: 10,      // Max 10% of portfolio in one stock
    max_sector_exposure_pct: 25,       // Max 25% in one sector
    max_total_exposure_pct: 80,        // Keep 20% cash minimum
    
    // Trade Limits
    max_trades_per_day: 10,
    min_confidence_to_trade: 70,       // AI must be 70%+ confident
    
    // Stop Loss Rules
    max_loss_per_trade_pct: 2,         // Max 2% loss per trade
    trailing_stop_enabled: true,
    trailing_stop_pct: 5,
    
    // Circuit Breakers
    daily_loss_limit_pct: 5,           // Stop trading if down 5% in a day
    weekly_loss_limit_pct: 10,         // Review if down 10% in a week
    
    // Sentiment Override
    vix_trading_halt: 40,              // Don't trade if VIX > 40
    extreme_fear_greed_caution: true   // Reduce size in extreme readings
};
```

---

## 2. Prerequisites

Before installing the code, ensure you have the following:

1.  **Node.js**: Download and install from [nodejs.org](https://nodejs.org/) (Version 18 or higher).
2.  **Interactive Brokers TWS (Trader Workstation)** or **IB Gateway**:
    * Download from Interactive Brokers.
    * **Configuration**:
        * Open TWS.
        * Go to **File** -> **Global Configuration** -> **API** -> **Settings**.
        * Check **"Enable ActiveX and Socket Clients"**.
        * Uncheck **"Read-Only API"**.
        * **Socket Port**: Set to `7497` (this is the default for Paper Trading).

---

## 3. Installation & Setup

Open your terminal (Command Prompt or Terminal) and run the following commands step-by-step:

### Step A: Create Project Folder
```bash
mkdir trading-bot
cd trading-bot
```
Step B: Initialize Node Project
```bash

npm init -y
```
Step C: Install Dependencies
This installs the required libraries for HTTP requests, AI, technical analysis, and IBKR connectivity.

```bash
npm install axios dotenv openai technicalindicators @stoqey/ib
```

4. Configuration
Create a file named .env in the root of your trading-bot folder. This file will store your sensitive keys.

File: .env

Code snippet

# --- API KEYS ---
# Get from: [https://platform.openai.com/](https://platform.openai.com/)
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY_HERE

# Get from: [https://site.financialmodelingprep.com/developer](https://site.financialmodelingprep.com/developer)
FMP_API_KEY=YOUR_FMP_KEY_HERE

# Get from: [https://polygon.io/](https://polygon.io/)
POLYGON_API_KEY=YOUR_POLYGON_KEY_HERE

# --- IBKR SETTINGS ---
# Localhost IP
IB_HOST=127.0.0.1
# 7497 = Paper Trading, 7496 = Live Trading
IB_PORT=7497
# Unique ID for this client
IB_CLIENT_ID=1
5. Source Code Implementation
Create the following files in your project folder.

A. Data & Analysis Engine
File: analyzer.js

```javascript

const axios = require('axios');
const { RSI, MACD, SMA } = require('technicalindicators');
require('dotenv').config();

const FMP_KEY = process.env.FMP_API_KEY;

// 1. Fetch Historical Price Data
async function getMarketData(ticker) {
    try {
        const url = `https://financialmodelingprep.com/api/v3/historical-chart/1day/${ticker}?apikey=${FMP_KEY}`;
        const response = await axios.get(url);
        // FMP returns new->old; reverse so index 0 is oldest, last index is newest
        if (!response.data || response.data.length === 0) throw new Error("No data found");
        return response.data.reverse();
    } catch (error) {
        console.error(`Error fetching market data for ${ticker}:`, error.message);
        return [];
    }
}

// 2. Fetch Financials for CAN SLIM
async function getFinancials(ticker) {
    try {
        const url = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=8&apikey=${FMP_KEY}`;
        const response = await axios.get(url);
        return response.data; 
    } catch (error) {
        console.error(`Error fetching financials for ${ticker}:`, error.message);
        return [];
    }
}

// 3. Main Analysis Function
async function analyzeStock(ticker) {
    console.log(`\n🔍 Analyzing ${ticker}...`);
    
    const candles = await getMarketData(ticker);
    const financials = await getFinancials(ticker);

    if (candles.length < 200 || financials.length < 5) {
        throw new Error("Insufficient data for analysis");
    }

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const currentPrice = closes[closes.length - 1];

    // -- Technical Analysis --
    const rsiRaw = RSI.calculate({ values: closes, period: 14 });
    const macdRaw = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    const volSma = SMA.calculate({ values: volumes, period: 50 });

    const technicals = {
        rsi: rsiRaw[rsiRaw.length - 1],
        macd: macdRaw[macdRaw.length - 1],
        vol_spike: volumes[volumes.length - 1] > volSma[volSma.length - 1] 
    };

    // -- Fundamental Analysis (CAN SLIM Logic) --
    // C: Current Earnings (EPS > 20% vs same quarter last year)
    const currentEPS = financials[0].eps;
    const prevYearEPS = financials[4] ? financials[4].eps : financials[0].eps; 
    const epsGrowth = prevYearEPS !== 0 ? ((currentEPS - prevYearEPS) / Math.abs(prevYearEPS)) * 100 : 0;

    // N: New Highs (Price within 5% of 52-week High)
    const yearHigh = Math.max(...closes.slice(-252));
    const nearHigh = currentPrice >= (yearHigh * 0.95);

    const fundamentals = {
        eps_growth_pct: epsGrowth.toFixed(2),
        near_52w_high: nearHigh,
        can_slim_pass: (epsGrowth > 20 && nearHigh)
    };

    return { ticker, price: currentPrice, technicals, fundamentals };
}

module.exports = { analyzeStock };
```

B. AI Strategy Core
File: strategist.js

```JavaScript

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIStrategy(analysis) {
    console.log("🧠 Sending data to AI...");

    const prompt = `
    You are a Senior Hedge Fund Algorithm.
    
    INPUT DATA for ${analysis.ticker}:
    - Price: $${analysis.price}
    - RSI: ${analysis.technicals.rsi} (Over 70=Overbought, Under 30=Oversold)
    - MACD Histogram: ${analysis.technicals.macd.histogram}
    - EPS Growth: ${analysis.fundamentals.eps_growth_pct}%
    - CAN SLIM Check: ${analysis.fundamentals.can_slim_pass ? "PASS" : "FAIL"}
    
    TASK:
    Generate trading strategies for these timeframes: 3 months, 6 months, 12 months.
    
    OUTPUT SCHEMA (JSON ONLY):
    {
      "strategies": [
        {
          "period": "3 months",
          "action": "BUY" | "SELL" | "HOLD",
          "instrument": "STOCK" | "OPTION",
          "details": "Strike/Expiry details if option",
          "confidence": 0-100,
          "rationale": "One sentence reason"
        }
      ]
    }
    `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4-turbo", // or "gpt-4o"
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error("AI Generation Error:", error);
        return { strategies: [] };
    }
}

module.exports = { getAIStrategy };

```

C. Execution Layer
File: execution.js

```JavaScript

const { Ib } = require('@stoqey/ib');
require('dotenv').config();

// Initialize IB Interface
const ib = new Ib({
    clientId: Number(process.env.IB_CLIENT_ID) || 1,
    host: process.env.IB_HOST || '127.0.0.1',
    port: Number(process.env.IB_PORT) || 7497
});

// Helper to wait for connection
function connectToIB() {
    return new Promise((resolve) => {
        ib.on('connected', () => {
            console.log('✅ Connected to IBKR TWS');
            resolve();
        });
        
        ib.on('error', (err) => {
            console.error('IBKR Connection Error:', err.message);
        });

        ib.connect();
    });
}

async function executeOrder(ticker, action, quantity) {
    const contract = {
        symbol: ticker,
        secType: 'STK',
        exchange: 'SMART',
        currency: 'USD'
    };

    const order = {
        action: action, // 'BUY' or 'SELL'
        totalQuantity: quantity,
        orderType: 'MKT',
        tif: 'DAY'
    };

    console.log(`🚀 Sending ${action} order for ${ticker}...`);
    try {
        const tradeId = await ib.placeOrder(contract, order);
        console.log(`✅ Order Successfully Sent! Trade ID: ${tradeId}`);
        return tradeId;
    } catch (err) {
        console.error("Execution Failed:", err);
    }
}

module.exports = { connectToIB, executeOrder };
```

D. Main Application Entry Point
File: index.js

```JavaScript

const { analyzeStock } = require('./analyzer');
const { getAIStrategy } = require('./strategist');
const { connectToIB, executeOrder } = require('./execution');

// Configuration
const WATCHLIST = ['AAPL', 'NVDA', 'TSLA', 'AMD'];
const TRADE_CONFIDENCE_THRESHOLD = 85;

async function runBot() {
    console.log("=== STARTING TRADING BOT ===");
    
    // 1. Connect to IBKR first
    await connectToIB();

    for (const ticker of WATCHLIST) {
        try {
            // Step 1: Analyze
            const analysis = await analyzeStock(ticker);
            console.log(`   > RSI: ${analysis.technicals.rsi.toFixed(2)}`);
            console.log(`   > EPS Growth: ${analysis.fundamentals.eps_growth_pct}%`);

            // Step 2: Get AI Strategy
            const aiResponse = await getAIStrategy(analysis);
            
            // Find 3-month strategy
            const shortTermStrat = aiResponse.strategies.find(s => s.period.includes('3'));

            if (shortTermStrat) {
                console.log(`   > AI Suggestion: ${shortTermStrat.action} (${shortTermStrat.confidence}% confidence)`);
                
                // Step 3: Execution Logic
                if (shortTermStrat.action === 'BUY' && shortTermStrat.confidence >= TRADE_CONFIDENCE_THRESHOLD) {
                    console.log("   >>> EXECUTION CONDITION MET. BUYING.");
                    await executeOrder(ticker, 'BUY', 1); // Buying 1 share for testing
                } else {
                    console.log("   >>> Holding (No trade executed).");
                }
            }
        } catch (err) {
            console.error(`Skipping ${ticker} due to error.`);
        }
    }

    console.log('\n=== ALL TICKERS PROCESSED ===');
    console.log('Press Ctrl+C to exit.');
}

runBot();
```

6. How to Run
Make sure TWS is running and you are logged in.

Open your terminal in the trading-bot folder.

Run the bot:

```Bash

node index.js
```

---

# IMPLEMENTATION ROADMAP

## 📋 Step-by-Step Implementation Plan

This section breaks down the entire project into **15 manageable steps**. Each step builds upon the previous one, with clear deliverables and testing checkpoints.

**Estimated Timeline**: 8-12 weeks (part-time) | 4-6 weeks (full-time)

---

## STEP 1: Project Foundation & Environment Setup
**Duration**: 1-2 days  
**Goal**: Set up development environment and basic project structure

### Tasks:
```bash
# 1. Create project directory
mkdir trading-bot
cd trading-bot

# 2. Initialize Node.js project
npm init -y

# 3. Install core dependencies
npm install express axios dotenv
npm install --save-dev nodemon

# 4. Create folder structure
mkdir -p src/{part1-sentiment,part2-technical/indicators,ai,portfolio,execution,ui/routes,ui/public/{css,js}}
mkdir -p config data logs prisma

# 5. Create .env file
touch .env

# 6. Create basic files
touch src/index.js
touch config/settings.js
touch .gitignore
```

### .env Template:
```bash
# API Keys
FMP_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
POLYGON_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here

# IBKR
IB_HOST=127.0.0.1
IB_PORT=7497
IB_CLIENT_ID=1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trading_bot

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
PORT=3000
```

### .gitignore:
```
node_modules/
.env
logs/
data/*.json
*.log
.DS_Store
```

### Deliverables:
- ✅ Project structure created
- ✅ Dependencies installed
- ✅ Environment variables configured
- ✅ Git repository initialized

---

## STEP 2: Database Setup with Prisma
**Duration**: 1 day  
**Goal**: Set up PostgreSQL database with Prisma ORM

### Tasks:
```bash
# 1. Install Prisma
npm install @prisma/client
npm install --save-dev prisma

# 2. Initialize Prisma
npx prisma init

# 3. Copy schema from project_plan.md to prisma/schema.prisma
# (Portfolio, TradeHistory, AIDecision, TaxTransaction, AnalysisCache, PerformanceMetrics)

# 4. Create database
createdb trading_bot

# 5. Run migration
npx prisma migrate dev --name init

# 6. Generate Prisma Client
npx prisma generate

# 7. Test connection
npx prisma studio  # Opens database GUI at localhost:5555
```

### File: `src/database/prisma.js`
```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test connection
async function testConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

module.exports = { prisma, testConnection };
```

### Deliverables:
- ✅ PostgreSQL database created
- ✅ All tables migrated
- ✅ Prisma Client generated
- ✅ Database connection tested

---

## STEP 3: Configuration & Settings
**Duration**: 2-3 hours  
**Goal**: Create centralized configuration management

### File: `config/settings.js`
```javascript
require('dotenv').config();

module.exports = {
    // API Keys
    api: {
        fmp: process.env.FMP_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        polygon: process.env.POLYGON_API_KEY,
        newsapi: process.env.NEWSAPI_KEY
    },
    
    // IBKR
    ibkr: {
        host: process.env.IB_HOST || '127.0.0.1',
        port: parseInt(process.env.IB_PORT) || 7497,
        clientId: parseInt(process.env.IB_CLIENT_ID) || 1
    },
    
    // Database
    database: {
        url: process.env.DATABASE_URL
    },
    
    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    
    // Portfolio
    portfolio: {
        initialBudget: 100000,
        maxPositionPct: 10,
        maxSectorExposure: 50,
        maxTotalExposure: 80,
        reserveCashPct: 20,
        maxRiskPerTradePct: 2
    },
    
    // Cache
    cache: {
        sentimentTTL: 3600, // 1 hour
        analysisTTL: 1800,  // 30 minutes
        newsTTL: 1800       // 30 minutes
    },
    
    // Trading
    trading: {
        minConfidence: 70,
        maxDailyTrades: 10,
        maxDailyLossPct: 5,
        stopLossMultiplier: 2 // 2x ATR
    },
    
    // Environment
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000
};
```

### Deliverables:
- ✅ Centralized configuration
- ✅ Environment-specific settings
- ✅ Default values defined

---

## STEP 4: Logging System
**Duration**: 2-3 hours  
**Goal**: Set up Winston logger for debugging and monitoring

### Tasks:
```bash
npm install winston
```

### File: `src/utils/logger.js`
```javascript
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'trading-bot' },
    transports: [
        // Error logs
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Combined logs
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5
        }),
        // Trade logs
        new winston.transports.File({ 
            filename: 'logs/trades.log',
            level: 'info',
            maxsize: 5242880,
            maxFiles: 10
        })
    ]
});

// Console logging in development
if (process.env.NODE_ENV === 'development') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
```

### Deliverables:
- ✅ Logger configured
- ✅ Log files created
- ✅ Error tracking enabled

---

## STEP 5: Basic Express Server & API Routes
**Duration**: 3-4 hours  
**Goal**: Create REST API foundation

### File: `src/ui/server.js`
```javascript
const express = require('express');
const path = require('path');
const config = require('../../config/settings');
const logger = require('../utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// API Routes (to be added in next steps)
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/trading', require('./routes/trading'));

// Error handling
app.use((err, req, res, next) => {
    logger.error('API Error:', err);
    res.status(500).json({ error: err.message });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
```

### Test:
```bash
node src/ui/server.js
# Visit http://localhost:3000/health
```

### Deliverables:
- ✅ Express server running
- ✅ Basic routes defined
- ✅ Error handling in place

---

## STEP 6: VIX Fetcher (Part 1 - Sentiment)
**Duration**: 3-4 hours  
**Goal**: Implement VIX volatility index fetcher with caching

### File: `src/part1-sentiment/vixFetcher.js`
```javascript
const axios = require('axios');
const config = require('../../config/settings');
const logger = require('../utils/logger');

async function fetchVIX() {
    try {
        const url = `https://financialmodelingprep.com/api/v3/quote/%5EVIX?apikey=${config.api.fmp}`;
        const response = await axios.get(url);
        
        if (!response.data || response.data.length === 0) {
            throw new Error('No VIX data received');
        }
        
        const vix = response.data[0];
        const value = vix.price;
        
        // Interpret VIX
        let interpretation, signal, signalStrength;
        if (value < 12) {
            interpretation = 'EXTREME_LOW';
            signal = 'CAUTION';
            signalStrength = 30;
        } else if (value < 20) {
            interpretation = 'NEUTRAL';
            signal = 'NEUTRAL';
            signalStrength = 50;
        } else if (value < 30) {
            interpretation = 'ELEVATED';
            signal = 'CAUTION';
            signalStrength = 70;
        } else {
            interpretation = 'EXTREME';
            signal = 'EXTREME_FEAR';
            signalStrength = 90;
        }
        
        const result = {
            currentValue: value,
            previousClose: vix.previousClose,
            change: vix.change,
            changePercent: vix.changesPercentage,
            interpretation,
            signal,
            signalStrength,
            timestamp: new Date(),
            recommendation: getRecommendation(interpretation)
        };
        
        logger.info(`VIX fetched: ${value} (${interpretation})`);
        return result;
        
    } catch (error) {
        logger.error('VIX fetch error:', error);
        throw error;
    }
}

function getRecommendation(interpretation) {
    const recommendations = {
        EXTREME_LOW: 'Market complacency - potential top',
        NEUTRAL: 'Normal market conditions',
        ELEVATED: 'Elevated fear - proceed with caution',
        EXTREME: 'Panic - contrarian buy zone'
    };
    return recommendations[interpretation];
}

module.exports = { fetchVIX };
```

### Test:
```javascript
// test.js
const { fetchVIX } = require('./src/part1-sentiment/vixFetcher');

fetchVIX().then(data => {
    console.log('VIX Data:', data);
});
```

### Deliverables:
- ✅ VIX data fetcher working
- ✅ Interpretation logic implemented
- ✅ Error handling added

---

## STEP 7: Fear & Greed + Complete Sentiment Engine
**Duration**: 4-5 hours  
**Goal**: Complete sentiment engine with all 3 indicators

### File: `src/part1-sentiment/fearGreedFetcher.js`
```javascript
const axios = require('axios');
const logger = require('../utils/logger');

async function fetchFearGreed() {
    try {
        // Note: Fear & Greed may require web scraping or alternative API
        // For now, using CNN data endpoint
        const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
        const response = await axios.get(url);
        
        const value = response.data.fear_and_greed.score;
        
        let interpretation, signal, signalStrength;
        if (value < 25) {
            interpretation = 'EXTREME_FEAR';
            signal = 'BUY';
            signalStrength = 80;
        } else if (value < 45) {
            interpretation = 'FEAR';
            signal = 'LEAN_BUY';
            signalStrength = 65;
        } else if (value < 55) {
            interpretation = 'NEUTRAL';
            signal = 'HOLD';
            signalStrength = 50;
        } else if (value < 75) {
            interpretation = 'GREED';
            signal = 'LEAN_SELL';
            signalStrength = 65;
        } else {
            interpretation = 'EXTREME_GREED';
            signal = 'SELL';
            signalStrength = 80;
        }
        
        return {
            currentValue: value,
            interpretation,
            signal,
            signalStrength,
            timestamp: new Date(),
            recommendation: `Market showing ${interpretation.toLowerCase().replace('_', ' ')}`
        };
        
    } catch (error) {
        logger.error('Fear & Greed fetch error:', error);
        throw error;
    }
}

module.exports = { fetchFearGreed };
```

### File: `src/part1-sentiment/sentimentEngine.js`
```javascript
const { fetchVIX } = require('./vixFetcher');
const { fetchFearGreed } = require('./fearGreedFetcher');
const logger = require('../utils/logger');

async function getMarketSentiment() {
    try {
        logger.info('Fetching market sentiment...');
        
        // Fetch all indicators in parallel
        const [vix, fearGreed] = await Promise.all([
            fetchVIX(),
            fetchFearGreed()
        ]);
        
        // Calculate composite score (0-100)
        const compositeScore = calculateComposite(vix, fearGreed);
        
        const result = {
            timestamp: new Date(),
            vix,
            fearGreed,
            composite: compositeScore
        };
        
        logger.info(`Market sentiment complete. Composite: ${compositeScore.score}`);
        return result;
        
    } catch (error) {
        logger.error('Sentiment engine error:', error);
        throw error;
    }
}

function calculateComposite(vix, fearGreed) {
    // Weighted average: VIX 40%, Fear & Greed 60%
    const vixContribution = (100 - vix.signalStrength) * 0.4;
    const fearGreedContribution = fearGreed.currentValue * 0.6;
    
    const weightedScore = vixContribution + fearGreedContribution;
    
    let interpretation;
    if (weightedScore < 30) interpretation = 'EXTREME_BEARISH';
    else if (weightedScore < 45) interpretation = 'BEARISH';
    else if (weightedScore < 55) interpretation = 'NEUTRAL';
    else if (weightedScore < 70) interpretation = 'BULLISH';
    else interpretation = 'EXTREME_BULLISH';
    
    return {
        score: Math.round(weightedScore),
        interpretation,
        confidence: 70
    };
}

module.exports = { getMarketSentiment };
```

### Deliverables:
- ✅ All sentiment indicators working
- ✅ Composite score calculation
- ✅ Sentiment engine complete

---

## STEP 8: Redis Caching Layer
**Duration**: 2-3 hours  
**Goal**: Implement caching for sentiment data

### Tasks:
```bash
npm install redis
```

### File: `src/part1-sentiment/sentimentCache.js`
```javascript
const redis = require('redis');
const config = require('../../config/settings');
const logger = require('../utils/logger');

let client;

async function initCache() {
    try {
        client = redis.createClient({ url: config.redis.url });
        await client.connect();
        logger.info('✅ Redis cache connected');
    } catch (error) {
        logger.warn('⚠️  Redis unavailable, using memory cache');
        client = null;
    }
}

async function getCachedSentiment() {
    if (!client) return null;
    
    try {
        const cached = await client.get('market_sentiment');
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        logger.error('Cache get error:', error);
        return null;
    }
}

async function cacheSentiment(data) {
    if (!client) return;
    
    try {
        await client.setEx(
            'market_sentiment',
            config.cache.sentimentTTL,
            JSON.stringify(data)
        );
        logger.info('Sentiment cached for 1 hour');
    } catch (error) {
        logger.error('Cache set error:', error);
    }
}

module.exports = { initCache, getCachedSentiment, cacheSentiment };
```

### Deliverables:
- ✅ Redis connection working
- ✅ Cache get/set functions
- ✅ Fallback to memory if Redis unavailable

---

## STEP 9: Technical Indicators (Part 2)
**Duration**: 1-2 days  
**Goal**: Implement RSI, MACD, Moving Averages, Bollinger Bands

### Tasks:
```bash
npm install technicalindicators
```

### File: `src/part2-technical/indicators/trendIndicators.js`
```javascript
const { SMA, EMA, MACD } = require('technicalindicators');
const logger = require('../../utils/logger');

function calculateMovingAverages(closes) {
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });
    const sma200 = SMA.calculate({ period: 200, values: closes });
    const ema9 = EMA.calculate({ period: 9, values: closes });
    
    const currentPrice = closes[closes.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const lastSMA50 = sma50[sma50.length - 1];
    const lastSMA200 = sma200[sma200.length - 1];
    
    // Determine trend
    let trend = 'MIXED';
    if (currentPrice > lastSMA20 && lastSMA20 > lastSMA50 && lastSMA50 > lastSMA200) {
        trend = 'STRONG_BULLISH';
    } else if (currentPrice > lastSMA20 && currentPrice > lastSMA50) {
        trend = 'BULLISH';
    } else if (currentPrice < lastSMA20 && currentPrice < lastSMA50) {
        trend = 'BEARISH';
    }
    
    return {
        sma20: lastSMA20,
        sma50: lastSMA50,
        sma200: lastSMA200,
        ema9: ema9[ema9.length - 1],
        trend,
        currentPrice
    };
}

function calculateMACD(closes) {
    const macdData = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    
    const latest = macdData[macdData.length - 1];
    const previous = macdData[macdData.length - 2];
    
    let crossover = 'NONE';
    if (latest.MACD > latest.signal && previous.MACD <= previous.signal) {
        crossover = 'BULLISH';
    } else if (latest.MACD < latest.signal && previous.MACD >= previous.signal) {
        crossover = 'BEARISH';
    }
    
    return {
        macd: latest.MACD,
        signal: latest.signal,
        histogram: latest.histogram,
        crossover
    };
}

module.exports = { calculateMovingAverages, calculateMACD };
```

### File: `src/part2-technical/indicators/momentumIndicators.js`
```javascript
const { RSI, Stochastic } = require('technicalindicators');

function calculateRSI(closes, period = 14) {
    const rsiValues = RSI.calculate({ values: closes, period });
    const current = rsiValues[rsiValues.length - 1];
    
    let interpretation;
    if (current < 30) interpretation = 'OVERSOLD';
    else if (current < 40) interpretation = 'WEAK';
    else if (current < 60) interpretation = 'NEUTRAL';
    else if (current < 70) interpretation = 'STRONG';
    else interpretation = 'OVERBOUGHT';
    
    return {
        value: current,
        interpretation
    };
}

function calculateStochastic(high, low, close) {
    const stochData = Stochastic.calculate({
        high, low, close,
        period: 14,
        signalPeriod: 3
    });
    
    const latest = stochData[stochData.length - 1];
    
    let interpretation;
    if (latest.k < 20 && latest.d < 20) interpretation = 'OVERSOLD';
    else if (latest.k > 80 && latest.d > 80) interpretation = 'OVERBOUGHT';
    else interpretation = 'NEUTRAL';
    
    return {
        k: latest.k,
        d: latest.d,
        interpretation
    };
}

module.exports = { calculateRSI, calculateStochastic };
```

### Deliverables:
- ✅ Moving averages calculated
- ✅ MACD indicator working
- ✅ RSI and Stochastic implemented
- ✅ Trend detection implemented

---

## STEP 10: Market Data Fetcher
**Duration**: 4-5 hours  
**Goal**: Fetch historical price data from FMP

### File: `src/part2-technical/dataFetcher.js`
```javascript
const axios = require('axios');
const config = require('../../config/settings');
const logger = require('../utils/logger');

async function getHistoricalData(ticker, timeframe = '1day', limit = 300) {
    try {
        const url = `https://financialmodelingprep.com/api/v3/historical-chart/${timeframe}/${ticker}?apikey=${config.api.fmp}`;
        const response = await axios.get(url);
        
        if (!response.data || response.data.length === 0) {
            throw new Error(`No data for ${ticker}`);
        }
        
        // Reverse so oldest is first
        const data = response.data.reverse().slice(-limit);
        
        logger.info(`Fetched ${data.length} candles for ${ticker} (${timeframe})`);
        return data;
        
    } catch (error) {
        logger.error(`Data fetch error for ${ticker}:`, error);
        throw error;
    }
}

function extractPriceArrays(candles) {
    return {
        closes: candles.map(c => c.close),
        opens: candles.map(c => c.open),
        highs: candles.map(c => c.high),
        lows: candles.map(c => c.low),
        volumes: candles.map(c => c.volume)
    };
}

module.exports = { getHistoricalData, extractPriceArrays };
```

### Deliverables:
- ✅ Historical data fetcher working
- ✅ Multi-timeframe support
- ✅ Data extraction utilities

---

## STEP 11: Fundamental Analysis (CAN SLIM)
**Duration**: 1 day  
**Goal**: Fetch and score fundamental data

### File: `src/part2-technical/fundamentalAnalyzer.js`
```javascript
const axios = require('axios');
const config = require('../../config/settings');
const logger = require('../utils/logger');

async function getFundamentals(ticker) {
    try {
        const [incomeStmt, keyMetrics, ratios] = await Promise.all([
            fetchIncomeStatement(ticker),
            fetchKeyMetrics(ticker),
            fetchRatios(ticker)
        ]);
        
        const score = calculateCANSLIM(incomeStmt, keyMetrics, ratios);
        
        return {
            income: incomeStmt,
            metrics: keyMetrics,
            ratios,
            canSlim: score
        };
        
    } catch (error) {
        logger.error(`Fundamentals error for ${ticker}:`, error);
        throw error;
    }
}

async function fetchIncomeStatement(ticker) {
    const url = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=8&apikey=${config.api.fmp}`;
    const response = await axios.get(url);
    return response.data;
}

async function fetchKeyMetrics(ticker) {
    const url = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${config.api.fmp}`;
    const response = await axios.get(url);
    return response.data[0];
}

async function fetchRatios(ticker) {
    const url = `https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${config.api.fmp}`;
    const response = await axios.get(url);
    return response.data[0];
}

function calculateCANSLIM(income, metrics, ratios) {
    let score = 0;
    const factors = [];
    
    // C: Current quarterly earnings (25% weight)
    if (income && income.length >= 2) {
        const epsGrowth = ((income[0].eps - income[4].eps) / Math.abs(income[4].eps)) * 100;
        if (epsGrowth > 25) {
            score += 25;
            factors.push(`Strong EPS growth: ${epsGrowth.toFixed(1)}%`);
        } else if (epsGrowth > 15) {
            score += 15;
            factors.push(`Moderate EPS growth: ${epsGrowth.toFixed(1)}%`);
        }
    }
    
    // A: Annual earnings (20% weight)
    if (metrics && metrics.revenuePerShareTTM) {
        const revenueGrowth = metrics.revenueGrowthTTM * 100;
        if (revenueGrowth > 25) {
            score += 20;
            factors.push(`Strong revenue growth: ${revenueGrowth.toFixed(1)}%`);
        } else if (revenueGrowth > 15) {
            score += 10;
            factors.push(`Moderate revenue growth: ${revenueGrowth.toFixed(1)}%`);
        }
    }
    
    // N: New product/management/high (15% weight)
    // This requires news analysis - placeholder
    score += 10;
    
    // S: Supply and demand (10% weight)
    // Requires volume analysis - implemented in technical indicators
    
    // L: Leader or laggard (15% weight)
    if (ratios && ratios.returnOnEquityTTM > 0.17) {
        score += 15;
        factors.push(`High ROE: ${(ratios.returnOnEquityTTM * 100).toFixed(1)}%`);
    }
    
    // I: Institutional sponsorship (5% weight)
    // Requires institutional ownership data
    
    // M: Market direction (10% weight)
    // Use market sentiment from Part 1
    
    return {
        score: Math.min(score, 100),
        grade: getGrade(score),
        factors
    };
}

function getGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

module.exports = { getFundamentals };
```

### Deliverables:
- ✅ Income statement fetcher
- ✅ Key metrics fetcher
- ✅ CAN SLIM scoring algorithm
- ✅ Growth company identification

---

## STEP 12: News Analysis
**Duration**: 4-5 hours  
**Goal**: Fetch and analyze news sentiment

### File: `src/part2-technical/newsAnalyzer.js`
```javascript
const axios = require('axios');
const config = require('../../config/settings');
const logger = require('../utils/logger');

async function getNewsAnalysis(ticker) {
    try {
        const url = `https://newsapi.org/v2/everything?q=${ticker}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${config.api.newsapi}`;
        const response = await axios.get(url);
        
        if (!response.data || !response.data.articles) {
            return { sentiment: 'NEUTRAL', score: 50, articles: [] };
        }
        
        const articles = response.data.articles.slice(0, 10);
        const sentiment = analyzeSentiment(articles);
        
        return {
            sentiment: sentiment.label,
            score: sentiment.score,
            articles: articles.map(a => ({
                title: a.title,
                source: a.source.name,
                publishedAt: a.publishedAt,
                url: a.url
            }))
        };
        
    } catch (error) {
        logger.error(`News analysis error for ${ticker}:`, error);
        return { sentiment: 'NEUTRAL', score: 50, articles: [] };
    }
}

function analyzeSentiment(articles) {
    // Simple keyword-based sentiment (can be improved with NLP)
    const positiveWords = ['surge', 'gain', 'profit', 'growth', 'rally', 'breakthrough', 'record', 'beat', 'strong'];
    const negativeWords = ['fall', 'loss', 'decline', 'crash', 'miss', 'weak', 'concern', 'risk', 'lawsuit'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    articles.forEach(article => {
        const text = (article.title + ' ' + (article.description || '')).toLowerCase();
        
        positiveWords.forEach(word => {
            if (text.includes(word)) positiveCount++;
        });
        
        negativeWords.forEach(word => {
            if (text.includes(word)) negativeCount++;
        });
    });
    
    const total = positiveCount + negativeCount;
    const score = total === 0 ? 50 : (positiveCount / total) * 100;
    
    let label;
    if (score < 30) label = 'BEARISH';
    else if (score < 45) label = 'SLIGHTLY_BEARISH';
    else if (score < 55) label = 'NEUTRAL';
    else if (score < 70) label = 'SLIGHTLY_BULLISH';
    else label = 'BULLISH';
    
    return { label, score: Math.round(score) };
}

module.exports = { getNewsAnalysis };
```

### Deliverables:
- ✅ NewsAPI integration
- ✅ Sentiment analysis algorithm
- ✅ Article filtering and ranking

---

## STEP 13: AI Decision Engine (OpenAI Integration)
**Duration**: 1 day  
**Goal**: Implement AI decision-making with GPT-4

### File: `src/ai/aiEngine.js`
```javascript
const OpenAI = require('openai');
const config = require('../../config/settings');
const logger = require('../utils/logger');
const { prisma } = require('../database/prisma');

const openai = new OpenAI({ apiKey: config.api.openai });

async function makeAIDecision(marketContext, assetAnalysis, portfolioContext) {
    try {
        const prompt = buildPrompt(marketContext, assetAnalysis, portfolioContext);
        
        logger.info(`Requesting AI decision for ${assetAnalysis.ticker}...`);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: getSystemPrompt() },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1500
        });
        
        const aiResponse = response.choices[0].message.content;
        const parsed = parseAIResponse(aiResponse);
        
        // Store AI decision in database
        const aiDecision = await prisma.aIDecision.create({
            data: {
                ticker: assetAnalysis.ticker,
                timestamp: new Date(),
                marketContext: marketContext,
                assetAnalysis: assetAnalysis,
                portfolioContext: portfolioContext,
                aiModel: 'gpt-4-turbo',
                decision: parsed.action,
                confidence: parsed.confidence,
                quantity: parsed.quantity || null,
                suggestedPrice: parsed.price || null,
                stopLoss: parsed.stopLoss || null,
                takeProfit: parsed.takeProfit || null,
                primaryFactors: parsed.primaryFactors || [],
                supportingFactors: parsed.supportingFactors || [],
                riskFactors: parsed.riskFactors || [],
                reasoning: parsed.reasoning,
                riskLevel: parsed.riskLevel || 'MEDIUM',
                maxLossPct: parsed.maxLoss || null,
                rewardRiskRatio: parsed.rewardRisk || null,
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
                apiCostUsd: calculateCost(response.usage)
            }
        });
        
        logger.info(`AI Decision: ${parsed.action} (${parsed.confidence}% confidence) - ID: ${aiDecision.id}`);
        
        return {
            ...parsed,
            decisionId: aiDecision.id,
            cost: aiDecision.apiCostUsd
        };
        
    } catch (error) {
        logger.error('AI engine error:', error);
        throw error;
    }
}

function getSystemPrompt() {
    return `You are an expert quantitative analyst and portfolio manager with 20+ years of experience trading stocks. 
    
Your task is to analyze market data, technical indicators, fundamental metrics, and news sentiment to make BUY, SELL, or HOLD recommendations.

CRITICAL RULES:
1. Always provide your response in the following JSON format (no markdown, just raw JSON):
{
  "action": "BUY|SELL|HOLD",
  "confidence": 0-100,
  "quantity": number,
  "price": number,
  "stopLoss": number,
  "takeProfit": number,
  "reasoning": "detailed explanation",
  "primaryFactors": ["factor1", "factor2"],
  "supportingFactors": ["factor1", "factor2"],
  "riskFactors": ["risk1", "risk2"],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "maxLoss": percentage,
  "rewardRisk": ratio
}

2. Consider position sizing based on risk (max 2% loss per trade)
3. Set stop losses at 2x ATR below entry
4. Set take profits at 3:1 reward:risk minimum
5. Account for sector exposure limits
6. Never recommend more than 10% portfolio allocation to single position
7. Confidence below 70% should result in HOLD`;
}

function buildPrompt(marketContext, assetAnalysis, portfolioContext) {
    return `
MARKET CONTEXT:
${JSON.stringify(marketContext, null, 2)}

ASSET ANALYSIS (${assetAnalysis.ticker}):
${JSON.stringify(assetAnalysis, null, 2)}

PORTFOLIO CONTEXT:
${JSON.stringify(portfolioContext, null, 2)}

Provide your trading recommendation in JSON format.`;
}

function parseAIResponse(response) {
    try {
        // Remove markdown code blocks if present
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        logger.error('Failed to parse AI response:', error);
        return {
            action: 'HOLD',
            confidence: 0,
            reasoning: 'Error parsing AI response'
        };
    }
}

function calculateCost(usage) {
    // GPT-4-turbo pricing: $10/1M input tokens, $30/1M output tokens
    const inputCost = (usage.prompt_tokens / 1000000) * 10;
    const outputCost = (usage.completion_tokens / 1000000) * 30;
    return Number((inputCost + outputCost).toFixed(6));
}

module.exports = { makeAIDecision };
```

### Deliverables:
- ✅ OpenAI GPT-4 integration
- ✅ Prompt engineering
- ✅ Response parsing
- ✅ AI decision storage in database
- ✅ Cost tracking

---

## STEP 14: IBKR Integration & Order Execution
**Duration**: 1-2 days  
**Goal**: Connect to Interactive Brokers and execute trades

### Tasks:
```bash
npm install @stoqey/ib
```

### File: `src/execution/ibkrClient.js`
```javascript
const { IBApi, EventName, ErrorCode, OrderAction, OrderType, Contract } = require('@stoqey/ib');
const config = require('../../config/settings');
const logger = require('../utils/logger');

let ib;
let connected = false;

async function connect() {
    try {
        ib = new IBApi({
            clientId: config.ibkr.clientId,
            host: config.ibkr.host,
            port: config.ibkr.port
        });
        
        ib.on(EventName.connected, () => {
            logger.info('✅ Connected to IBKR');
            connected = true;
        });
        
        ib.on(EventName.disconnected, () => {
            logger.warn('⚠️  Disconnected from IBKR');
            connected = false;
        });
        
        ib.on(EventName.error, (err, code, reqId) => {
            logger.error(`IBKR Error [${code}]:`, err);
        });
        
        await ib.connect();
        
    } catch (error) {
        logger.error('IBKR connection error:', error);
        throw error;
    }
}

async function placeOrder(ticker, action, quantity, orderType = 'MARKET') {
    if (!connected) {
        throw new Error('Not connected to IBKR');
    }
    
    try {
        const contract = {
            symbol: ticker,
            secType: 'STK',
            exchange: 'SMART',
            currency: 'USD'
        };
        
        const order = {
            action: action === 'BUY' ? OrderAction.BUY : OrderAction.SELL,
            orderType: orderType === 'MARKET' ? OrderType.MKT : OrderType.LMT,
            totalQuantity: quantity,
            transmit: true
        };
        
        logger.info(`Placing ${action} order: ${quantity} ${ticker} (${orderType})`);
        
        const orderId = await ib.placeOrder(contract, order);
        
        logger.info(`Order placed successfully. Order ID: ${orderId}`);
        
        return {
            orderId,
            status: 'SUBMITTED',
            timestamp: new Date()
        };
        
    } catch (error) {
        logger.error('Order placement error:', error);
        throw error;
    }
}

async function getAccountSummary() {
    if (!connected) {
        throw new Error('Not connected to IBKR');
    }
    
    return new Promise((resolve, reject) => {
        const summary = {};
        
        ib.on(EventName.accountSummary, (reqId, account, tag, value, currency) => {
            summary[tag] = { value, currency };
        });
        
        ib.on(EventName.accountSummaryEnd, () => {
            resolve(summary);
        });
        
        ib.reqAccountSummary('All');
    });
}

module.exports = { connect, placeOrder, getAccountSummary };
```

### File: `src/execution/orderExecutor.js`
```javascript
const { placeOrder } = require('./ibkrClient');
const { prisma } = require('../database/prisma');
const logger = require('../utils/logger');

async function executeAIDecision(aiDecision) {
    try {
        if (aiDecision.action === 'HOLD') {
            logger.info('AI decision: HOLD - no action taken');
            return null;
        }
        
        if (aiDecision.confidence < 70) {
            logger.info(`Confidence too low (${aiDecision.confidence}%) - skipping trade`);
            return null;
        }
        
        // Execute order via IBKR
        const orderResult = await placeOrder(
            aiDecision.ticker,
            aiDecision.action,
            aiDecision.quantity,
            'MARKET'
        );
        
        // Store in database
        if (aiDecision.action === 'BUY') {
            await prisma.portfolio.create({
                data: {
                    ticker: aiDecision.ticker,
                    quantity: aiDecision.quantity,
                    entryPrice: aiDecision.price,
                    entryDate: new Date(),
                    stopLoss: aiDecision.stopLoss,
                    takeProfit: aiDecision.takeProfit,
                    status: 'OPEN'
                }
            });
        } else if (aiDecision.action === 'SELL') {
            const position = await prisma.portfolio.findFirst({
                where: { ticker: aiDecision.ticker, status: 'OPEN' }
            });
            
            if (position) {
                const realizedPnL = (aiDecision.price - position.entryPrice) * position.quantity;
                
                // Close position
                await prisma.portfolio.update({
                    where: { id: position.id },
                    data: { status: 'CLOSED' }
                });
                
                // Record in trade history
                await prisma.tradeHistory.create({
                    data: {
                        orderId: orderResult.orderId,
                        ticker: aiDecision.ticker,
                        action: 'SELL',
                        quantity: position.quantity,
                        entryPrice: position.entryPrice,
                        exitPrice: aiDecision.price,
                        entryDate: position.entryDate,
                        exitDate: new Date(),
                        realizedPnL: realizedPnL,
                        realizedPnLPct: (realizedPnL / (position.entryPrice * position.quantity)) * 100
                    }
                });
                
                // Tax transaction
                await createTaxTransaction(position, aiDecision.price);
            }
        }
        
        // Update AI decision with execution details
        await prisma.aIDecision.update({
            where: { id: aiDecision.decisionId },
            data: {
                executed: true,
                executedAt: new Date()
            }
        });
        
        logger.info(`✅ Order executed: ${aiDecision.action} ${aiDecision.quantity} ${aiDecision.ticker}`);
        return orderResult;
        
    } catch (error) {
        logger.error('Order execution error:', error);
        throw error;
    }
}

async function createTaxTransaction(position, exitPrice) {
    const holdingPeriod = Math.floor((new Date() - position.entryDate) / (1000 * 60 * 60 * 24));
    const costBasis = position.entryPrice * position.quantity;
    const proceeds = exitPrice * position.quantity;
    const capitalGain = proceeds - costBasis;
    
    await prisma.taxTransaction.create({
        data: {
            transactionDate: new Date(),
            taxYear: new Date().getFullYear(),
            ticker: position.ticker,
            description: `Sale of ${position.quantity} shares`,
            transactionType: 'SELL',
            quantity: position.quantity,
            pricePerShare: exitPrice,
            totalAmount: proceeds,
            costBasis: costBasis,
            proceeds: proceeds,
            capitalGain: capitalGain,
            gainType: holdingPeriod > 365 ? 'LONG_TERM' : 'SHORT_TERM',
            washSale: false,
            form8949Required: true
        }
    });
}

module.exports = { executeAIDecision };
```

### Deliverables:
- ✅ IBKR API integration
- ✅ Order placement functionality
- ✅ Position tracking in database
- ✅ Tax transaction logging
- ✅ Trade history recording

---

## STEP 15: Dashboard UI & Final Testing
**Duration**: 2-3 days  
**Goal**: Create web dashboard for monitoring

### File: `src/ui/public/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Trading Dashboard</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <header>
        <h1>🤖 AI Trading Dashboard</h1>
        <div id="status">
            <span class="badge" id="market-status">Market: CLOSED</span>
            <span class="badge" id="bot-status">Bot: IDLE</span>
        </div>
    </header>

    <main>
        <section class="card">
            <h2>📊 Market Sentiment</h2>
            <div id="sentiment-data">Loading...</div>
        </section>

        <section class="card">
            <h2>💼 Portfolio</h2>
            <div id="portfolio-data">Loading...</div>
        </section>

        <section class="card">
            <h2>🎯 Recent AI Decisions</h2>
            <div id="ai-decisions">Loading...</div>
        </section>

        <section class="card">
            <h2>📈 Performance</h2>
            <div id="performance-data">Loading...</div>
        </section>
    </main>

    <script src="/js/dashboard.js"></script>
</body>
</html>
```

### File: `src/ui/routes/sentiment.js`
```javascript
const express = require('express');
const router = express.Router();
const { getMarketSentiment } = require('../../part1-sentiment/sentimentEngine');
const { getCachedSentiment, cacheSentiment } = require('../../part1-sentiment/sentimentCache');

router.get('/', async (req, res) => {
    try {
        // Check cache first
        let sentiment = await getCachedSentiment();
        
        if (!sentiment) {
            sentiment = await getMarketSentiment();
            await cacheSentiment(sentiment);
        }
        
        res.json(sentiment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### File: `src/ui/routes/trading.js`
```javascript
const express = require('express');
const router = express.Router();
const { prisma } = require('../../database/prisma');

router.get('/portfolio', async (req, res) => {
    try {
        const positions = await prisma.portfolio.findMany({
            where: { status: 'OPEN' }
        });
        
        res.json(positions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/decisions', async (req, res) => {
    try {
        const decisions = await prisma.aIDecision.findMany({
            orderBy: { timestamp: 'desc' },
            take: 20
        });
        
        res.json(decisions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/performance', async (req, res) => {
    try {
        const trades = await prisma.tradeHistory.findMany({
            where: { exitDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        });
        
        const totalTrades = trades.length;
        const wins = trades.filter(t => t.realizedPnL > 0).length;
        const losses = trades.filter(t => t.realizedPnL < 0).length;
        const totalPnL = trades.reduce((sum, t) => sum + t.realizedPnL, 0);
        
        res.json({
            totalTrades,
            wins,
            losses,
            winRate: totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0,
            totalPnL: totalPnL.toFixed(2),
            avgWin: wins > 0 ? (trades.filter(t => t.realizedPnL > 0).reduce((sum, t) => sum + t.realizedPnL, 0) / wins).toFixed(2) : 0,
            avgLoss: losses > 0 ? (trades.filter(t => t.realizedPnL < 0).reduce((sum, t) => sum + t.realizedPnL, 0) / losses).toFixed(2) : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### Main Integration File: `src/index.js`
```javascript
const { testConnection } = require('./database/prisma');
const { connect: connectIBKR } = require('./execution/ibkrClient');
const { initCache } = require('./part1-sentiment/sentimentCache');
const logger = require('./utils/logger');
require('./ui/server');

async function initialize() {
    try {
        logger.info('🚀 Starting AI Trading Bot...');
        
        // 1. Test database connection
        await testConnection();
        
        // 2. Initialize Redis cache
        await initCache();
        
        // 3. Connect to IBKR
        await connectIBKR();
        
        logger.info('✅ All systems initialized successfully');
        
        // Start trading loop (optional - can be triggered manually via API)
        // await startTradingLoop();
        
    } catch (error) {
        logger.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}

initialize();
```

### Deliverables:
- ✅ Web dashboard UI
- ✅ API routes for all features
- ✅ Real-time data display
- ✅ Performance metrics
- ✅ Complete integration testing

---

## 🎯 Implementation Summary

### Phase 1: Foundation (Steps 1-5)
- Project setup, database, logging, API server
- **Duration**: 3-4 days
- **Testing**: Health endpoint, database connection, log files

### Phase 2: Sentiment Engine (Steps 6-8)
- VIX, Fear & Greed, Redis caching
- **Duration**: 2-3 days
- **Testing**: API endpoints return sentiment data

### Phase 3: Technical Analysis (Steps 9-10)
- All indicators, historical data fetching
- **Duration**: 2-3 days
- **Testing**: Indicator calculations accurate

### Phase 4: Advanced Analysis (Steps 11-12)
- Fundamentals, news analysis
- **Duration**: 2 days
- **Testing**: CAN SLIM scores, news sentiment

### Phase 5: AI & Execution (Steps 13-14)
- OpenAI integration, IBKR trading
- **Duration**: 2-3 days
- **Testing**: Paper trading first!

### Phase 6: UI & Polish (Step 15)
- Dashboard, monitoring, final testing
- **Duration**: 2-3 days
- **Testing**: End-to-end workflow

---
🔴 Step 7: Technical Indicators
🔴 Step 8: Market Data Fetcher
🔴 Step 9: Fundamental Analysis
🔴 Step 10: News Analysis
🔴 Step 11: AI Decision Engine
🔴 Step 12: IBKR Integration
🔴 Step 13: Dashboard UI

## ✅ Next Steps

After completing all 15 steps:

1. **Backtesting**: Run historical simulations (2020-2024 data)
2. **Paper Trading**: Test with IBKR paper account for 2-4 weeks
3. **Optimization**: Tune confidence thresholds, position sizing
4. **Live Trading**: Start with small capital ($5,000-$10,000)
5. **Monitoring**: Daily review of AI decisions and performance
6. **Tax Reports**: Generate quarterly tax transaction summaries

---