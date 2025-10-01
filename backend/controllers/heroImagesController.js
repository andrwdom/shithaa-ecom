import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import productModel from '../models/productModel.js'
import { config } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// In-memory cache for generated thumbnails (LRU-like behavior)
const thumbnailCache = new Map()
const MAX_CACHE_SIZE = 100

// Ensure thumbnail directory exists
// Resolve uploads base directory preferring the server's shared path used by Nginx
async function resolveUploadsBasePath() {
  const candidates = [
    // Prefer the production path used by Nginx alias
    '/var/www/shithaa-ecom/uploads',
    // Then explicit env/config
    config.uploadPath,
    // Finally fallback to project-local uploads for dev
    path.resolve(process.cwd(), 'uploads')
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const absolute = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate)
      await fs.mkdir(absolute, { recursive: true })
      return absolute
    } catch {
      // try next candidate
    }
  }
  // Last resort
  return path.resolve(process.cwd(), 'uploads')
}

const uploadsBasePath = await resolveUploadsBasePath()
const THUMBNAIL_DIR = path.join(uploadsBasePath, 'hero-thumbs')
await fs.mkdir(THUMBNAIL_DIR, { recursive: true }).catch(() => {})

// Configuration constants
const MAX_DESKTOP = config.heroImages.maxDesktop
const MAX_MOBILE = config.heroImages.maxMobile
const MOBILE_THUMB_SIZE = config.heroImages.mobileThumbSize
const DESKTOP_THUMB_SIZE = config.heroImages.desktopThumbSize
const LQIP_SIZE = config.heroImages.lqipSize

export const getHeroImages = async (req, res) => {
  try {
    const { categoryId, limit, device = 'desktop' } = req.query
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      })
    }

    // Determine limit based on device
    let limitNum = device === 'mobile' ? MAX_MOBILE : MAX_DESKTOP
    if (limit) {
      limitNum = Math.min(parseInt(limit) || limitNum, limitNum)
    }
    
    console.log(`Fetching hero images for category: ${categoryId}, device: ${device}, limit: ${limitNum}`)
    
    // Fetch products for the category
    const products = await productModel.find({
      $or: [
        { category: categoryId },
        { categorySlug: categoryId }
      ]
    }).select('_id customId name images category categorySlug').lean()
    
    console.log(`Found ${products ? products.length : 0} products for category: ${categoryId}`)
    
    if (!products || products.length === 0) {
      console.log(`No products found for category: ${categoryId}`)
      return res.json({
        success: true,
        images: [],
        total: 0,
        categoryId,
        device
      })
    }
    
    // Log first product for debugging
    if (products.length > 0) {
      const sample = products[0]
      console.log(`Sample product: ${sample.name}, categorySlug: ${sample.categorySlug}, images: ${sample.images ? sample.images.length : 0}`)
    }

    // Randomize products and take 1.5x limit as candidate pool
    const shuffledProducts = shuffleArray(products)
    const candidatePool = shuffledProducts.slice(0, Math.ceil(limitNum * 1.5))
    
    const validatedImages = []
    
    // Process each candidate product
    for (const product of candidatePool) {
      if (validatedImages.length >= limitNum) break
      
      try {
        const imageData = await processProductImage(product, device)
        if (imageData) {
          validatedImages.push(imageData)
        }
      } catch (error) {
        console.warn(`hero-image-skip productId=${product._id} reason=processing_error: ${error.message}`)
        continue
      }
    }

    // If no images were processed successfully, return empty array
    // The frontend will handle the fallback with proper placeholder images
    if (validatedImages.length === 0) {
      console.log(`No valid images found for category: ${categoryId}, returning empty array (frontend will handle fallback)`)
    }

    // Set cache headers for CDN/SSR caching
    res.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    
    res.json({
      success: true,
      images: validatedImages,
      total: validatedImages.length,
      categoryId,
      device
    })

  } catch (error) {
    console.error('Error in getHeroImages:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Health check endpoint for hero images
export const heroImagesHealth = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Hero images service is healthy',
      timestamp: new Date().toISOString(),
      thumbnailDir: THUMBNAIL_DIR,
      cacheSize: thumbnailCache.size,
      config: {
        maxDesktop: MAX_DESKTOP,
        maxMobile: MAX_MOBILE,
        mobileThumbSize: MOBILE_THUMB_SIZE,
        desktopThumbSize: DESKTOP_THUMB_SIZE,
        lqipSize: LQIP_SIZE
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Hero images service is unhealthy',
      error: error.message
    })
  }
}

async function processProductImage(product, device) {
  try {
    // Get the first image from the product
    const imagePath = Array.isArray(product.images) && product.images.length > 0 
      ? product.images[0] 
      : null
    
    if (!imagePath) {
      console.log(`No images found for product ${product._id}`)
      return null
    }

    // Normalize the image path
    const normalizedPath = normalizeImagePath(imagePath)
    
    // Build the full URL for validation
    const baseUrl = config.vpsBaseUrl
    const fullImageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`
    
    // SIMPLIFIED: Skip validation and thumbnail generation for now
    // Just return the image URLs directly since we know products have images
    console.log(`Using product image for hero: ${product.name} - ${fullImageUrl}`)
    
    return {
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.categorySlug || product.category,
      originalUrl: fullImageUrl,
      thumbUrl: fullImageUrl, // Use original image directly
      lqip: '', // No LQIP for now
      width: 400,
      height: 600
    }

  } catch (error) {
    console.error(`Error processing product ${product._id}:`, error)
    return null
  }
}

async function validateImageUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 400,
      maxRedirects: 3
    })
    
    const contentType = response.headers['content-type']
    const contentLength = response.headers['content-length']
    
    // Check if it's an image
    if (!contentType || !contentType.startsWith('image/')) {
      return {
        isValid: false,
        reason: `invalid_content_type: ${contentType}`
      }
    }
    
    // Check if content type is HTML (likely 404 page)
    if (contentType.includes('text/html')) {
      return {
        isValid: false,
        reason: 'html_response'
      }
    }
    
    // Check if image is too small (likely corrupted)
    if (contentLength && parseInt(contentLength) < 1000) {
      return {
        isValid: false,
        reason: `too_small: ${contentLength} bytes`
      }
    }
    
    return { isValid: true }
  } catch (error) {
    let reason = 'unknown_error'
    
    if (error.code === 'ECONNREFUSED') {
      reason = 'connection_refused'
    } else if (error.code === 'ENOTFOUND') {
      reason = 'not_found'
    } else if (error.code === 'ETIMEDOUT') {
      reason = 'timeout'
    } else if (error.response) {
      reason = `http_${error.response.status}`
    }
    
    return {
      isValid: false,
      reason
    }
  }
}

async function generateThumbnail(imageUrl, productId, device) {
  try {
    // Check cache first
    const cacheKey = `${productId}-${device}-${imageUrl}`
    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)
    }

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    })

    const imageBuffer = Buffer.from(imageResponse.data)
    
    // Determine thumbnail size based on device
    const thumbSize = device === 'mobile' ? MOBILE_THUMB_SIZE : DESKTOP_THUMB_SIZE
    
    // Generate thumbnail (maintain aspect ratio)
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(thumbSize, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    
    // Generate LQIP (20px blur placeholder)
    const lqipBuffer = await sharp(imageBuffer)
      .resize(LQIP_SIZE, null, { withoutEnlargement: true })
      .blur(1)
      .webp({ quality: 30 })
      .toBuffer()
    
    // Convert LQIP to base64
    const lqipBase64 = `data:image/webp;base64,${lqipBuffer.toString('base64')}`
    
    // Save thumbnail to disk with device-specific naming
    const thumbnailFilename = `${productId}-${device}-thumb.webp`
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename)
    await fs.writeFile(thumbnailPath, thumbnailBuffer)
    
    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata()
    
    const result = {
      // Important: use /images to match Nginx alias -> /var/www/shithaa-ecom/uploads
      thumbUrl: `/images/hero-thumbs/${thumbnailFilename}`,
      lqip: lqipBase64,
      width: metadata.width,
      height: metadata.height
    }
    
    // Cache the result
    if (thumbnailCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries
      const firstKey = thumbnailCache.keys().next().value
      thumbnailCache.delete(firstKey)
    }
    thumbnailCache.set(cacheKey, result)
    
    return result

  } catch (error) {
    console.error(`Thumbnail generation failed for ${imageUrl}:`, error)
    return null
  }
}

function normalizeImagePath(imagePath) {
  if (!imagePath) return ''
  
  // Handle relative URLs
  if (imagePath.startsWith('/')) {
    return imagePath
  }
  
  // Handle absolute URLs
  if (imagePath.startsWith('http')) {
    return imagePath
  }
  
  // Normalize file extensions to lowercase
  const normalized = imagePath.replace(/\.(JPG|JPEG|PNG|WEBP)$/i, (match) => match.toLowerCase())
  
  return normalized
}

function shuffleArray(array) {
  // Input validation: handle undefined, null, or non-array inputs
  if (!Array.isArray(array)) {
    console.warn('shuffleArray: Invalid input received:', {
      type: typeof array,
      value: array,
      stack: new Error().stack
    })
    return []
  }
  
  // Handle empty array case
  if (array.length === 0) {
    return []
  }
  
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

// Generate fallback images when hero images fail to load
async function generateFallbackImages(categoryId, limit) {
  try {
    const fallbackImages = []
    const baseUrl = config.vpsBaseUrl
    
    // Create placeholder images for the category
    for (let i = 0; i < limit; i++) {
      const fallbackImage = {
        productId: `fallback-${categoryId}-${i}`,
        productName: `Category ${categoryId}`,
        productSlug: categoryId,
        originalUrl: `${baseUrl}/placeholder.jpg`,
        thumbUrl: `${baseUrl}/placeholder.jpg`,
        lqip: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        width: 300,
        height: 400
      }
      fallbackImages.push(fallbackImage)
    }
    
    return fallbackImages
  } catch (error) {
    console.error('Error generating fallback images:', error)
    return []
  }
} 