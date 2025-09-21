import path from 'path';
import fs from 'fs/promises';
import productModel from '../models/productModel.js';
import { config } from '../config.js';
import { getCached, setCached, CACHE_TTL } from '../utils/redis.js';

// Configuration constants
const MAX_DESKTOP = config.heroImages.maxDesktop || 8;
const MAX_MOBILE = config.heroImages.maxMobile || 4;
const MOBILE_THUMB_SIZE = config.heroImages.mobileThumbSize || 300;
const DESKTOP_THUMB_SIZE = config.heroImages.desktopThumbSize || 600;
const LQIP_SIZE = config.heroImages.lqipSize || 20;

// Helper function to shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get hero images for a category
 */
export const getHeroImages = async (req, res) => {
  const startTime = Date.now();
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { categoryId, limit, device = 'desktop' } = req.query;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      });
    }

    // Try to get from cache first
    const cacheKey = `hero_images:${categoryId}:${device}:${limit}`;
    const cached = await getCached(cacheKey);
    
    if (cached) {
      console.log(`[${correlationId}] Cache hit for ${cacheKey}`);
      return res.json({
        success: true,
        images: cached,
        total: cached.length,
        categoryId,
        device,
        fromCache: true
      });
    }

    // Determine limit based on device
    let limitNum = device === 'mobile' ? MAX_MOBILE : MAX_DESKTOP;
    if (limit) {
      limitNum = Math.min(parseInt(limit) || limitNum, limitNum);
    }
    
    console.log(`[${correlationId}] Fetching hero images for category: ${categoryId}, device: ${device}, limit: ${limitNum}`);
    
    // Fetch products for the category with pagination and lean query
    const products = await productModel.find({
      $or: [
        { category: categoryId },
        { categorySlug: categoryId }
      ],
      'images.0': { $exists: true } // Only get products with at least one image
    })
    .select('_id customId name images category categorySlug')
    .lean()
    .limit(limitNum * 2); // Fetch 2x limit for better randomization
    
    if (!products || products.length === 0) {
      console.log(`[${correlationId}] No products found for category: ${categoryId}`);
      return res.json({
        success: true,
        images: [],
        total: 0,
        categoryId,
        device
      });
    }

    // Process and validate images
    const validImages = products
      .filter(product => 
        product.images && 
        Array.isArray(product.images) && 
        product.images.length > 0 &&
        typeof product.images[0] === 'string' &&
        product.images[0].startsWith('http')
      )
      .map(product => ({
        productId: product._id,
        customId: product.customId,
        productName: product.name,
        imageUrl: product.images[0],
        category: product.category,
        categorySlug: product.categorySlug
      }));

    // Randomize and limit
    const selectedImages = shuffleArray(validImages).slice(0, limitNum);

    // Cache the results
    await setCached(cacheKey, selectedImages, CACHE_TTL.HERO_IMAGES);

    // Set cache headers for CDN/browser
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    const endTime = Date.now();
    console.log(`[${correlationId}] Hero images fetched in ${endTime - startTime}ms`);

    return res.json({
      success: true,
      images: selectedImages,
      total: selectedImages.length,
      categoryId,
      device,
      fromCache: false,
      timing: {
        total: endTime - startTime
      }
    });

  } catch (error) {
    console.error(`[${correlationId}] Error in getHeroImages:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Health check endpoint for hero images
 */
export const heroImagesHealth = async (req, res) => {
  try {
    // Check if we can query products
    const product = await productModel.findOne().select('_id').lean();
    
    if (!product) {
      return res.status(503).json({
        success: false,
        message: 'No products found in database'
      });
    }

    res.json({
      success: true,
      message: 'Hero images service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hero images health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Hero images service is unhealthy',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};