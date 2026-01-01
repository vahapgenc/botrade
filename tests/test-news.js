require('dotenv').config();
const { 
    getNewsForTicker, 
    getNewsByTopics, 
    getLatestMarketNews, 
    getSentimentSignal,
    getNewsAnalysis // Legacy
} = require('../src/services/news/newsAnalyzer');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing Multi-Source News Analysis with Fallback Strategy...\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
        await initCache();
        
        // Test 1: Multi-source fallback for ticker news
        console.log('📋 TEST 1: Multi-Source News Fetching (NewsAPI → Alpha Vantage → Google News)');
        console.log('─────────────────────────────────────────────────────────────');
        const tickerNews = await getNewsForTicker('AAPL', { limit: 20, lookbackDays: 7 });
        
        console.log(`✓ Ticker: ${tickerNews.ticker}`);
        console.log(`✓ Source Used: ${tickerNews.source}`);
        console.log(`✓ Articles Returned: ${tickerNews.itemsReturned}`);
        console.log(`✓ Overall Sentiment: ${tickerNews.sentiment.overall} (${tickerNews.sentiment.score})`);
        console.log(`✓ Bullish: ${tickerNews.sentiment.bullish} | Bearish: ${tickerNews.sentiment.bearish} | Neutral: ${tickerNews.sentiment.neutral}`);
        console.log(`✓ Distribution: ${tickerNews.sentiment.distribution.bullish} bullish, ${tickerNews.sentiment.distribution.bearish} bearish`);
        
        if (tickerNews.articles && tickerNews.articles.length > 0) {
            console.log('\n📰 Top 3 Headlines:');
            tickerNews.articles.slice(0, 3).forEach((article, idx) => {
                console.log(`\n  ${idx + 1}. ${article.title}`);
                console.log(`     Sentiment: ${article.sentiment.label} (${article.sentiment.score.toFixed(3)})`);
                console.log(`     Source: ${article.source}`);
                console.log(`     Published: ${new Date(article.timePublished).toLocaleString()}`);
            });
        }
        
        console.log('\n✅ Test 1 passed!\n');
        
        // Test 2: Alpha Vantage topic-based news
        console.log('📋 TEST 2: Topic-Based News (Alpha Vantage exclusive)');
        console.log('─────────────────────────────────────────────────────────────');
        
        if (process.env.ALPHA_VANTAGE_API_KEY) {
            const topicNews = await getNewsByTopics(['technology', 'earnings'], { limit: 10 });
            
            console.log(`✓ Topics: ${topicNews.topics.join(', ')}`);
            console.log(`✓ Source: ${topicNews.source}`);
            console.log(`✓ Articles Returned: ${topicNews.itemsReturned}`);
            console.log(`✓ Overall Sentiment: ${topicNews.sentiment.overall} (${topicNews.sentiment.score})`);
            
            if (topicNews.articles && topicNews.articles.length > 0) {
                console.log('\n📰 Sample Article:');
                const article = topicNews.articles[0];
                console.log(`  Title: ${article.title}`);
                console.log(`  Sentiment: ${article.sentiment.label} (${article.sentiment.score})`);
                if (article.topics && article.topics.length > 0) {
                    console.log(`  Topics: ${article.topics.map(t => t.topic).join(', ')}`);
                }
            }
            
            console.log('\n✅ Test 2 passed!\n');
        } else {
            console.log('⚠️  Skipped: ALPHA_VANTAGE_API_KEY not configured\n');
        }
        
        // Test 3: Market news
        console.log('📋 TEST 3: Latest Market News');
        console.log('─────────────────────────────────────────────────────────────');
        
        if (process.env.ALPHA_VANTAGE_API_KEY) {
            const marketNews = await getLatestMarketNews({ limit: 10 });
            
            console.log(`✓ Articles Returned: ${marketNews.itemsReturned}`);
            console.log(`✓ Overall Sentiment: ${marketNews.sentiment.overall} (${marketNews.sentiment.score})`);
            console.log(`✓ Distribution: ${marketNews.sentiment.distribution.bullish} bullish, ${marketNews.sentiment.distribution.bearish} bearish`);
            
            console.log('\n✅ Test 3 passed!\n');
        } else {
            console.log('⚠️  Skipped: ALPHA_VANTAGE_API_KEY not configured\n');
        }
        
        // Test 4: Trading signal generation
        console.log('📋 TEST 4: Sentiment-Based Trading Signal');
        console.log('─────────────────────────────────────────────────────────────');
        const signal = await getSentimentSignal('TSLA', { limit: 30 });
        
        console.log(`✓ Ticker: ${signal.ticker}`);
        console.log(`✓ Signal: ${signal.signal}`);
        console.log(`✓ Strength: ${signal.strength}`);
        console.log(`✓ Recommendation: ${signal.recommendation}`);
        console.log(`✓ Sentiment Score: ${signal.sentiment.score}`);
        console.log(`✓ Sentiment Label: ${signal.sentiment.overall}`);
        
        if (signal.recentArticles && signal.recentArticles.length > 0) {
            console.log('\n📰 Recent Headlines Analyzed:');
            signal.recentArticles.slice(0, 3).forEach((article, idx) => {
                console.log(`  ${idx + 1}. ${article.title}`);
                console.log(`     Sentiment: ${article.sentiment.label} (${article.sentiment.score.toFixed(3)})`);
            });
        }
        
        console.log('\n✅ Test 4 passed!\n');
        
        // Test 5: Legacy compatibility
        console.log('📋 TEST 5: Legacy getNewsAnalysis (Backward Compatibility)');
        console.log('─────────────────────────────────────────────────────────────');
        const legacy = await getNewsAnalysis('MSFT', 'Microsoft', 7);
        
        console.log(`✓ Ticker: ${legacy.ticker}`);
        console.log(`✓ Company: ${legacy.companyName}`);
        console.log(`✓ Articles Found: ${legacy.articlesFound}`);
        console.log(`✓ Sentiment Score: ${legacy.sentiment.score}/100`);
        console.log(`✓ Sentiment Label: ${legacy.sentiment.label}`);
        console.log(`✓ Trend Direction: ${legacy.trends.direction}`);
        console.log(`✓ Trend Momentum: ${legacy.trends.momentum}`);
        
        console.log('\n✅ Test 5 passed!\n');
        
        // Summary
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\n📊 Fallback Strategy Summary:');
        console.log('  1. NewsAPI (Primary): ' + (process.env.NEWS_API_KEY ? '✓ Configured' : '✗ Not configured'));
        console.log('  2. Alpha Vantage (Fallback): ' + (process.env.ALPHA_VANTAGE_API_KEY ? '✓ Configured' : '✗ Not configured'));
        console.log('  3. Google News RSS (Last Resort): ✓ Always available (no API key)');
        console.log('\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
    
    process.exit(0);
}

runTests();
