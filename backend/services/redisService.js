import Redis from 'ioredis';
import { config } from '../config.js';

/**
 * Redis Service for caching operations
 * Provides a centralized interface for all Redis operations with error handling and fallbacks
 */
class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.initialize();
    }

    /**
     * Initialize Redis connection
     */
    initialize() {
        try {
            this.client = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                db: config.redis.db,
                retryDelayOnFailover: config.redis.retryDelayOnFailover,
                maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
                lazyConnect: config.redis.lazyConnect,
                keepAlive: config.redis.keepAlive,
                connectTimeout: config.redis.connectTimeout,
                commandTimeout: config.redis.commandTimeout,
            });

            // Connection event handlers
            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
                this.retryCount = 0;
            });

            this.client.on('error', (error) => {
                console.error('❌ Redis connection error:', error.message);
                this.isConnected = false;
                this.handleConnectionError(error);
            });

            this.client.on('close', () => {
                console.log('⚠️ Redis connection closed');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                console.log('🔄 Redis reconnecting...');
                this.retryCount++;
            });

        } catch (error) {
            console.error('❌ Failed to initialize Redis:', error);
            this.isConnected = false;
        }
    }

    /**
     * Handle connection errors with exponential backoff
     */
    handleConnectionError(error) {
        if (this.retryCount < this.maxRetries) {
            const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
            console.log(`🔄 Retrying Redis connection in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);
            setTimeout(() => {
                this.initialize();
            }, delay);
        } else {
            console.error('❌ Max Redis connection retries exceeded. Caching disabled.');
        }
    }

    /**
     * Check if Redis is available
     */
    isAvailable() {
        return this.isConnected && this.client;
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} - Cached value or null
     */
    async get(key) {
        if (!this.isAvailable()) {
            console.log('⚠️ Redis not available, skipping cache get');
            return null;
        }

        try {
            const value = await this.client.get(key);
            if (value) {
                console.log(`📦 Cache HIT: ${key}`);
                return JSON.parse(value);
            }
            console.log(`📭 Cache MISS: ${key}`);
            return null;
        } catch (error) {
            console.error(`❌ Redis GET error for key ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} - Success status
     */
    async set(key, value, ttl = null) {
        if (!this.isAvailable()) {
            console.log('⚠️ Redis not available, skipping cache set');
            return false;
        }

        try {
            const serializedValue = JSON.stringify(value);
            if (ttl) {
                await this.client.setex(key, ttl, serializedValue);
            } else {
                await this.client.set(key, serializedValue);
            }
            console.log(`💾 Cache SET: ${key} (TTL: ${ttl || 'no expiry'})`);
            return true;
        } catch (error) {
            console.error(`❌ Redis SET error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Delete key from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} - Success status
     */
    async del(key) {
        if (!this.isAvailable()) {
            console.log('⚠️ Redis not available, skipping cache delete');
            return false;
        }

        try {
            const result = await this.client.del(key);
            console.log(`🗑️ Cache DELETE: ${key} (${result} keys removed)`);
            return result > 0;
        } catch (error) {
            console.error(`❌ Redis DELETE error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Delete multiple keys matching pattern
     * @param {string} pattern - Key pattern (e.g., 'products:*')
     * @returns {Promise<number>} - Number of keys deleted
     */
    async delPattern(pattern) {
        if (!this.isAvailable()) {
            console.log('⚠️ Redis not available, skipping cache pattern delete');
            return 0;
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                const result = await this.client.del(...keys);
                console.log(`🗑️ Cache PATTERN DELETE: ${pattern} (${result} keys removed)`);
                return result;
            }
            return 0;
        } catch (error) {
            console.error(`❌ Redis PATTERN DELETE error for pattern ${pattern}:`, error.message);
            return 0;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} - Key existence
     */
    async exists(key) {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`❌ Redis EXISTS error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Get TTL for key
     * @param {string} key - Cache key
     * @returns {Promise<number>} - TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
     */
    async ttl(key) {
        if (!this.isAvailable()) {
            return -2;
        }

        try {
            return await this.client.ttl(key);
        } catch (error) {
            console.error(`❌ Redis TTL error for key ${key}:`, error.message);
            return -2;
        }
    }

    /**
     * Increment counter
     * @param {string} key - Cache key
     * @param {number} increment - Increment value (default: 1)
     * @returns {Promise<number>} - New value
     */
    async incr(key, increment = 1) {
        if (!this.isAvailable()) {
            return 0;
        }

        try {
            if (increment === 1) {
                return await this.client.incr(key);
            } else {
                return await this.client.incrby(key, increment);
            }
        } catch (error) {
            console.error(`❌ Redis INCR error for key ${key}:`, error.message);
            return 0;
        }
    }

    /**
     * Set expiration for key
     * @param {string} key - Cache key
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} - Success status
     */
    async expire(key, ttl) {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
        } catch (error) {
            console.error(`❌ Redis EXPIRE error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} - Cache statistics
     */
    async getStats() {
        if (!this.isAvailable()) {
            return {
                connected: false,
                error: 'Redis not available'
            };
        }

        try {
            const info = await this.client.info('memory');
            const dbSize = await this.client.dbsize();
            
            return {
                connected: this.isConnected,
                dbSize,
                memory: info,
                uptime: process.uptime()
            };
        } catch (error) {
            console.error('❌ Redis STATS error:', error.message);
            return {
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Close Redis connection
     */
    async close() {
        if (this.client) {
            try {
                await this.client.quit();
                console.log('✅ Redis connection closed gracefully');
            } catch (error) {
                console.error('❌ Error closing Redis connection:', error.message);
            }
        }
    }

    /**
     * Cache wrapper for async functions
     * @param {string} key - Cache key
     * @param {Function} fetchFunction - Function to fetch data if not cached
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<any>} - Cached or fresh data
     */
    async cacheOrFetch(key, fetchFunction, ttl = null) {
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Fetch fresh data
        try {
            const freshData = await fetchFunction();
            
            // Cache the fresh data
            if (freshData !== null && freshData !== undefined) {
                await this.set(key, freshData, ttl);
            }
            
            return freshData;
        } catch (error) {
            console.error(`❌ Error in cacheOrFetch for key ${key}:`, error.message);
            throw error;
        }
    }
}

// Create singleton instance
const redisService = new RedisService();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down Redis service...');
    await redisService.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down Redis service...');
    await redisService.close();
    process.exit(0);
});

export default redisService;
