require('dotenv').config();
const { analyzeTechnicals } = require('../src/services/technical/technicalAnalyzer');

async function runTests() {
    console.log('🧪 Testing Technical Indicators...\n');
    
    try {
        // Generate sample price data
        const sampleData = generateSampleData(250);
        
        console.log('Test: Full Technical Analysis');
        const analysis = await analyzeTechnicals(sampleData);
        
        console.log('\n📊 Technical Analysis Results:');
        console.log('Trend:', analysis.trend.trend);
        console.log('MACD Signal:', analysis.macd.signalType);
        console.log('RSI:', analysis.momentum.rsi.value, `-`, analysis.momentum.rsi.interpretation);
        console.log('Stochastic:', `K=${analysis.momentum.stochastic.k}, D=${analysis.momentum.stochastic.d}`);
        console.log('Bollinger:', analysis.bollinger.signal);
        console.log('\n🎯 Composite Score:', analysis.composite.score);
        console.log('Signal:', analysis.composite.signal);
        console.log('Confidence:', `${analysis.composite.confidence}%`);
        console.log('\n✅ Technical analysis test passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

function generateSampleData(length) {
    let price = 100;
    const closes = [];
    const opens = [];
    const highs = [];
    const lows = [];
    const volumes = [];
    
    for (let i = 0; i < length; i++) {
        const change = (Math.random() - 0.5) * 4; // -2 to +2
        price = Math.max(50, price + change); // Don't go below 50
        
        const open = price + (Math.random() - 0.5) * 2;
        const high = Math.max(price, open) + Math.random() * 2;
        const low = Math.min(price, open) - Math.random() * 2;
        
        opens.push(parseFloat(open.toFixed(2)));
        highs.push(parseFloat(high.toFixed(2)));
        lows.push(parseFloat(low.toFixed(2)));
        closes.push(parseFloat(price.toFixed(2)));
        volumes.push(Math.floor(1000000 + Math.random() * 5000000));
    }
    
    return { closes, opens, highs, lows, volumes };
}

runTests();
