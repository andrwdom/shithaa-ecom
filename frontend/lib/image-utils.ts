/**
 * Image optimization utilities for the Shithaa frontend
 */

export interface ImageConfig {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  sizes?: string
  quality?: number
}

/**
 * Generate optimized image configuration
 */
export function getOptimizedImageConfig(
  src: string,
  alt: string,
  options: Partial<ImageConfig> = {}
): ImageConfig {
  const {
    width,
    height,
    priority = false,
    sizes = '100vw',
    quality = 85
  } = options

  return {
    src,
    alt,
    width,
    height,
    priority,
    sizes,
    quality
  }
}

/**
 * Generate responsive sizes string based on breakpoints
 */
export function getResponsiveSizes(
  mobile: string = '100vw',
  tablet: string = '50vw',
  desktop: string = '33vw'
): string {
  return `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, ${desktop}`
}

/**
 * Generate WebP version of image URL
 */
export function getWebPUrl(src: string): string {
  if (src.endsWith('.svg')) return src
  return src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
}

/**
 * Generate optimized image URLs for different sizes
 */
export function getOptimizedImageUrls(
  baseSrc: string,
  sizes: number[] = [300, 600, 800, 1200]
): string[] {
  if (baseSrc.endsWith('.svg')) return [baseSrc]
  
  return sizes.map(size => {
    const ext = baseSrc.split('.').pop()?.toLowerCase()
    const baseName = baseSrc.replace(/\.[^/.]+$/, '')
    return `${baseName}-${size}.${ext}`
  })
}

/**
 * Check if image should be loaded with priority
 */
export function shouldLoadPriority(
  index: number,
  isAboveFold: boolean = false,
  maxPriority: number = 2
): boolean {
  return isAboveFold || index < maxPriority
}

/**
 * Generate semantic alt text for product images
 */
export function generateProductAltText(
  productName: string,
  category: string,
  imageIndex: number = 1,
  totalImages: number = 1
): string {
  const imageType = totalImages > 1 ? `image ${imageIndex} of ${totalImages}` : 'main image'
  return `${productName} - ${category} - ${imageType}`
}

/**
 * Generate semantic alt text for banner images
 */
export function generateBannerAltText(
  title: string,
  description: string
): string {
  return `${title} - ${description}`
}

/**
 * Get image dimensions based on aspect ratio
 */
export function getImageDimensions(
  aspectRatio: number = 2/3,
  width: number = 800
): { width: number; height: number } {
  return {
    width,
    height: Math.round(width / aspectRatio)
  }
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false
  
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg']
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().endsWith(ext)
  )
  
  return hasValidExtension || url.startsWith('data:image')
}

/**
 * Get placeholder image URL
 */
export function getPlaceholderImage(
  width: number = 400,
  height: number = 600,
  text: string = 'Image'
): string {
  return `https://via.placeholder.com/${width}x${height}/f3f4f6/6b7280?text=${encodeURIComponent(text)}`
} 

/**
 * Image utility functions for better performance and error handling
 */

export interface ImageLoadOptions {
  priority?: boolean
  retryCount?: number
  retryDelay?: number
  timeout?: number
}

export interface ImageLoadResult {
  success: boolean
  url: string
  error?: string
  loadTime?: number
}

/**
 * Preload an image with retry logic and timeout
 */
export const preloadImage = async (
  src: string, 
  options: ImageLoadOptions = {}
): Promise<ImageLoadResult> => {
  const {
    priority = false,
    retryCount = 2,
    retryDelay = 1000,
    timeout = 10000
  } = options

  const startTime = performance.now()

  const attemptLoad = async (attempt: number): Promise<ImageLoadResult> => {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image()
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          img.src = ''
          reject(new Error('Image load timeout'))
        }, timeout)

        img.onload = () => {
          clearTimeout(timeoutId)
          const loadTime = performance.now() - startTime
          resolve({
            success: true,
            url: src,
            loadTime
          })
        }

        img.onerror = () => {
          clearTimeout(timeoutId)
          reject(new Error('Image failed to load'))
        }

        // Set priority loading
        if (priority) {
          img.fetchPriority = 'high'
        }

        img.src = src
      })
    } catch (error) {
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return attemptLoad(attempt + 1)
      }
      throw error
    }
  }

  try {
    return await attemptLoad(1)
  } catch (error) {
    return {
      success: false,
      url: src,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Preload multiple images with concurrency control
 */
export const preloadImages = async (
  urls: string[],
  options: ImageLoadOptions & { concurrency?: number } = {}
): Promise<ImageLoadResult[]> => {
  const { concurrency = 3, ...loadOptions } = options
  const results: ImageLoadResult[] = []
  
  // Process images in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchPromises = batch.map(url => preloadImage(url, loadOptions))
    
    const batchResults = await Promise.allSettled(batchPromises)
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({
          success: false,
          url: batch[index],
          error: 'Failed to load image'
        })
      }
    })
  }
  
  return results
}

/**
 * Generate a low-quality image placeholder (LQIP) URL
 */
export const generateLQIPUrl = (originalUrl: string, width: number = 20): string => {
  try {
    const url = new URL(originalUrl)
    url.searchParams.set('w', width.toString())
    url.searchParams.set('q', '10')
    url.searchParams.set('blur', '2')
    return url.toString()
  } catch {
    return originalUrl
  }
}

/**
 * Check if an image is cached in the browser
 */
export const isImageCached = (src: string): boolean => {
  try {
    const img = new Image()
    img.src = src
    return img.complete
  } catch {
    return false
  }
}

/**
 * Get image dimensions without loading the full image
 */
export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => reject(new Error('Failed to get image dimensions'))
    img.src = src
  })
}

/**
 * Optimize image URL for different screen sizes
 */
export const getOptimizedImageUrl = (
  originalUrl: string, 
  targetWidth: number,
  quality: number = 80
): string => {
  try {
    const url = new URL(originalUrl)
    url.searchParams.set('w', targetWidth.toString())
    url.searchParams.set('q', quality.toString())
    url.searchParams.set('fit', 'cover')
    return url.toString()
  } catch {
    return originalUrl
  }
}

/**
 * Create a responsive image srcset
 */
export const createResponsiveSrcset = (
  baseUrl: string,
  widths: number[],
  quality: number = 80
): string => {
  return widths
    .map(width => `${getOptimizedImageUrl(baseUrl, width, quality)} ${width}w`)
    .join(', ')
} 