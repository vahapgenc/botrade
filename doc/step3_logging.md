# STEP 3: Logging System with Winston

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1 completed and verified
- ✅ STEP 2 completed and verified
- ✅ Database connection working

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 4**

---

## 🎯 Objectives
1. Install Winston logger
2. Configure logging levels
3. Set up log rotation
4. Create logger utility
5. Test logging system

---

## ⏱️ Estimated Duration
**2-3 hours**

---

## 📝 Implementation Steps

### 3.1 Install Winston
```bash
npm install winston winston-daily-rotate-file
```

**Expected Output:**
```
added 15 packages, and audited 75 packages in 4s
```

### 3.2 Create Logger Utility
Create `src/utils/logger.js`:

```javascript
const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}] ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create transports
const transports = [];

// Console transport (always active in development)
if (process.env.NODE_ENV === 'development') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug'
        })
    );
}

// File transport for errors (with rotation)
transports.push(
    new winston.transports.DailyRotateFile({
        filename: path.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '10m',
        maxFiles: '30d',
        zippedArchive: true
    })
);

// File transport for all logs (with rotation)
transports.push(
    new winston.transports.DailyRotateFile({
        filename: path.join('logs', 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
    })
);

// File transport for trade logs (with rotation)
transports.push(
    new winston.transports.DailyRotateFile({
        filename: path.join('logs', 'trades-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        format: logFormat,
        maxSize: '10m',
        maxFiles: '90d',
        zippedArchive: true
    })
);

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'botrade' },
    transports: transports,
    exitOnError: false
});

// Add helper methods
logger.trade = (message, meta) => {
    logger.info(`[TRADE] ${message}`, { ...meta, type: 'TRADE' });
};

logger.ai = (message, meta) => {
    logger.info(`[AI] ${message}`, { ...meta, type: 'AI' });
};

logger.market = (message, meta) => {
    logger.info(`[MARKET] ${message}`, { ...meta, type: 'MARKET' });
};

// Handle uncaught exceptions
logger.exceptions.handle(
    new winston.transports.File({ 
        filename: path.join('logs', 'exceptions.log') 
    })
);

// Handle unhandled promise rejections
logger.rejections.handle(
    new winston.transports.File({ 
        filename: path.join('logs', 'rejections.log') 
    })
);

module.exports = logger;
```

### 3.3 Create Error Handler Middleware
Create `src/utils/errorHandler.js`:

```javascript
const logger = require('./logger');

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Log error
    logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || 500,
        path: req?.path,
        method: req?.method
    });

    // Operational errors (trusted errors)
    if (error.isOperational) {
        return res.status(error.statusCode || 500).json({
            error: {
                message: error.message,
                statusCode: error.statusCode
            }
        });
    }

    // Programming or unknown errors (don't leak details)
    console.error('UNKNOWN ERROR:', err);
    return res.status(500).json({
        error: {
            message: 'An unexpected error occurred',
            statusCode: 500
        }
    });
}

// Async handler wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { AppError, errorHandler, asyncHandler };
```

### 3.4 Create Test File
Create `tests/test-logging.js`:

```javascript
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
```

### 3.5 Update Main Index
Update `src/index.js`:

```javascript
const config = require('../config/settings');
const logger = require('./utils/logger');
const { testConnection } = require('./database/prisma');

async function initialize() {
    logger.info('🚀 Trading Bot Initializing...');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        logger.error('Database connection failed');
        process.exit(1);
    }
    
    logger.info('✅ All systems initialized');
    logger.info('📝 Next: Proceed to STEP 4 (Express Server)');
}

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

initialize().catch(error => {
    logger.error('Initialization failed:', error);
    process.exit(1);
});
```

### 3.6 Update Environment Variables
Add to `.env`:

```bash
# Logging
LOG_LEVEL=debug  # debug, info, warn, error
```

---

## ✅ Completion Checklist

Before proceeding to STEP 4, verify ALL items:

- [ ] Winston installed (`winston` in package.json)
- [ ] `src/utils/logger.js` created
- [ ] `src/utils/errorHandler.js` created
- [ ] `tests/test-logging.js` created
- [ ] `logs/` folder created automatically
- [ ] Log files generated (combined-*.log, error-*.log, trades-*.log)
- [ ] All logging tests pass: `node tests/test-logging.js`
- [ ] Main app uses logger: `npm run dev` shows colored logs

---

## 🧪 Testing

```bash
# Test 1: Run logging tests
node tests/test-logging.js
# Expected: All tests passed, log files created

# Test 2: Check log files
dir logs
# Expected: See combined-*.log, error-*.log, trades-*.log

# Test 3: View log content
type logs\combined-*.log
# Expected: JSON formatted log entries

# Test 4: Test in main app
npm run dev
# Expected: Colored console logs with timestamps

# Test 5: Test error logging
node -e "const logger = require('./src/utils/logger'); logger.error('Test error');"
# Expected: Error logged to error-*.log
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: "Cannot create logs directory"
**Solution:**
```bash
# Create manually
mkdir logs
# Or ensure write permissions
```

### Issue 2: Logs not appearing in files
**Solution:**
1. Check LOG_LEVEL in .env (should be 'debug' for testing)
2. Ensure logs/ folder has write permissions
3. Wait 1-2 seconds for log flush

### Issue 3: Console output not colored
**Solution:**
1. Verify NODE_ENV=development in .env
2. Check terminal supports colors
3. Try different terminal (PowerShell, CMD, Git Bash)

---

## 📊 Progress Tracking

**Current Status:** 🔴 NOT STARTED

- [ ] Started: YYYY-MM-DD
- [ ] Winston installed: YYYY-MM-DD
- [ ] Logger utility created: YYYY-MM-DD
- [ ] Tests passing: YYYY-MM-DD
- [ ] Log files generating: YYYY-MM-DD
- [ ] **COMPLETED:** YYYY-MM-DD

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step4_express_server.md`

**DO NOT proceed until:**
- ✅ All completion checklist items are done
- ✅ All tests pass
- ✅ Log files visible in logs/ folder

---

## 📚 Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Log Levels Best Practices](https://github.com/winstonjs/winston#logging-levels)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)

---

**Last Updated:** December 30, 2025
