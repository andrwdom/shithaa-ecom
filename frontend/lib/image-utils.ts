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