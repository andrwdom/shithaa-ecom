"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"

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
  maxImages = 4,
  onClick
}: HeroCategoryCardProps) {
  const [images, setImages] = useState<HeroImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useRef(false)
  const isIntersecting = useRef(true)
  const intersectionObserver = useRef<IntersectionObserver | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

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

  // Fetch hero images from the new endpoint
  const fetchHeroImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = new URL(`${baseUrl}/api/hero-images`)
      url.searchParams.append('categoryId', categorySlug)
      url.searchParams.append('device', isMobile.current ? 'mobile' : 'desktop')
      
      console.log(`Fetching hero images from: ${url.toString()}`)
      
      const response = await fetch(url.toString())
      
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
      
      // Preload first image for instant display
      if (heroImages.length > 0) {
        preloadImage(heroImages[0].thumbUrl)
      }
      
    } catch (err) {
      console.error(`Error fetching hero images for ${categorySlug}:`, err)
      setError('Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }, [categorySlug, isMobile])

  // Fetch images on mount
  useEffect(() => {
    fetchHeroImages()
  }, [fetchHeroImages])

  // Auto-rotate images with staggered transitions (only when visible and not paused)
  useEffect(() => {
    if (images.length <= 1 || isPaused || !isIntersecting.current) return

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

    // Stagger transitions randomly between 3-6 seconds
    const delay = 3000 + Math.random() * 3000
    intervalRef.current = setInterval(startTransition, delay)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [images.length, isPaused])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (images.length > 1 && isIntersecting.current) {
      const nextImage = images[(currentImageIndex + 1) % images.length]
      if (nextImage?.thumbUrl && !loadedImages.has(nextImage.thumbUrl)) {
        preloadImage(nextImage.thumbUrl)
      }
    }
  }, [currentImageIndex, images, loadedImages])

  // Preload image function
  const preloadImage = useCallback((src: string) => {
    const img = new (window.Image as any)()
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
        lqip: '',
        productId: '',
        productName: title,
        productSlug: categorySlug,
        thumbUrl: getPlaceholderImage(),
        originalUrl: getPlaceholderImage(),
        width: 400,
        height: 600
      }
    }
    return images[currentImageIndex]
  }, [images, currentImageIndex, title, categorySlug])

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
    if (isIntersecting.current) {
      setIsPaused(false)
    }
  }

  const handleImageError = () => {
    console.error(`hero-image-error category=${categorySlug} productId=${currentImage.productId} url=${currentImage.thumbUrl}`)
    setError('Image failed to load')
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    console.log(`Image loaded successfully for category ${categorySlug}:`, {
      productId: currentImage.productId,
      productName: currentImage.productName
    })
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
      ref={cardRef}
      data-category={categorySlug}
      className="relative h-80 lg:h-96 xl:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Images with Smooth Transitions */}
      <div className="absolute inset-0">
        {/* Current Image */}
        <div 
          className={`absolute inset-0 transition-opacity duration-800 ease-in-out ${
            isLoading || isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ willChange: 'opacity, transform' }}
        >
          <img
            src={currentImage.thumbUrl}
            alt={`${title} - ${currentImage.productName}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
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

        {/* Next Image (for smooth transitions) */}
        {images.length > 1 && (
          <div 
            className={`absolute inset-0 transition-opacity duration-800 ease-in-out ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ willChange: 'opacity, transform' }}
          >
            <img
              src={nextImage.thumbUrl}
              alt={`${title} - Next Product`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
              style={{
                backgroundImage: nextImage.lqip ? `url(${nextImage.lqip})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
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
function getPlaceholderImage(): string {
  return '/images/placeholder.webp'
} 