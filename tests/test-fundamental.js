require('dotenv').config();
const { getFundamentals } = require('../src/services/fundamental/fundamentalAnalyzer');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing Fundamental Analysis...\n');
    
    try {
        await initCache();
        
        // Test with a well-known growth stock
        console.log('Test: Analyzing AAPL fundamentals...');
        const analysis = await getFundamentals('AAPL');
        
        console.log('\n📊 Company Profile:');
        console.log(`Name: ${analysis.profile.name}`);
        console.log(`Sector: ${analysis.profile.sector}`);
        console.log(`Industry: ${analysis.profile.industry}`);
        
        console.log('\n💰 Valuation:');
        console.log(`P/E Ratio: ${analysis.valuation.pe?.toFixed(2) || 'N/A'}`);
        console.log(`PEG Ratio: ${analysis.valuation.peg?.toFixed(2) || 'N/A'}`);
        console.log(`Price/Book: ${analysis.valuation.priceToBook?.toFixed(2) || 'N/A'}`);
        
        console.log('\n📈 Growth Metrics:');
        console.log(`Quarterly Earnings Growth: ${analysis.growth.quarterlyEarningsGrowth?.toFixed(2)}%`);
        console.log(`Annual Earnings Growth: ${analysis.growth.annualEarningsGrowth?.toFixed(2)}%`);
        console.log(`Revenue Growth: ${analysis.growth.revenueGrowth?.toFixed(2)}%`);
        
        console.log('\n💪 Profitability:');
        console.log(`Gross Margin: ${(analysis.profitability.grossMargin * 100)?.toFixed(2)}%`);
        console.log(`Operating Margin: ${(analysis.profitability.operatingMargin * 100)?.toFixed(2)}%`);
        console.log(`Net Margin: ${(analysis.profitability.netMargin * 100)?.toFixed(2)}%`);
        console.log(`ROE: ${(analysis.profitability.roe * 100)?.toFixed(2)}%`);
        
        console.log('\n🎯 CAN SLIM Analysis:');
        console.log(`Overall Score: ${analysis.canSlim.score}/${analysis.canSlim.maxScore}`);
        console.log(`Rating: ${analysis.canSlim.rating}`);
        console.log(`Recommendation: ${analysis.canSlim.recommendation}`);
        console.log('\nGrades:');
        Object.entries(analysis.canSlim.grades).forEach(([key, grade]) => {
            const labels = {
                C: 'Current Earnings',
                A: 'Annual Earnings',
                N: 'Newness/Revenue',
                S: 'Supply/Demand',
                L: 'Leadership',
                I: 'Institutional',
                M: 'Market'
            };
            console.log(`  ${key} (${labels[key]}): ${grade}`);
        });
        
        console.log('\n📝 Interpretation:');
        console.log(`Summary: ${analysis.canSlim.interpretation.summary}`);
        if (analysis.canSlim.interpretation.strengths.length > 0) {
            console.log('Strengths:');
            analysis.canSlim.interpretation.strengths.forEach(s => console.log(`  • ${s}`));
        }
        if (analysis.canSlim.interpretation.weaknesses.length > 0) {
            console.log('Weaknesses:');
            analysis.canSlim.interpretation.weaknesses.forEach(w => console.log(`  • ${w}`));
        }
        
        console.log('\n✅ Fundamental analysis test passed!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

runTests();
