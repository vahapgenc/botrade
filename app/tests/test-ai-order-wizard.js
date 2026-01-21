/**
 * AI Order Wizard Integration Test
 * Tests all 7 fixes implemented for the wizard
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TICKER = 'AAPL';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    reset: '\x1b[0m'
};

function logSuccess(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Backend API returns correct data structure
 */
async function testBackendDataStructure() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Backend API Data Structure');
    console.log('='.repeat(60));
    
    try {
        logInfo(`Fetching AI input data for ${TEST_TICKER}...`);
        const response = await fetch(`${BASE_URL}/api/ai/input/${TEST_TICKER}`);
        
        if (!response.ok) {
            logError(`API returned status ${response.status}`);
            return false;
        }
        
        const data = await response.json();
        logSuccess('API request successful');
        
        // Check top-level structure
        if (!data.data) {
            logError('Missing data object in response');
            return false;
        }
        logSuccess('Response has data object');
        
        // Test Issue #2: Technical data should be 'technicals' (plural)
        if (data.data.technical) {
            logError('Found "technical" (singular) - should be "technicals" (plural)');
            return false;
        }
        if (!data.data.technicals) {
            logWarning('No technicals data found (might be market closed or data unavailable)');
        } else {
            logSuccess('Found "technicals" (plural) ✓');
            
            // Verify technical data structure
            const tech = data.data.technicals;
            if (tech.rsi) logSuccess('  - RSI present');
            if (tech.macd) logSuccess('  - MACD present');
            if (tech.bollinger) logSuccess('  - Bollinger Bands present');
            if (tech.movingAverages) logSuccess('  - Moving Averages present');
            if (tech.composite) logSuccess('  - Composite score present');
        }
        
        // Test Issue #3: Fundamental data should be 'fundamentals' (plural)
        if (data.data.fundamental) {
            logError('Found "fundamental" (singular) - should be "fundamentals" (plural)');
            return false;
        }
        if (!data.data.fundamentals) {
            logWarning('No fundamentals data found');
        } else {
            logSuccess('Found "fundamentals" (plural) ✓');
            
            // Verify fundamental data structure
            const fund = data.data.fundamentals;
            if (fund.score !== undefined) logSuccess('  - CAN SLIM score present');
            if (fund.valuation) logSuccess('  - Valuation data present');
            if (fund.profile) logSuccess('  - Profile data present');
        }
        
        // Test Issue #4: News data should be flat structure
        if (!data.data.news) {
            logWarning('No news data found');
        } else {
            logSuccess('Found news data');
            const news = data.data.news;
            
            // Check for flat structure (not nested)
            if (news.sentiment && typeof news.sentiment === 'object' && news.sentiment.overall) {
                logError('News sentiment is nested (should be flat)');
                return false;
            }
            
            if (typeof news.sentiment === 'string') {
                logSuccess('  - sentiment is flat (string) ✓');
            }
            
            if (typeof news.sentimentScore === 'number') {
                logSuccess('  - sentimentScore is flat (number) ✓');
            }
            
            if (Array.isArray(news.articles)) {
                logSuccess(`  - articles array present (${news.articles.length} items) ✓`);
                
                if (news.articles.length > 0) {
                    const article = news.articles[0];
                    if (article.title) logSuccess('    - Articles have title');
                    if (article.url) logSuccess('    - Articles have url');
                    if (article.publishedAt) logSuccess('    - Articles have publishedAt');
                    if (article.source) logSuccess('    - Articles have source');
                }
            }
        }
        
        // Check market data
        if (data.data.market) {
            logSuccess('Market data present');
            const market = data.data.market;
            if (market.price !== undefined) logSuccess(`  - Current price: $${market.price}`);
            if (market.volume !== undefined) logSuccess(`  - Volume: ${market.volume.toLocaleString()}`);
        }
        
        return true;
        
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 2: AI Decision endpoint accepts tradingType parameter
 */
async function testAIDecisionEndpoint() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: AI Decision Endpoint');
    console.log('='.repeat(60));
    
    try {
        logInfo('Testing AI decision endpoint with tradingType parameter...');
        
        const requestBody = {
            ticker: TEST_TICKER,
            companyName: 'Apple Inc.',
            tradingType: 'BOTH' // Issue #5: This parameter was missing
        };
        
        logInfo(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
        
        const response = await fetch(`${BASE_URL}/api/ai/decide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            logError(`API returned status ${response.status}: ${errorText}`);
            return false;
        }
        
        const data = await response.json();
        logSuccess('AI decision endpoint accepted request');
        
        // Verify response structure matches backend
        if (!data.ticker) {
            logError('Response missing "ticker" field');
            return false;
        }
        logSuccess(`Response has ticker: ${data.ticker}`);
        
        if (!data.decision) {
            logError('Response missing "decision" field (BUY/SELL/HOLD)');
            return false;
        }
        logSuccess(`AI Decision: ${data.decision}`);
        
        if (data.confidence === undefined) {
            logError('Response missing "confidence" field');
            return false;
        }
        logSuccess(`Confidence: ${data.confidence}%`);
        
        // Check for correct field names (not old names)
        if (data.action) {
            logWarning('Found "action" field (old name) - frontend expects "decision"');
        }
        
        if (data.suggestedPrice !== undefined) {
            logSuccess(`Suggested Price: $${data.suggestedPrice}`);
        } else if (data.entry_price !== undefined) {
            logWarning('Found "entry_price" (old name) - should be "suggestedPrice"');
        }
        
        if (data.targetPrice !== undefined) {
            logSuccess(`Target Price: $${data.targetPrice}`);
        } else if (data.take_profit !== undefined) {
            logWarning('Found "take_profit" (old name) - should be "targetPrice"');
        }
        
        if (data.stopLoss !== undefined) {
            logSuccess(`Stop Loss: $${data.stopLoss}`);
        } else if (data.stop_loss !== undefined) {
            logWarning('Found "stop_loss" (old name) - should be "stopLoss"');
        }
        
        if (data.reasoning) {
            logSuccess('Reasoning present');
        }
        
        if (data.keyFactors && Array.isArray(data.keyFactors)) {
            logSuccess(`Key factors: ${data.keyFactors.length} items`);
        } else if (data.primary_reasons) {
            logWarning('Found "primary_reasons" (old name) - should be "keyFactors"');
        }
        
        if (data.risks && Array.isArray(data.risks)) {
            logSuccess(`Risks: ${data.risks.length} items`);
        }
        
        return true;
        
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        console.error(error);
        return false;
    }
}

/**
 * Test 3: Verify all status checks
 */
async function testStatusChecks() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: API Status Checks');
    console.log('='.repeat(60));
    
    try {
        logInfo('Checking API health...');
        const response = await fetch(`${BASE_URL}/health`);
        
        if (!response.ok) {
            logError('Health check failed');
            return false;
        }
        
        const data = await response.json();
        logSuccess(`Server status: ${data.status}`);
        
        if (data.database === 'connected') {
            logSuccess('Database: Connected');
        } else {
            logWarning(`Database: ${data.database}`);
        }
        
        if (data.cache === 'connected') {
            logSuccess('Redis Cache: Connected');
        } else {
            logWarning(`Redis Cache: ${data.cache}`);
        }
        
        return true;
        
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 4: Verify frontend field mappings
 */
async function testFrontendFieldMappings() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Frontend Field Mappings');
    console.log('='.repeat(60));
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const jsPath = path.join(__dirname, '../src/web/ai-order.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        
        // Check for correct field names in frontend
        const correctMappings = {
            'analysisData.technicals': 'Should use "technicals" (plural)',
            'analysisData.fundamentals': 'Should use "fundamentals" (plural)',
            'data.decision': 'Should use "decision" field',
            'aiData.suggestedPrice': 'Should use "suggestedPrice"',
            'aiData.targetPrice': 'Should use "targetPrice"',
            'aiData.stopLoss': 'Should use "stopLoss"',
            'aiData.keyFactors': 'Should use "keyFactors"'
        };
        
        let allCorrect = true;
        
        for (const [field, description] of Object.entries(correctMappings)) {
            if (jsContent.includes(field)) {
                logSuccess(`✓ ${description}`);
            } else {
                logWarning(`Missing: ${field}`);
                allCorrect = false;
            }
        }
        
        // Check for old field names that should NOT exist
        const incorrectMappings = {
            'analysisData.technical ': 'Should NOT use "technical" (singular)',
            'analysisData.fundamental ': 'Should NOT use "fundamental" (singular)',
            'aiData.action': 'Should NOT use "action" (use "decision")',
            'aiData.entry_price': 'Should NOT use "entry_price"',
            'aiData.take_profit': 'Should NOT use "take_profit"',
            'aiData.stop_loss': 'Should NOT use "stop_loss"',
            'aiData.primary_reasons': 'Should NOT use "primary_reasons"'
        };
        
        for (const [field, description] of Object.entries(incorrectMappings)) {
            if (jsContent.includes(field)) {
                logError(`Found incorrect field: ${field}`);
                logError(`  ${description}`);
                allCorrect = false;
            }
        }
        
        if (allCorrect) {
            logSuccess('All field mappings are correct!');
        }
        
        return allCorrect;
        
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n' + '█'.repeat(60));
    console.log('AI ORDER WIZARD - COMPREHENSIVE TEST SUITE');
    console.log('█'.repeat(60));
    
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0
    };
    
    // Test 1: Backend Data Structure
    const test1 = await testBackendDataStructure();
    if (test1) results.passed++; else results.failed++;
    await delay(1000);
    
    // Test 2: AI Decision Endpoint
    const test2 = await testAIDecisionEndpoint();
    if (test2) results.passed++; else results.failed++;
    await delay(1000);
    
    // Test 3: Status Checks
    const test3 = await testStatusChecks();
    if (test3) results.passed++; else results.failed++;
    await delay(1000);
    
    // Test 4: Frontend Field Mappings
    const test4 = await testFrontendFieldMappings();
    if (test4) results.passed++; else results.failed++;
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    
    if (results.failed === 0) {
        console.log(`\n${colors.green}${'█'.repeat(60)}`);
        console.log('✓ ALL TESTS PASSED - AI ORDER WIZARD IS READY!');
        console.log('█'.repeat(60) + colors.reset);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}${'█'.repeat(60)}`);
        console.log('✗ SOME TESTS FAILED - REVIEW ERRORS ABOVE');
        console.log('█'.repeat(60) + colors.reset);
        process.exit(1);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite error:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests };
