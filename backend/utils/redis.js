import Redis from 'ioredis';
import { config } from '../config.js';

let redis = null;
let redisEnabled = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts
      if (times > 3) {
        console.log('Redis connection failed after 3 attempts, disabling Redis');
        redisEnabled = false;
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
    redisEnabled = false;
  });

  redis.on('connect', () => {
    console.log('Connected to Redis');
    redisEnabled = true;
  });
} catch (error) {
  console.error('Failed to initialize Redis:', error);
  redisEnabled = false;
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
    console.error('Redis get error:', error);
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
    console.error('Redis set error:', error);
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
    console.error('Redis delete error:', error);
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
    console.error('Redis flush error:', error);
    return false;
  }
}

/**
 * Check if Redis is enabled and connected
 */
export function isRedisEnabled() {
  return redisEnabled && redis !== null;
}

export default {
  redis,
  isRedisEnabled,
  getCached,
  setCached,
  deleteCached,
  clearCache,
  CACHE_TTL
};