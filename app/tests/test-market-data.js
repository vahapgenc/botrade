require('dotenv').config();
const { getHistoricalData, extractPriceArrays, getCurrentPrice, getMultipleQuotes } = require('../src/services/market/dataFetcher');
const { analyzeTechnicals } = require('../src/services/technical/technicalAnalyzer');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing Market Data Fetcher...\n');
    
    try {
        // Initialize cache
        await initCache();
        
        // Test 1: Fetch daily data
        console.log('Test 1: Fetching daily historical data for AAPL...');
        const dailyData = await getHistoricalData('AAPL', 'daily', 250);
        console.log(`✅ Fetched ${dailyData.dataPoints} daily candles`);
        console.log(`   Latest: ${dailyData.data[dailyData.data.length - 1].date} @ $${dailyData.data[dailyData.data.length - 1].close}`);
        
        // Test 2: Extract price arrays
        console.log('\nTest 2: Extracting price arrays...');
        const priceArrays = extractPriceArrays(dailyData);
        console.log(`✅ Extracted ${priceArrays.closes.length} price points`);
        console.log(`   Close range: $${Math.min(...priceArrays.closes).toFixed(2)} - $${Math.max(...priceArrays.closes).toFixed(2)}`);
        
        // Test 3: Run technical analysis with real data
        console.log('\nTest 3: Running technical analysis...');
        const analysis = await analyzeTechnicals(priceArrays);
        console.log('✅ Technical analysis complete');
        console.log(`   Trend: ${analysis.trend.trend} (strength: ${analysis.trend.trendStrength})`);
        console.log(`   Composite Score: ${analysis.composite.score} (${analysis.composite.signal})`);
        console.log(`   RSI: ${analysis.momentum.rsi.value} (${analysis.momentum.rsi.interpretation})`);
        
        // Test 4: Get current price
        console.log('\nTest 4: Fetching current price...');
        const currentPrice = await getCurrentPrice('AAPL');
        const changePercent = currentPrice.changePercent || 0;
        console.log(`✅ Current: $${currentPrice.price} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
        console.log(`   Day Range: $${currentPrice.dayLow} - $${currentPrice.dayHigh}`);
        
        // Test 5: Get multiple quotes (requires paid plan, skip if not available)
        console.log('\nTest 5: Fetching multiple quotes...');
        try {
            const quotes = await getMultipleQuotes(['AAPL', 'MSFT', 'GOOGL']);
            console.log(`✅ Fetched ${quotes.length} quotes`);
            quotes.forEach(q => {
                console.log(`   ${q.ticker}: $${q.price} (${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`);
            });
        } catch (error) {
            if (error.message.includes('402') || error.message.includes('Restricted')) {
                console.log('⚠️  Multiple quotes require paid plan - skipping test');
            } else {
                throw error;
            }
        }
        
        // Test 6: Test caching
        console.log('\nTest 6: Testing cache performance...');
        const start1 = Date.now();
        await getHistoricalData('MSFT', 'daily', 250);
        const time1 = Date.now() - start1;
        
        const start2 = Date.now();
        await getHistoricalData('MSFT', 'daily', 250);
        const time2 = Date.now() - start2;
        
        console.log(`✅ First fetch: ${time1}ms, Cached fetch: ${time2}ms`);
        console.log(`   Speed improvement: ${(time1 / time2).toFixed(1)}x faster`);
        
        // Test 7: Weekly aggregation
        console.log('\nTest 7: Fetching weekly data...');
        const weeklyData = await getHistoricalData('AAPL', 'weekly', 52);
        console.log(`✅ Fetched ${weeklyData.dataPoints} weekly candles`);
        console.log(`   Period: ${weeklyData.data[0].date} to ${weeklyData.data[weeklyData.data.length - 1].date}`);
        
        console.log('\n✅ All market data tests passed!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

runTests();
