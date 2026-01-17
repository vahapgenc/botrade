const logger = require('../src/utils/logger');

async function runTests() {
    console.log('🧪 Testing Logging System...\n');
    
    // Test 1: Basic logging levels
    console.log('Test 1: Basic Logging Levels');
    logger.debug('This is a debug message');
    logger.info('This is an info message');
    logger.warn('This is a warning message');
    logger.error('This is an error message');
    console.log('✅ Basic logging test completed\n');
    
    // Test 2: Structured logging
    console.log('Test 2: Structured Logging');
    logger.info('Fetching market data', {
        ticker: 'NVDA',
        timeframe: '1day',
        source: 'FMP'
    });
    console.log('✅ Structured logging test completed\n');
    
    // Test 3: Custom log methods
    console.log('Test 3: Custom Log Methods');
    logger.trade('BUY order executed', {
        ticker: 'AAPL',
        quantity: 10,
        price: 180.50,
        total: 1805.00
    });
    
    logger.ai('AI decision made', {
        ticker: 'MSFT',
        decision: 'BUY',
        confidence: 85
    });
    
    logger.market('Market sentiment updated', {
        vix: 18.5,
        fearGreed: 45,
        composite: 52
    });
    console.log('✅ Custom log methods test completed\n');
    
    // Test 4: Error logging with stack trace
    console.log('Test 4: Error Logging');
    try {
        throw new Error('Test error for logging');
    } catch (error) {
        logger.error('Caught test error:', {
            error: error.message,
            stack: error.stack
        });
    }
    console.log('✅ Error logging test completed\n');
    
    // Test 5: Check log files created
    console.log('Test 5: Verify Log Files');
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(process.cwd(), 'logs');
    
    if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir);
        console.log('Log files created:', files);
        
        if (files.length > 0) {
            console.log('✅ Log files verification passed\n');
        } else {
            console.error('❌ No log files created\n');
            process.exit(1);
        }
    } else {
        console.error('❌ Logs directory not found\n');
        process.exit(1);
    }
    
    console.log('🎉 All logging tests passed!');
    console.log('📝 Check logs/ folder for generated log files');
    console.log('📝 You can now proceed to STEP 4');
    
    // Wait for logs to flush
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

runTests();
