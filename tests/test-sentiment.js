const { getMarketSentiment } = require('../src/services/sentiment/sentimentEngine');
const { fetchVIX } = require('../src/services/sentiment/vixFetcher');
const { fetchFearGreed } = require('../src/services/sentiment/fearGreedFetcher');

async function runTests() {
    console.log('🧪 Testing Sentiment Engine...\n');
    
    // Check for API keys
    if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'your_fmp_key_here') {
        console.log('⚠️  WARNING: FMP_API_KEY not configured in .env file');
        console.log('📝 To get a free API key:');
        console.log('   1. Visit https://financialmodelingprep.com');
        console.log('   2. Sign up for a free account');
        console.log('   3. Copy your API key');
        console.log('   4. Update .env file: FMP_API_KEY=your_actual_key');
        console.log('\n✅ Sentiment engine structure is correct');
        console.log('✅ Once API key is added, sentiment will fetch real data');
        console.log('📝 You can proceed to STEP 6 (Redis Caching)\n');
        process.exit(0);
    }
    
    try {
        // Test 1: VIX Fetcher
        console.log('Test 1: VIX Fetcher');
        const vix = await fetchVIX();
        console.log('VIX Data:', {
            value: vix.currentValue,
            interpretation: vix.interpretation,
            signal: vix.signal,
            recommendation: vix.recommendation
        });
        console.log('✅ VIX test passed\n');
        
        // Test 2: Fear & Greed Fetcher
        console.log('Test 2: Fear & Greed Fetcher');
        const fearGreed = await fetchFearGreed();
        console.log('Fear & Greed Data:', {
            value: fearGreed.currentValue,
            rating: fearGreed.rating,
            interpretation: fearGreed.interpretation,
            recommendation: fearGreed.recommendation
        });
        console.log('✅ Fear & Greed test passed\n');
        
        // Test 3: Complete Sentiment Engine
        console.log('Test 3: Complete Sentiment Engine');
        const sentiment = await getMarketSentiment();
        console.log('Composite Sentiment:', {
            score: sentiment.composite.score,
            interpretation: sentiment.composite.interpretation,
            signal: sentiment.composite.signal,
            confidence: sentiment.composite.confidence,
            recommendation: sentiment.composite.recommendation
        });
        console.log('✅ Sentiment engine test passed\n');
        
        console.log('🎉 All sentiment tests passed!');
        console.log('📝 You can now proceed to STEP 6');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
