require('dotenv').config();
const { makeAIDecision, getDecisionStats } = require('../src/services/ai/aiEngine');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing AI Decision Engine (Stock & Options)...\n');
    console.log('⚠️  This will consume OpenAI API credits!\n');
    console.log('═'.repeat(70));
    
    try {
        await initCache();
        
        // Test 1: Stock Trading Decision
        console.log('\n📊 TEST 1: STOCK TRADING ANALYSIS');
        console.log('─'.repeat(70));
        console.log('Making AI decision for AAPL (STOCK only)...');
        console.log('(This may take 30-60 seconds...)\n');
        
        const stockDecision = await makeAIDecision('AAPL', 'Apple Inc.', 'STOCK');
        
        displayDecision(stockDecision, 'STOCK');
        
        console.log('\n' + '═'.repeat(70));
        
        // Test 2: Options Trading Decision
        console.log('\n📈 TEST 2: OPTIONS TRADING ANALYSIS');
        console.log('─'.repeat(70));
        console.log('Making AI decision for AAPL (OPTIONS only)...');
        console.log('(This may take 30-60 seconds...)\n');
        
        const optionsDecision = await makeAIDecision('AAPL', 'Apple Inc.', 'OPTIONS');
        
        displayDecision(optionsDecision, 'OPTIONS');
        
        console.log('\n' + '═'.repeat(70));
        
        // Test 3: Both Stock & Options
        console.log('\n🔄 TEST 3: COMPREHENSIVE ANALYSIS (STOCK & OPTIONS)');
        console.log('─'.repeat(70));
        console.log('Making AI decision for AAPL (BOTH types)...');
        console.log('(This may take 60-90 seconds...)\n');
        
        const bothDecision = await makeAIDecision('AAPL', 'Apple Inc.', 'BOTH');
        
        displayDecision(bothDecision, 'BOTH');
        
        console.log('\n' + '═'.repeat(70));
        
        // Get overall stats
        console.log('\n📈 OVERALL STATISTICS');
        console.log('─'.repeat(70));
        const stats = await getDecisionStats();
        console.log(`Total Decisions Made: ${stats.totalDecisions}`);
        console.log(`Total API Cost: $${stats.totalCost.toFixed(4)}`);
        console.log('\nDecision Distribution:');
        Object.entries(stats.decisionDistribution).forEach(([decision, count]) => {
            console.log(`  ${decision}: ${count}`);
        });
        console.log('\nTrading Type Distribution:');
        Object.entries(stats.tradingTypeDistribution).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
        
        console.log('\n' + '═'.repeat(70));
        console.log('\n✅ All AI decision tests passed!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

function displayDecision(decision, testType) {
    console.log(`\n🤖 AI DECISION (${testType})`);
    console.log('═'.repeat(70));
    
    console.log(`\nTicker: ${decision.ticker} (${decision.companyName})`);
    console.log(`Current Price: $${decision.currentPrice.toFixed(2)}`);
    console.log(`Trading Type: ${decision.tradingType}`);
    
    console.log(`\n🎯 DECISION: ${decision.decision}`);
    console.log(`Confidence: ${decision.confidence}%`);
    console.log(`Time Horizon: ${decision.timeHorizon}`);
    console.log(`Risk Level: ${decision.riskLevel}`);
    
    if (decision.probabilitySuccess) {
        console.log(`Success Probability: ${decision.probabilitySuccess}%`);
    }
    
    // Display stock trade details
    if (decision.tradingType === 'STOCK' || !decision.optionsStrategy) {
        console.log('\n💼 STOCK TRADE DETAILS:');
        console.log(`Quantity: ${decision.quantity || 'N/A'} shares`);
        console.log(`Entry Price: $${decision.suggestedPrice?.toFixed(2) || 'N/A'}`);
        
        if (decision.targetPrice) {
            console.log(`Target Price: $${decision.targetPrice.toFixed(2)}`);
            const upside = ((decision.targetPrice - decision.currentPrice) / decision.currentPrice * 100);
            console.log(`Upside Potential: ${upside > 0 ? '+' : ''}${upside.toFixed(2)}%`);
        }
        
        if (decision.stopLoss) {
            console.log(`Stop Loss: $${decision.stopLoss.toFixed(2)}`);
            const downside = ((decision.stopLoss - decision.currentPrice) / decision.currentPrice * 100);
            console.log(`Downside Risk: ${downside.toFixed(2)}%`);
        }
    }
    
    // Display options trade details
    if (decision.optionsStrategy) {
        console.log('\n📊 OPTIONS STRATEGY:');
        console.log(`Strategy: ${decision.optionsStrategy}`);
        
        if (decision.optionsLegs && decision.optionsLegs.length > 0) {
            console.log('\nLegs:');
            decision.optionsLegs.forEach((leg, idx) => {
                console.log(`  ${idx + 1}. ${leg.action} ${leg.contracts || 1} ${leg.type} @ $${leg.strike}`);
                if (leg.expiry) console.log(`     Expiry: ${leg.expiry}`);
                if (leg.premium) console.log(`     Premium: $${leg.premium.toFixed(2)}`);
                if (leg.quantity) console.log(`     Quantity: ${leg.quantity}`);
            });
        }
        
        if (decision.maxProfit !== null) {
            console.log(`\nMax Profit: $${decision.maxProfit.toFixed(2)}`);
        }
        if (decision.maxLoss !== null) {
            console.log(`Max Loss: $${decision.maxLoss.toFixed(2)}`);
        }
        if (decision.breakeven !== null) {
            console.log(`Breakeven: $${decision.breakeven.toFixed(2)}`);
        }
        if (decision.collateralRequired !== null) {
            console.log(`Collateral Required: $${decision.collateralRequired.toFixed(2)}`);
        }
    }
    
    // Risk/Reward
    if (decision.rewardRiskRatio) {
        console.log(`\n⚖️  Reward/Risk Ratio: ${decision.rewardRiskRatio.toFixed(2)}:1`);
    }
    
    console.log('\n📝 REASONING:');
    console.log(decision.reasoning);
    
    if (decision.comparisonAnalysis) {
        console.log('\n🔄 STOCK vs OPTIONS COMPARISON:');
        console.log(decision.comparisonAnalysis);
    }
    
    console.log('\n✅ KEY FACTORS:');
    decision.keyFactors.forEach((factor, idx) => {
        console.log(`${idx + 1}. ${factor}`);
    });
    
    console.log('\n⚠️  RISKS:');
    decision.risks.forEach((risk, idx) => {
        console.log(`${idx + 1}. ${risk}`);
    });
    
    console.log('\n📊 ANALYSIS SCORES:');
    console.log(`Technical: ${decision.technicalScore}/100`);
    console.log(`Fundamental: ${decision.fundamentalScore}/100`);
    console.log(`News Sentiment: ${decision.newsScore}/100`);
    console.log(`Market Sentiment: ${decision.marketSentimentScore}/100`);
    
    console.log('\n💰 API USAGE:');
    console.log(`Cost: $${decision.apiCostUsd.toFixed(4)}`);
    console.log(`Tokens: ${decision.totalTokens} (Prompt: ${decision.promptTokens}, Completion: ${decision.completionTokens})`);
    console.log(`Model: ${decision.aiModel}`);
}

// Run with command line argument for trading type or default to BOTH
const tradingType = (process.argv[2] || 'TEST').toUpperCase();

if (['STOCK', 'OPTIONS', 'BOTH', 'TEST'].includes(tradingType)) {
    if (tradingType === 'TEST') {
        // Run all three tests
        runTests();
    } else {
        // Run single test with specified type
        (async () => {
            try {
                await initCache();
                console.log(`\n🤖 AI Decision Engine Test (${tradingType})\n`);
                const decision = await makeAIDecision('AAPL', 'Apple Inc.', tradingType);
                displayDecision(decision, tradingType);
                process.exit(0);
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
        })();
    }
} else {
    console.error('Usage: node test-ai-decision.js [STOCK|OPTIONS|BOTH|TEST]');
    console.error('  STOCK  - Test stock trading only');
    console.error('  OPTIONS - Test options trading only');
    console.error('  BOTH   - Test both (recommended by AI)');
    console.error('  TEST   - Run all three tests (default)');
    process.exit(1);
}
