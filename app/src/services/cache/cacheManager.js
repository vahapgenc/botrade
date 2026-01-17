const redis = require('redis');
const config = require('../../../config/settings');
const logger = require('../../utils/logger');

let client = null;
let connected = false;

// In-memory fallback cache
const memoryCache = new Map();

async function initCache() {
    try {
        client = redis.createClient({
            url: config.redis.url,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Redis reconnection failed after 10 attempts');
                        return new Error('Max reconnection attempts reached');
                    }
                    return retries * 100; // Exponential backoff
                }
            }
        });

        client.on('error', (err) => {
            logger.error('Redis client error:', err);
            connected = false;
        });

        client.on('connect', () => {
            logger.info('Redis client connected');
            connected = true;
        });

        client.on('ready', () => {
            logger.info('✅ Redis cache ready');
            connected = true;
        });

        await client.connect();
        
    } catch (error) {
        logger.warn('⚠️  Redis unavailable, using memory cache fallback');
        logger.error('Redis init error:', error);
        client = null;
        connected = false;
    }
}

async function get(key) {
    // Try Redis first
    if (connected && client) {
        try {
            const value = await client.get(key);
            if (value) {
                logger.debug(`Cache HIT (Redis): ${key}`);
                return JSON.parse(value);
            }
        } catch (error) {
            logger.error(`Redis GET error for ${key}:`, error);
        }
    }
    
    // Fallback to memory cache
    if (memoryCache.has(key)) {
        const cached = memoryCache.get(key);
        // Check if expired
        if (cached.expiry > Date.now()) {
            logger.debug(`Cache HIT (Memory): ${key}`);
            return cached.value;
        } else {
            memoryCache.delete(key);
        }
    }
    
    logger.debug(`Cache MISS: ${key}`);
    return null;
}

async function set(key, value, ttlSeconds = 3600) {
    // Try Redis first
    if (connected && client) {
        try {
            await client.setEx(key, ttlSeconds, JSON.stringify(value));
            logger.debug(`Cache SET (Redis): ${key} (TTL: ${ttlSeconds}s)`);
        } catch (error) {
            logger.error(`Redis SET error for ${key}:`, error);
        }
    }
    
    // Always set in memory cache as fallback
    memoryCache.set(key, {
        value: value,
        expiry: Date.now() + (ttlSeconds * 1000)
    });
    logger.debug(`Cache SET (Memory): ${key} (TTL: ${ttlSeconds}s)`);
}

async function del(key) {
    // Delete from Redis
    if (connected && client) {
        try {
            await client.del(key);
            logger.debug(`Cache DELETE (Redis): ${key}`);
        } catch (error) {
            logger.error(`Redis DELETE error for ${key}:`, error);
        }
    }
    
    // Delete from memory cache
    memoryCache.delete(key);
    logger.debug(`Cache DELETE (Memory): ${key}`);
}

async function clear() {
    // Clear Redis
    if (connected && client) {
        try {
            await client.flushDb();
            logger.info('Redis cache cleared');
        } catch (error) {
            logger.error('Redis CLEAR error:', error);
        }
    }
    
    // Clear memory cache
    memoryCache.clear();
    logger.info('Memory cache cleared');
}

async function disconnect() {
    if (client && connected) {
        try {
            await client.quit();
            logger.info('Redis client disconnected');
        } catch (error) {
            logger.error('Redis disconnect error:', error);
        }
    }
}

// Clean up expired memory cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, cached] of memoryCache.entries()) {
        if (cached.expiry <= now) {
            memoryCache.delete(key);
            logger.debug(`Memory cache expired: ${key}`);
        }
    }
}, 60000); // Every 1 minute

module.exports = {
    initCache,
    get,
    set,
    del,
    clear,
    disconnect
};
