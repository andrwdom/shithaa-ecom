import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * Hero Section Image Management Utilities
 * Handles fetching, randomizing, and validating images for hero section categories
 */

export interface HeroSectionImage {
  src: string
  alt: string
  productId: string
  productName: string
  isValid: boolean
}

export interface HeroSectionCategory {
  id: number
  title: string
  slug: string
  ctaText: string
  isComingSoon: boolean
}

/**
 * Fetch and validate images for a specific category
 */
export async function getHeroSectionImages(
  categorySlug: string, 
  limit: number = 8
): Promise<HeroSectionImage[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const url = new URL(`${baseUrl}/api/products`)
    url.searchParams.append('categorySlug', categorySlug)
    url.searchParams.append('limit', '20') // Fetch more to have variety
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.warn(`Failed to fetch products for ${categorySlug}: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    const products = data.products || data.data || []
    
    if (products.length === 0) {
      console.warn(`No products found for category: ${categorySlug}`)
      return []
    }
    
    // Extract and validate images from products
    const allImages: HeroSectionImage[] = products
      .map((product: any) => {
        if (Array.isArray(product.images) && product.images.length > 0) {
          const imageUrl = normalizeImageUrl(product.images[0])
          return {
            src: imageUrl,
            alt: `${product.name} - ${categorySlug}`,
            productId: product._id || product.customId,
            productName: product.name,
            isValid: true
          }
        }
        return null
      })
      .filter((image): image is HeroSectionImage => image !== null)
    
    // Randomize and limit the selection
    const randomizedImages = shuffleArray(allImages).slice(0, limit)
    
    // Validate images and replace invalid ones with placeholders
    const validatedImages = await Promise.all(
      randomizedImages.map(async (image) => {
        const isValid = await validateImageUrl(image.src)
        return {
          ...image,
          isValid,
          src: isValid ? image.src : getPlaceholderImage(image.productName)
        }
      })
    )
    
    console.log(`Loaded ${validatedImages.length} validated images for ${categorySlug}`)
    return validatedImages
    
  } catch (error) {
    console.error(`Error fetching hero section images for ${categorySlug}:`, error)
    return []
  }
}

/**
 * Randomize array using Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Normalize image URL to handle case sensitivity and ensure proper format
 */
function normalizeImageUrl(url: string): string {
  if (!url) return ''
  
  // Handle relative URLs - ensure they go through Cloudflare domain
  if (url.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shithaa.in'
    return `${baseUrl}${url}`
  }
  
  // Handle absolute URLs - ensure they go through Cloudflare domain
  if (url.startsWith('http')) {
    // If it's already using our domain, keep it
    if (url.includes('shithaa.in')) {
      return url
    }
    // Convert any VPS direct URLs to Cloudflare domain
    if (url.includes('localhost:4000') || url.includes('127.0.0.1')) {
      return url.replace(/https?:\/\/[^\/]+/, 'https://shithaa.in')
    }
    return url
  }
  
  // Normalize file extensions to lowercase
  const normalized = url.replace(/\.(JPG|JPEG|PNG|WEBP)$/i, (match) => match.toLowerCase())
  
  return normalized
}

/**
 * Validate if an image URL is accessible
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    // Skip validation for placeholder images
    if (url.includes('placeholder') || url.includes('via.placeholder')) {
      return true
    }
    
    // For relative URLs, assume they're valid (they're on our server)
    if (url.startsWith('/')) {
      return true
    }
    
    // For external URLs, check if they're accessible
    if (url.startsWith('http')) {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    }
    
    return true
  } catch (error) {
    console.warn(`Image validation failed for ${url}:`, error)
    return false
  }
}

/**
 * Get placeholder image URL
 */
function getPlaceholderImage(productName: string): string {
  const width = 400
  const height = 600
  const text = encodeURIComponent(productName || 'Product Image')
  return `https://via.placeholder.com/${width}x${height}/f3f4f6/6b7280?text=${text}`
}

/**
 * Preload critical images for better performance
 */
export function preloadHeroImages(images: HeroSectionImage[], priorityCount: number = 2): void {
  const priorityImages = images.slice(0, priorityCount)
  
  priorityImages.forEach((image) => {
    if (image.isValid && image.src) {
      const img = new Image()
      img.src = image.src
    }
  })
}

/**
 * Get responsive image sizes for hero section cards
 */
export function getHeroCardImageSizes(): string {
  return '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
}

/**
 * Default hero section categories configuration
 */
export const HERO_SECTION_CATEGORIES: HeroSectionCategory[] = [
  {
    id: 1,
    title: "Maternity Feeding Wear",
    slug: "maternity-feeding-wear",
    ctaText: "See Styles",
    isComingSoon: false,
  },
  {
    id: 2,
    title: "Zipless Feeding Lounge Wear",
    slug: "zipless-feeding-lounge-wear",
    ctaText: "View Drop",
    isComingSoon: false,
  },
  {
    id: 3,
    title: "Non-Feeding Lounge Wear",
    slug: "non-feeding-lounge-wear",
    ctaText: "Unveil Now",
    isComingSoon: false,
  },
  {
    id: 4,
    title: "Zipless Feeding Dupatta Lounge Wear",
    slug: "zipless-feeding-dupatta-lounge-wear",
    ctaText: "Check Out",
    isComingSoon: false,
  },
] 