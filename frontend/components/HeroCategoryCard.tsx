"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Image from "next/image"

interface HeroCategoryCardProps {
  categoryId: string
  categorySlug: string
  title: string
  ctaText: string
  isComingSoon?: boolean
  maxImages?: number
  onClick?: () => void
}

interface ProductImage {
  src: string
  alt: string
  productId: string
  productName: string
}

export default function HeroCategoryCard({
  categoryId,
  categorySlug,
  title,
  ctaText,
  isComingSoon = false,
  maxImages = 4,
  onClick
}: HeroCategoryCardProps) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useRef(false)

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = window.innerWidth < 768
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch and randomize product images
  const fetchProductImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = new URL(`${baseUrl}/api/products`)
      url.searchParams.append('categorySlug', categorySlug)
      url.searchParams.append('limit', '20') // Fetch more for variety
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }
      
      const data = await response.json()
      const products = data.products || data.data || []
      
      if (products.length === 0) {
        console.warn(`No products found for category: ${categorySlug}`)
        setImages([])
        return
      }
      
      // Extract first image from each product and randomize
      const allImages: ProductImage[] = products
        .map((product: any) => {
          if (Array.isArray(product.images) && product.images.length > 0) {
            const imageUrl = normalizeImageUrl(product.images[0])
            return {
              src: imageUrl,
              alt: `${product.name} - ${title}`,
              productId: product._id || product.customId || product.id,
              productName: product.name
            }
          }
          return null
        })
        .filter((image): image is ProductImage => image !== null)
      
      // Randomize and limit to maxImages
      const randomizedImages = shuffleArray(allImages).slice(0, maxImages)
      setImages(randomizedImages)
      
      // Preload first image for instant display
      if (randomizedImages.length > 0) {
        preloadImage(randomizedImages[0].src)
      }
      
      console.log(`Loaded ${randomizedImages.length} images for category: ${categorySlug}`)
      
    } catch (err) {
      console.error(`Error fetching images for ${categorySlug}:`, err)
      setError('Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }, [categorySlug, title, maxImages])

  // Fetch images on mount
  useEffect(() => {
    fetchProductImages()
  }, [fetchProductImages])

  // Auto-rotate images with staggered transitions
  useEffect(() => {
    if (images.length <= 1 || isPaused) return

    const startTransition = () => {
      setIsTransitioning(true)
      
      // Use requestAnimationFrame for smooth transitions
      requestAnimationFrame(() => {
        setTimeout(() => {
          setCurrentImageIndex(prev => (prev + 1) % images.length)
          setIsTransitioning(false)
        }, 300) // Half of transition duration
      })
    }

    // Stagger transitions randomly between 4-8 seconds
    const delay = 4000 + Math.random() * 4000
    intervalRef.current = setInterval(startTransition, delay)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [images.length, isPaused])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (images.length > 1) {
      const nextImage = images[(currentImageIndex + 1) % images.length]
      if (nextImage?.src && !loadedImages.has(nextImage.src)) {
        preloadImage(nextImage.src)
      }
    }
  }, [currentImageIndex, images, loadedImages])

  // Preload image function
  const preloadImage = useCallback((src: string) => {
    const img = new Image()
    img.onload = () => {
      setLoadedImages(prev => new Set(prev).add(src))
    }
    img.onerror = () => {
      console.warn(`Failed to preload image: ${src}`)
    }
    img.src = src
  }, [])

  // Get current and next images
  const currentImage = useMemo(() => {
    if (images.length === 0) {
      return {
        src: getPlaceholderImage(),
        alt: `${title} - Coming Soon`,
        productId: '',
        productName: title
      }
    }
    return images[currentImageIndex]
  }, [images, currentImageIndex, title])

  const nextImage = useMemo(() => {
    if (images.length <= 1) return currentImage
    return images[(currentImageIndex + 1) % images.length]
  }, [images, currentImageIndex, currentImage])

  // Event handlers
  const handleCardClick = () => {
    if (!isComingSoon && onClick) {
      onClick()
    }
  }

  const handleMouseEnter = () => {
    setIsPaused(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  const handleImageError = () => {
    setError('Image failed to load')
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  // Get category-specific styling
  const getCategoryStyles = () => {
    const baseStyles = "bg-gray-100/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-xl"
    
    switch (categorySlug) {
      case "maternity-feeding-wear":
        return `bg-blue-100/50 backdrop-blur-sm ${baseStyles}`
      case "zipless-feeding-lounge-wear":
        return `bg-pink-100/50 backdrop-blur-sm ${baseStyles}`
      case "non-feeding-lounge-wear":
        return `bg-green-100/50 backdrop-blur-sm ${baseStyles}`
      case "zipless-feeding-dupatta-lounge-wear":
        return `bg-yellow-100/50 backdrop-blur-sm ${baseStyles}`
      default:
        return baseStyles
    }
  }

  // Get responsive image sizes
  const getImageSizes = () => {
    return '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
  }

  return (
    <div
      className="relative h-80 lg:h-96 xl:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Images with Smooth Transitions */}
      <div className="absolute inset-0">
        {/* Current Image */}
        <div 
          className={`absolute inset-0 transition-opacity duration-600 ease-in-out ${
            isLoading || isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ willChange: 'opacity' }}
        >
          <Image
            src={currentImage.src}
            alt={currentImage.alt}
            fill
            priority={true}
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            sizes={getImageSizes()}
            quality={85}
            onLoad={handleImageLoad}
            onError={handleImageError}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        </div>

        {/* Next Image (for smooth transitions) */}
        {images.length > 1 && (
          <div 
            className={`absolute inset-0 transition-opacity duration-600 ease-in-out ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ willChange: 'opacity' }}
          >
            <Image
              src={nextImage.src}
              alt={nextImage.alt}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              sizes={getImageSizes()}
              quality={85}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            />
          </div>
        )}

        {/* Loading Overlay with Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

      {/* Glass Effect Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className={getCategoryStyles()}>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-gray-900 font-serif line-clamp-2">
              {title}
            </h3>
            <div className="inline-flex items-center text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
              {ctaText}
              {!isComingSoon && (
                <svg
                  className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-white/30 transition-all duration-300" />
    </div>
  )
}

// Helper functions
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function normalizeImageUrl(url: string): string {
  if (!url) return ''
  
  // Handle relative URLs
  if (url.startsWith('/')) {
    return url
  }
  
  // Handle absolute URLs
  if (url.startsWith('http')) {
    return url
  }
  
  // Normalize file extensions to lowercase
  const normalized = url.replace(/\.(JPG|JPEG|PNG|WEBP)$/i, (match) => match.toLowerCase())
  
  return normalized
}

function getPlaceholderImage(): string {
  return '/placeholder.jpg'
} 