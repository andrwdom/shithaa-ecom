import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import productModel from '../models/productModel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// In-memory cache for generated thumbnails (LRU-like behavior)
const thumbnailCache = new Map()
const MAX_CACHE_SIZE = 100

// Ensure thumbnail directory exists
const THUMBNAIL_DIR = path.join(__dirname, '../uploads/hero-thumbs')
await fs.mkdir(THUMBNAIL_DIR, { recursive: true }).catch(() => {})

export const getHeroImages = async (req, res) => {
  try {
    const { categoryId, limit = 6 } = req.query
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
      })
    }

    const limitNum = Math.min(parseInt(limit) || 6, 10) // Cap at 10 for performance
    
    // Fetch products for the category
    const products = await productModel.find({
      $or: [
        { category: categoryId },
        { categorySlug: categoryId }
      ]
    }).select('_id customId name images category categorySlug').lean()
    
    if (!products || products.length === 0) {
      console.log(`No products found for category: ${categoryId}`)
      return res.json({
        success: true,
        images: []
      })
    }

    // Randomize products and take 1.5x limit as candidate pool
    const shuffledProducts = shuffleArray(products)
    const candidatePool = shuffledProducts.slice(0, Math.ceil(limitNum * 1.5))
    
    const validatedImages = []
    
    // Process each candidate product
    for (const product of candidatePool) {
      if (validatedImages.length >= limitNum) break
      
      try {
        const imageData = await processProductImage(product)
        if (imageData) {
          validatedImages.push(imageData)
        }
      } catch (error) {
        console.warn(`Failed to process image for product ${product._id}:`, error.message)
        continue
      }
    }

    // If no images were processed successfully, try to return fallback images
    if (validatedImages.length === 0) {
      console.log(`No valid images found for category: ${categoryId}, returning fallback`)
      const fallbackImages = await generateFallbackImages(categoryId, limitNum)
      if (fallbackImages.length > 0) {
        validatedImages.push(...fallbackImages)
      }
    }

    // Set cache headers for CDN/SSR caching
    res.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    
    res.json({
      success: true,
      images: validatedImages,
      total: validatedImages.length,
      categoryId
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
      cacheSize: thumbnailCache.size
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Hero images service is unhealthy',
      error: error.message
    })
  }
}

async function processProductImage(product) {
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
    const baseUrl = process.env.VPS_BASE_URL || 'http://localhost:4000'
    const fullImageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`
    
    // Validate the image exists and is actually an image
    const isValidImage = await validateImageUrl(fullImageUrl)
    if (!isValidImage) {
      console.warn(`Invalid image URL for product ${product._id}: ${fullImageUrl}`)
      return null
    }

    // Generate or get cached thumbnail
    const thumbnailData = await generateThumbnail(fullImageUrl, product._id.toString())
    if (!thumbnailData) {
      return null
    }

    return {
      productId: product._id.toString(),
      productName: product.name,
      originalUrl: fullImageUrl,
      thumbUrl: thumbnailData.thumbUrl,
      lqip: thumbnailData.lqip,
      width: thumbnailData.width,
      height: thumbnailData.height,
      trackingKey: `${product._id}-${Date.now()}`
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
      console.warn(`Invalid content type for ${url}: ${contentType}`)
      return false
    }
    
    // Check if image is too small (likely corrupted)
    if (contentLength && parseInt(contentLength) < 1000) {
      console.warn(`Image too small for ${url}: ${contentLength} bytes`)
      return false
    }
    
    return true
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.warn(`Connection refused for ${url}`)
    } else if (error.code === 'ENOTFOUND') {
      console.warn(`Image not found for ${url}`)
    } else if (error.code === 'ETIMEDOUT') {
      console.warn(`Timeout for ${url}`)
    } else {
      console.warn(`Image validation failed for ${url}:`, error.message)
    }
    return false
  }
}

async function generateThumbnail(imageUrl, productId) {
  try {
    // Check cache first
    const cacheKey = `${productId}-${imageUrl}`
    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)
    }

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    })

    const imageBuffer = Buffer.from(imageResponse.data)
    
    // Generate thumbnail (300px wide, maintain aspect ratio)
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, null, { withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer()
    
    // Generate LQIP (20px blur placeholder)
    const lqipBuffer = await sharp(imageBuffer)
      .resize(20, null, { withoutEnlargement: true })
      .blur(1)
      .webp({ quality: 30 })
      .toBuffer()
    
    // Convert LQIP to base64
    const lqipBase64 = `data:image/webp;base64,${lqipBuffer.toString('base64')}`
    
    // Save thumbnail to disk
    const thumbnailFilename = `${productId}-thumb.webp`
    const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename)
    await fs.writeFile(thumbnailPath, thumbnailBuffer)
    
    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata()
    
    const result = {
      thumbUrl: `/uploads/hero-thumbs/${thumbnailFilename}`,
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
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Generate fallback images when hero images fail to load
async function generateFallbackImages(categoryId, limit) {
  try {
    const fallbackImages = []
    const baseUrl = process.env.VPS_BASE_URL || 'http://localhost:4000'
    
    // Create placeholder images for the category
    for (let i = 0; i < limit; i++) {
      const fallbackImage = {
        productId: `fallback-${categoryId}-${i}`,
        productName: `Category ${categoryId}`,
        originalUrl: `${baseUrl}/placeholder.jpg`,
        thumbUrl: `${baseUrl}/placeholder.jpg`,
        lqip: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        width: 300,
        height: 400,
        trackingKey: `fallback-${categoryId}-${i}-${Date.now()}`
      }
      fallbackImages.push(fallbackImage)
    }
    
    return fallbackImages
  } catch (error) {
    console.error('Error generating fallback images:', error)
    return []
  }
} 