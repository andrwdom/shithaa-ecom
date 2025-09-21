import Redis from 'ioredis';
import { config } from '../config.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

export const CACHE_TTL = {
  HERO_IMAGES: 300, // 5 minutes
  PRODUCT_LIST: 600, // 10 minutes
  CATEGORY_LIST: 1800 // 30 minutes
};

/**
 * Get cached data with JSON parsing
 */
export async function getCached(key) {
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
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    console.error('Redis flush error:', error);
    return false;
  }
}

export default redis;
