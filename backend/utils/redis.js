import Redis from 'ioredis';

let redis = null;
let redisEnabled = false;

// Only initialize Redis if explicitly configured
if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  try {
    console.log('Redis configuration found, attempting to connect...');
    
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        // Stop retrying after 1 attempt in development
        if (process.env.NODE_ENV === 'development' && times > 1) {
          console.log('Redis connection failed in development, disabling Redis');
          redisEnabled = false;
          return null;
        }
        // Stop retrying after 3 attempts in production
        if (process.env.NODE_ENV === 'production' && times > 3) {
          console.log('Redis connection failed in production after 3 attempts, disabling Redis');
          redisEnabled = false;
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    redis.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.log('Redis connection refused, disabling Redis');
        redisEnabled = false;
        // Cleanup the client to prevent memory leaks
        redis.disconnect();
        redis = null;
      } else {
        console.error('Redis error:', error);
      }
    });

    redis.on('connect', () => {
      console.log('Connected to Redis successfully');
      redisEnabled = true;
    });

    // Initial connection test
    redis.ping().then(() => {
      console.log('Redis ping successful');
      redisEnabled = true;
    }).catch(() => {
      console.log('Redis ping failed, disabling Redis');
      redisEnabled = false;
      redis.disconnect();
      redis = null;
    });

  } catch (error) {
    console.log('Failed to initialize Redis, continuing without caching:', error.message);
    redisEnabled = false;
    redis = null;
  }
} else {
  console.log('No Redis configuration found, continuing without caching');
}

export const CACHE_TTL = {
  HERO_IMAGES: 300, // 5 minutes
  PRODUCT_LIST: 600, // 10 minutes
  CATEGORY_LIST: 1800 // 30 minutes
};

/**
 * Get cached data with JSON parsing
 */
export async function getCached(key) {
  if (!redisEnabled || !redis) return null;
  
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    // Don't log ECONNREFUSED errors as they're already handled
    if (error.code !== 'ECONNREFUSED') {
      console.error('Redis get error:', error);
    }
    return null;
  }
}

/**
 * Set cached data with JSON stringification
 */
export async function setCached(key, value, ttl = 300) {
  if (!redisEnabled || !redis) return false;
  
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
    return true;
  } catch (error) {
    // Don't log ECONNREFUSED errors as they're already handled
    if (error.code !== 'ECONNREFUSED') {
      console.error('Redis set error:', error);
    }
    return false;
  }
}

/**
 * Delete cached data
 */
export async function deleteCached(key) {
  if (!redisEnabled || !redis) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    // Don't log ECONNREFUSED errors as they're already handled
    if (error.code !== 'ECONNREFUSED') {
      console.error('Redis delete error:', error);
    }
    return false;
  }
}

/**
 * Clear all cached data (use with caution)
 */
export async function clearCache() {
  if (!redisEnabled || !redis) return false;
  
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    // Don't log ECONNREFUSED errors as they're already handled
    if (error.code !== 'ECONNREFUSED') {
      console.error('Redis flush error:', error);
    }
    return false;
  }
}

/**
 * Check if Redis is enabled and connected
 */
export function isRedisEnabled() {
  return redisEnabled && redis !== null;
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  if (redis) {
    console.log('Closing Redis connection...');
    redis.disconnect();
  }
});

export default {
  redis,
  isRedisEnabled,
  getCached,
  setCached,
  deleteCached,
  clearCache,
  CACHE_TTL
};