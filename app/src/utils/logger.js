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
            try {
                // Filter out circular references and non-serializable objects
                const filteredMeta = {};
                for (const [key, value] of Object.entries(meta)) {
                    if (value && typeof value === 'object' && 
                        (value.constructor.name === 'ClientRequest' || 
                         value.constructor.name === 'IncomingMessage' ||
                         value.constructor.name === 'Socket')) {
                        filteredMeta[key] = '[Circular]';
                    } else {
                        filteredMeta[key] = value;
                    }
                }
                msg += ` ${JSON.stringify(filteredMeta)}`;
            } catch (err) {
                msg += ` [Unable to serialize metadata]`;
            }
        }
        return msg;
    })
);

// In-memory log buffer for frontend display
const logBuffer = [];
const MAX_LOG_BUFFER = 100;

// Custom Transport to capture logs in memory
class MemoryTransport extends winston.Transport {
    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // Store log with timestamp
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: info.level,
            message: info.message,
            meta: info
        };

        logBuffer.push(logEntry);
        if (logBuffer.length > MAX_LOG_BUFFER) {
            logBuffer.shift(); // Remove oldest
        }

        callback();
    }
}

// Create transports
const transports = [];

// Memory Transport for Web UI
transports.push(new MemoryTransport());

// Console transport (Always active for Docker visibility)
transports.push(
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
    })
);

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

// Method to get recent logs
logger.getRecentLogs = () => {
    return [...logBuffer]; // Return copy
};

module.exports = logger;
