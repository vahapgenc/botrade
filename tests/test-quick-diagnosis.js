require('dotenv').config();
const { initCache } = require('../src/services/cache/cacheManager');

/**
 * Quick test to identify which service is hanging
 */

async function quickTest() {
    console.log('Starting quick diagnosis...\n');
    
    try {
        console.log('1. Testing cache initialization...');
        await Promise.race([
            initCache(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cache init timeout')), 5000))
        ]);
        console.log('✅ Cache OK\n');
        
        console.log('2. Testing market data...');
        const { getHistoricalData } = require('../src/services/market/dataFetcher');
        await Promise.race([
            getHistoricalData('AAPL', 5),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Market data timeout')), 10000))
        ]);
        console.log('✅ Market data OK\n');
        
    } catch (error) {
        console.error('❌ Failed at:', error.message);
        process.exit(1);
    }
    
    try {
        console.log('3. Testing technical analysis...');
        const { analyzeTechnicals } = require('../src/services/technical/technicalAnalyzer');
        const { extractPriceArrays } = require('../src/services/market/dataFetcher');
        
        // Get market data first
        const { getHistoricalData } = require('../src/services/market/dataFetcher');
        const marketData = await getHistoricalData('AAPL', 250);
        const priceData = extractPriceArrays(marketData);
        
        await Promise.race([
            analyzeTechnicals(priceData),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Technical timeout')), 10000))
        ]);
        console.log('✅ Technical analysis OK\n');
        
    } catch (error) {
        console.error('❌ Failed at:', error.message);
        process.exit(1);
    }
    
    try {
        console.log('4. Testing news sentiment...');
        const { getNewsForTicker } = require('../src/services/news/newsAnalyzer');
        await Promise.race([
            getNewsForTicker('AAPL', { limit: 10, lookbackDays: 3 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('News timeout')), 10000))
        ]);
        console.log('✅ News sentiment OK\n');
        
    } catch (error) {
        console.error('❌ Failed at:', error.message);
        process.exit(1);
    }
    
    try {
        console.log('5. Testing fundamentals...');
        const { getFundamentals } = require('../src/services/fundamental/fundamentalAnalyzer');
        await Promise.race([
            getFundamentals('AAPL'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fundamentals timeout')), 10000))
        ]);
        console.log('✅ Fundamentals OK\n');
        
    } catch (error) {
        console.error('❌ Failed at:', error.message);
        process.exit(1);
    }
    
    try {
        console.log('6. Testing Fear & Greed...');
        const { fetchFearGreed } = require('../src/services/sentiment/fearGreedFetcher');
        await Promise.race([
            fetchFearGreed(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Fear & Greed timeout')), 10000))
        ]);
        console.log('✅ Fear & Greed OK\n');
        
    } catch (error) {
        console.error('❌ Failed at:', error.message);
        process.exit(1);
    }
    
    try {
        console.log('7. Testing VIX...');
        const { fetchVIX } = require('../src/services/sentiment/vixFetcher');
        await Promise.race([
            fetchVIX(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('VIX timeout')), 10000))
        ]);
        console.log('✅ VIX OK\n');
        
    } catch (error) {
        console.error('❌ Failed at:', error.message);
        process.exit(1);
    }
    
    console.log('✅ All tests passed!');
    process.exit(0);
}

quickTest();
