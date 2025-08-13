"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import ImageErrorBoundary from "./image-error-boundary"
import { useImageErrorHandler } from "./image-error-boundary"

interface HeroCategoryCardProps {
  categoryId: string
  categorySlug: string
  title: string
  ctaText: string
  isComingSoon?: boolean
  maxImages?: number
  onClick?: () => void
}

interface HeroImage {
  productId: string
  productName: string
  productSlug: string
  originalUrl: string
  thumbUrl: string
  lqip: string
  width: number
  height: number
}

export default function HeroCategoryCard({
  categoryId,
  categorySlug,
  title,
  ctaText,
  isComingSoon = false,
  maxImages = 6,
  onClick
}: HeroCategoryCardProps) {
  const [images, setImages] = useState<HeroImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false) // Changed to false to immediately show placeholder
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [hasVpsImages, setHasVpsImages] = useState(false) // Track if VPS images are available
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useRef(false)
  const isIntersecting = useRef(true)
  const intersectionObserver = useRef<IntersectionObserver | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map())

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = window.innerWidth < 768
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Setup intersection observer for performance optimization
  useEffect(() => {
    if (cardRef.current) {
      intersectionObserver.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isIntersecting.current = entry.isIntersecting
            if (!entry.isIntersecting) {
              // Pause animation when off-screen
              setIsPaused(true)
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            } else {
              // Resume animation when visible
              setIsPaused(false)
            }
          })
        },
        { threshold: 0.1 }
      )
      
      intersectionObserver.current.observe(cardRef.current)
    }

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect()
      }
    }
  }, [])

  // Fetch hero images from the API with retry logic
  const fetchHeroImages = useCallback(async () => {
    try {
      setError(null)
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = new URL(`${baseUrl}/api/hero-images`)
      url.searchParams.append('categoryId', categorySlug)
      url.searchParams.append('device', isMobile.current ? 'mobile' : 'desktop')
      url.searchParams.append('limit', maxImages.toString())
      
      console.log(`Fetching hero images from: ${url.toString()}`)
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch hero images: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success || !data.images) {
        throw new Error('Invalid response format')
      }
      
      const heroImages: HeroImage[] = data.images
      
      if (heroImages.length === 0) {
        console.warn(`No hero images found for category: ${categorySlug}`)
        setImages([])
        return
      }
      
      console.log(`Loaded ${heroImages.length} hero images for category: ${categorySlug}:`, heroImages.map(img => ({
        productId: img.productId,
        thumbUrl: img.thumbUrl,
        originalUrl: img.originalUrl
      })))
      
      setImages(heroImages)
      setHasVpsImages(true) // Mark that VPS images are now available
      
      // Preload images for smooth transitions
      if (heroImages.length > 0) {
        // Preload first few images for instant display and smooth transitions
        const imagesToPreload = heroImages.slice(0, Math.min(4, heroImages.length))
        imagesToPreload.forEach(img => preloadImage(img.thumbUrl))
      }
      
    } catch (err) {
      console.error(`Error fetching hero images for ${categorySlug}:`, err)
      setError('Failed to load images')
      // Try to use fallback images
      setImages([])
    }
  }, [categorySlug, maxImages, isMobile])

  // Fetch images on mount
  useEffect(() => {
    fetchHeroImages()
  }, [fetchHeroImages])

  // Auto-rotate images with smooth transitions (only when visible and not paused)
  useEffect(() => {
    if (images.length <= 1 || isPaused || !isIntersecting.current) return

    const startTransition = () => {
      if (images.length <= 1) return
      
      setIsTransitioning(true)
      
      // Complete the fade out before changing the image
      setTimeout(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length)
        // Wait for the new image to be set, then fade in
        setTimeout(() => {
          setIsTransitioning(false)
        }, 100) // Small delay to ensure state update
      }, 1000) // Full transition duration
    }

    // Stagger transitions between 4-6 seconds for a calmer feel
    const delay = 4000 + Math.random() * 2000
    intervalRef.current = setInterval(startTransition, delay)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [images.length, isPaused])

  // Preload image function with better error handling
  const preloadImage = useCallback((src: string) => {
    if (!src || preloadedImages.has(src)) return
    
    const img = new Image()
    img.onload = () => {
      setPreloadedImages(prev => new Set(prev).add(src))
      setLoadedImages(prev => new Set(prev).add(src))
    }
    img.onerror = () => {
      console.warn(`Failed to preload image: ${src}`)
    }
    img.src = src
  }, [preloadedImages])

  // Get current image - prioritize VPS images over placeholders
  const currentImage = useMemo(() => {
    if (hasVpsImages && images.length > 0) {
      return images[currentImageIndex]
    }
    // Return placeholder image when VPS images are not yet loaded
    return {
      src: getPlaceholderImage(categorySlug),
      alt: `${title} - ${categorySlug}`,
      lqip: '',
      productId: '',
      productName: title,
      productSlug: categorySlug,
      thumbUrl: getPlaceholderImage(categorySlug),
      originalUrl: getPlaceholderImage(categorySlug),
      width: 400,
      height: 600
    }
  }, [hasVpsImages, images, currentImageIndex, title, categorySlug])

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
      intervalRef.current = null
    }
  }

  const handleMouseLeave = () => {
    if (isIntersecting.current) {
      setIsPaused(false)
    }
  }

  const handleImageError = () => {
    console.error(`hero-image-error category=${categorySlug} productId=${currentImage.productId} url=${currentImage.thumbUrl}`)
    setError('Image failed to load')
  }

  const handleImageLoad = () => {
    console.log(`Image loaded successfully for category ${categorySlug}:`, {
      productId: currentImage.productId,
      productName: currentImage.productName
    })
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

  return (
    <div
      ref={cardRef}
      data-category={categorySlug}
      className="relative h-80 lg:h-96 xl:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Images with Optimized Transitions */}
      <div className="absolute inset-0">
        {/* Current Image */}
        <ImageErrorBoundary
          fallback={
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Image unavailable</p>
              </div>
            </div>
          }
        >
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ willChange: 'opacity' }}
          >
            <img
              src={currentImage.thumbUrl}
              alt={`${title} - ${currentImage.productName}`}
              className="w-full h-full object-cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="eager"
              style={{
                backgroundImage: currentImage.lqip ? `url(${currentImage.lqip})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </div>
        </ImageErrorBoundary>

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
function getPlaceholderImage(categorySlug: string): string {
  // Map category slugs to specific placeholder images
  switch (categorySlug) {
    case "maternity-feeding-wear":
      return "/placeholders/hero1.JPG"
    case "zipless-feeding-lounge-wear":
      return "/placeholders/hero2.JPG"
    case "non-feeding-lounge-wear":
      return "/placeholders/hero3.JPG"
    case "zipless-feeding-dupatta-lounge-wear":
      return "/placeholders/hero4.JPG"
    default:
      return "/placeholders/hero1.JPG"
  }
} 