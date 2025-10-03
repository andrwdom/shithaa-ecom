import Redis from 'ioredis';
import Redlock from 'redlock';

/**
 * REDIS DISTRIBUTED LOCKING UTILITY
 * 
 * Provides distributed locking using Redis and Redlock algorithm
 * to prevent race conditions in webhook processing and critical operations
 */

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryOnFailover: true,
  enableOfflineQueue: false
};

// Create Redis client
const client = new Redis(process.env.REDIS_URL || redisConfig);

// Redlock configuration for distributed locking
const redlock = new Redlock([client], {
  driftFactor: 0.01,        // Clock drift factor
  retryCount: 3,            // Number of retries
  retryDelay: 200,          // Delay between retries (ms)
  retryJitter: 100,         // Jitter for retry delay (ms)
  automaticExtensionThreshold: 500 // Auto-extend lock if remaining time < 500ms
});

// Lock key generators
export const lockKeys = {
  webhook: (transactionId) => `lock:webhook:${transactionId}`,
  order: (orderId) => `lock:order:${orderId}`,
  stock: (productId, size) => `lock:stock:${productId}:${size}`,
  payment: (transactionId) => `lock:payment:${transactionId}`,
  idempotency: (key) => `lock:idempotency:${key}`
};

// Lock TTL values (in milliseconds)
export const lockTTL = {
  webhook: 15000,      // 15 seconds for webhook processing
  order: 30000,        // 30 seconds for order operations
  stock: 10000,        // 10 seconds for stock operations
  payment: 20000,      // 20 seconds for payment processing
  idempotency: 5000    // 5 seconds for idempotency checks
};

/**
 * Acquire a distributed lock with automatic retry and error handling
 * @param {string} key - Lock key
 * @param {number} ttl - Time to live in milliseconds
 * @param {Object} options - Lock options
 * @returns {Promise<Object>} - Lock object with release method
 */
export async function acquireLock(key, ttl = lockTTL.webhook, options = {}) {
  try {
    const lock = await redlock.acquire([key], ttl);
    
    // Set up automatic extension if requested
    if (options.autoExtend) {
      const extensionInterval = setInterval(async () => {
        try {
          await lock.extend(ttl);
        } catch (error) {
          clearInterval(extensionInterval);
        }
      }, ttl * 0.7); // Extend when 70% of TTL remains
      
      // Store interval reference for cleanup
      lock._extensionInterval = extensionInterval;
    }
    
    return lock;
  } catch (error) {
    throw new Error(`Failed to acquire lock for key "${key}": ${error.message}`);
  }
}

/**
 * Release a distributed lock with error handling
 */
export async function releaseLock(lock) {
  try {
    if (lock && lock._extensionInterval) {
      clearInterval(lock._extensionInterval);
    }
    
    if (lock && typeof lock.release === 'function') {
      await lock.release();
    }
  } catch (error) {
    // Ignore lock release errors - they're not critical
    console.warn('Lock release warning:', error.message);
  }
}

/**
 * Execute a function with distributed lock protection
 */
export async function withLock(key, ttl, fn, options = {}) {
  const lock = await acquireLock(key, ttl, options);
  
  try {
    return await fn(lock);
  } finally {
    await releaseLock(lock);
  }
}

/**
 * Webhook-specific lock helper
 */
export async function withWebhookLock(transactionId, fn, options = {}) {
  const key = lockKeys.webhook(transactionId);
  const ttl = options.ttl || lockTTL.webhook;
  
  return withLock(key, ttl, fn, options);
}

/**
 * Order-specific lock helper
 */
export async function withOrderLock(orderId, fn, options = {}) {
  const key = lockKeys.order(orderId);
  const ttl = options.ttl || lockTTL.order;
  
  return withLock(key, ttl, fn, options);
}

/**
 * Stock-specific lock helper
 */
export async function withStockLock(productId, size, fn, options = {}) {
  const key = lockKeys.stock(productId, size);
  const ttl = options.ttl || lockTTL.stock;
  
  return withLock(key, ttl, fn, options);
}

/**
 * Idempotency-specific lock helper
 */
export async function withIdempotencyLock(idempotencyKey, fn, options = {}) {
  const key = lockKeys.idempotency(idempotencyKey);
  const ttl = options.ttl || lockTTL.idempotency;
  
  return withLock(key, ttl, fn, options);
}

/**
 * Check if Redis is connected and healthy
 */
export async function isRedisHealthy() {
  try {
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Redis connection info
 */
export function getRedisInfo() {
  return {
    connected: client.status === 'ready',
    status: client.status,
    host: client.options.host,
    port: client.options.port
  };
}

// Error handling for Redis connection
client.on('error', (error) => {
  console.error('Redis connection error:', error.message);
});

client.on('connect', () => {
  console.log('Redis connected successfully');
});

client.on('ready', () => {
  console.log('Redis ready for operations');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await client.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error.message);
  }
});

export { client, redlock };
export default { client, redlock, lockKeys, lockTTL, acquireLock, releaseLock, withLock, withWebhookLock, withOrderLock, withStockLock, withIdempotencyLock, isRedisHealthy, getRedisInfo };
