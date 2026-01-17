# Plan: Full TWS Integration for AI Trading Bot

## Goal
Create a fully autonomous trading bot that:
1. Fetches watchlists.
2. Performs analysis (Technical, Fundamental, News, Sentiment) using **primarily IBKR TWS API**.
3. Ranks stocks based on analysis.
4. Executes trades (Stock or Options) for the best-ranked candidates.

## Data Source Analysis
| Analysis Type | TWS API Capability | Current Implementation Status | Recommended Action |
|---------------|-------------------|-------------------------------|--------------------|
| **Technical** | ✅ **YES** (Historical Data) | `market/dataFetcher.js` has `fetchFromIBKR`. | **Existing is Good.** Ensure fallback to AlphaVantage remains for reliability. |
| **Fundamental** | ✅ **YES** (Reuters/Reports) | `fundamental/fundamentalAnalyzer.js` has `fetchFromIBKR` implementing `ReportsFinSummary`. | **Existing is Good.** Uses TWS `reqFundamentalData`. |
| **News** | ✅ **YES** (News Providers) | `news/newsAnalyzer.js` has `fetchFromIBKR`. | **Needs Improvement.** Currently fetches headlines but skips sentiment scoring for IBKR source. |
| **Sentiment** | ⚠️ **PARTIAL** (Derivative) | Derived from News + VIX. TWS provides the *source* (News) but not the *score*. | **Enhance** `newsAnalyzer.js` to run sentiment analysis on IBKR headlines. |

## Implementation Plan

### Step 1: Verify & Enhance TWS Data Fetching
- [ ] **News Sentiment Fix**: Update `services/news/newsAnalyzer.js`.
    - Modify `fetchFromIBKR` or the aggregation logic to run `analyzeSentiment(headline)` on news items fetched from TWS.
    - Ensure `getNewsForTicker` correctly calculates the aggregate sentiment score when IBKR is the source.
- [ ] **Integration Test**: Create `tests/test-tws-full-fetch.js` to verify you can get data from all 3 categories (Price, Fund, News) for a single ticker via TWS solely (disconnecting other APIs temporarily).

### Step 2: Implement "Ranking & Selection" Engine
You have `makeAIDecision` for *single* stock analysis. You need a **Batch Processor**.

- [ ] Create `services/ai/rankingEngine.js`:
    - **Input**: Array of tickers (Watchlist).
    - **Process**:
        - Iterate tickers provided.
        - Run `makeAIDecision(ticker)` (concurrently with limit, e.g., batch of 5).
        - Collect outputs: `confidence`, `signal` (BUY/SELL), `sentimentScore`.
    - **Logic**:
        - Filter: Must be `signal === 'BUY'`.
        - Filter: `confidence > 75`.
        - Sort by: `confidence` (desc) then `sentiment.score` (desc).
    - **Output**: Ranked list of opportunities.

### Step 3: Execution Logic
- [ ] Create `services/trading/autoTrader.js` (The "Bot"):
    - Load Watchlist (from DB or file).
    - Call `rankingEngine.getTopOpportunities()`.
    - Select Top 1.
    - Calculate position size (risk management).
    - Call `orderService.executeTrade()`.

### Step 4: Infrastructure & Scheduling
- [ ] Create a main entry point script `src/bot.js`.
- [ ] Add scheduling (cron) to run analysis at specific times (e.g., Market Open + 30mins).

## Current Implementation Quality Review
- **Architecture**: Excellent. Micro-service style separation (`market`, `fundamental`, `news`, `ibkr`) is clean.
- **Resilience**: The fallback strategy (TWS -> AlphaVantage -> FMP) is a best practice.
- **AI Integration**: The `aiEngine.js` prompt construction looks comprehensive.
- **Gap**: The only significant gap is the missing sentiment scoring on TWS-sourced news.

## Next Action
I recommend we start by fixing the **News Sentiment** gap, then build the **Ranking Engine**.
