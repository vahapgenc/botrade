require('dotenv').config();
const { initCache } = require('../src/services/cache/cacheManager');
const { getNewsForTicker, getSentimentSignal } = require('../src/services/news/newsAnalyzer');
const { analyzeTechnicals } = require('../src/services/technical/technicalAnalyzer');
const { getHistoricalData, getCurrentPrice } = require('../src/services/market/dataFetcher');
const { getFundamentals } = require('../src/services/fundamental/fundamentalAnalyzer');
const { fetchFearGreed } = require('../src/services/sentiment/fearGreedFetcher');
const { fetchVIX } = require('../src/services/sentiment/vixFetcher');

/**
 * This script shows ALL input data that will be available to the AI Decision Engine
 * Run this to see what the AI will "see" when making trading decisions
 */

async function showAIInputData(ticker = 'AAPL') {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         AI DECISION ENGINE - INPUT DATA PREVIEW              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`Analyzing: ${ticker}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
        await initCache();
        
        // 1. MARKET DATA (Step 8)
        console.log('📈 1. MARKET DATA (Price, Volume, OHLC)');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const marketData = await getHistoricalData(ticker, 5);
            if (marketData && marketData.length > 0) {
                const latest = marketData[0];
                console.log(`✓ Current Price: $${latest.close}`);
                console.log(`✓ Open: $${latest.open} | High: $${latest.high} | Low: $${latest.low}`);
                console.log(`✓ Volume: ${latest.volume.toLocaleString()}`);
                console.log(`✓ Data Points: ${marketData.length} recent bars`);
                console.log(`✓ Date: ${new Date(latest.timestamp).toLocaleDateString()}`);
            } else {
                console.log('⚠️  No market data available (check Polygon API key)');
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('\n');
        
        // 2. TECHNICAL INDICATORS (Step 7)
        console.log('📊 2. TECHNICAL INDICATORS (RSI, MACD, Bollinger Bands, etc.)');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const technical = await analyzeTechnicals(ticker);
            
            if (technical.error) {
                console.log(`⚠️  ${technical.error}`);
            } else {
                console.log(`✓ RSI: ${technical.rsi?.value?.toFixed(2) || 'N/A'} (${technical.rsi?.signal || 'N/A'})`);
                console.log(`✓ MACD: ${technical.macd?.histogram?.toFixed(4) || 'N/A'} (${technical.macd?.signal || 'N/A'})`);
                console.log(`✓ Bollinger Bands: ${technical.bollingerBands?.position || 'N/A'}`);
                console.log(`✓ Moving Averages:`);
                console.log(`  - SMA 20: $${technical.movingAverages?.sma20?.toFixed(2) || 'N/A'}`);
                console.log(`  - SMA 50: $${technical.movingAverages?.sma50?.toFixed(2) || 'N/A'}`);
                console.log(`  - EMA 12: $${technical.movingAverages?.ema12?.toFixed(2) || 'N/A'}`);
                
                // Overall technical signal
                const signals = [
                    technical.rsi?.signal,
                    technical.macd?.signal,
                    technical.stochastic?.signal,
                    technical.adx?.signal
                ].filter(s => s);
                
                const buySignals = signals.filter(s => s === 'BUY').length;
                const sellSignals = signals.filter(s => s === 'SELL').length;
                const holdSignals = signals.filter(s => s === 'HOLD' || s === 'NEUTRAL').length;
                
                console.log(`\n✓ Signal Summary: ${buySignals} BUY | ${sellSignals} SELL | ${holdSignals} HOLD`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('\n');
        
        // 3. NEWS SENTIMENT (Step 10)
        console.log('📰 3. NEWS SENTIMENT (Multi-Source Analysis)');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const news = await getNewsForTicker(ticker, { limit: 20, lookbackDays: 7 });
            
            console.log(`✓ Source Used: ${news.source}`);
            console.log(`✓ Articles Analyzed: ${news.itemsReturned}`);
            console.log(`✓ Sentiment: ${news.sentiment.overall} (${news.sentiment.score.toFixed(4)})`);
            console.log(`✓ Distribution:`);
            console.log(`  - Bullish: ${news.sentiment.bullish} articles (${news.sentiment.distribution?.bullish || '0%'})`);
            console.log(`  - Bearish: ${news.sentiment.bearish} articles (${news.sentiment.distribution?.bearish || '0%'})`);
            console.log(`  - Neutral: ${news.sentiment.neutral} articles (${news.sentiment.distribution?.neutral || '0%'})`);
            
            // Show trading signal from sentiment
            const signal = await getSentimentSignal(ticker, { limit: 20 });
            console.log(`\n✓ Trading Signal: ${signal.signal} (${signal.strength})`);
            console.log(`✓ Recommendation: ${signal.recommendation}`);
            
            // Show recent headlines
            if (news.articles && news.articles.length > 0) {
                console.log('\n📝 Recent Headlines:');
                news.articles.slice(0, 3).forEach((article, idx) => {
                    console.log(`  ${idx + 1}. ${article.title.substring(0, 70)}...`);
                    console.log(`     Sentiment: ${article.sentiment.label} (${article.sentiment.score.toFixed(3)})`);
                });
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('\n');
        
        // 4. FUNDAMENTAL ANALYSIS (Step 9)
        console.log('💰 4. FUNDAMENTAL ANALYSIS (CAN SLIM Scoring)');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const fundamental = await getFundamentals(ticker);
            
            if (fundamental.error) {
                console.log(`⚠️  ${fundamental.error}`);
                console.log(`Note: FMP API requires paid subscription since Aug 31, 2025`);
            } else {
                console.log(`✓ Overall Score: ${fundamental.score}/100 (Grade: ${fundamental.grade})`);
                console.log(`✓ Rating: ${fundamental.rating}`);
                console.log('\nCAN SLIM Breakdown:');
                console.log(`  C - Current Earnings: ${fundamental.factors.currentEarnings.score}/15`);
                console.log(`  A - Annual Earnings: ${fundamental.factors.annualEarnings.score}/15`);
                console.log(`  N - Newness: ${fundamental.factors.newness.score}/15`);
                console.log(`  S - Supply/Demand: ${fundamental.factors.supplyDemand.score}/15`);
                console.log(`  L - Leadership: ${fundamental.factors.leadership.score}/15`);
                console.log(`  I - Institutional: ${fundamental.factors.institutional.score}/15`);
                console.log(`  M - Market Direction: ${fundamental.factors.marketDirection.score}/10`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('\n');
        
        // 5. MARKET SENTIMENT (Fear & Greed, VIX)
        console.log('😱 5. MARKET SENTIMENT (Fear & Greed Index, VIX)');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            // Fear & Greed Index
            const fearGreed = await fetchFearGreed();
            console.log(`✓ Fear & Greed Index: ${fearGreed.value}/100 (${fearGreed.valueText})`);
            console.log(`✓ Market Emotion: ${fearGreed.emotion}`);
            
            // VIX (Volatility Index)
            const vix = await fetchVIX();
            console.log(`✓ VIX: ${vix.value?.toFixed(2) || 'N/A'}`);
            console.log(`✓ Market Volatility: ${vix.interpretation || 'N/A'}`);
            console.log(`✓ Signal: ${vix.signal || 'N/A'}`);
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        console.log('\n');
        
        // Summary - What AI will see
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🤖 AI DECISION ENGINE - INPUT SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('The AI will combine ALL of the above data to make decisions:');
        console.log('');
        console.log('1. ✅ Market Data → Current price, volume, trends');
        console.log('2. ✅ Technical Indicators → RSI, MACD, Bollinger Bands, MAs');
        console.log('3. ✅ News Sentiment → Article analysis, sentiment scores');
        console.log('4. ✅ Fundamental Analysis → CAN SLIM scoring (when available)');
        console.log('5. ✅ Market Sentiment → Fear/Greed index, VIX volatility');
        console.log('');
        console.log('Step 11 will create an AI that:');
        console.log('  • Weighs all these factors intelligently');
        console.log('  • Identifies patterns and correlations');
        console.log('  • Generates BUY/SELL/HOLD signals with confidence scores');
        console.log('  • Provides reasoning for each decision');
        console.log('  • Adapts to market conditions dynamically');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

// Run with command line argument or default to AAPL
const ticker = process.argv[2] || 'AAPL';
showAIInputData(ticker);
