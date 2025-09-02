"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import OptimizedImage from "./optimized-image"
import { 
  getHeroSectionImages, 
  preloadHeroImages, 
  getHeroCardImageSizes,
  type HeroSectionImage 
} from "@/lib/hero-section-images"

interface OptimizedHeroCardProps {
  categorySlug: string
  title: string
  ctaText: string
  isComingSoon?: boolean
  onClick?: () => void
}

export default function OptimizedHeroCard({
  categorySlug,
  title,
  ctaText,
  isComingSoon = false,
  onClick
}: OptimizedHeroCardProps) {
  const [images, setImages] = useState<HeroSectionImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch product images for this category
  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const fetchedImages = await getHeroSectionImages(categorySlug, 8)
      setImages(fetchedImages)
      
      if (fetchedImages.length > 0) {
        // Preload first few images for better performance
        preloadHeroImages(fetchedImages, 3)
      }
      
    } catch (err) {
      console.error(`Error fetching images for ${categorySlug}:`, err)
      setError('Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }, [categorySlug])

  // Fetch images on mount
  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // Auto-rotate images with smooth transitions
  useEffect(() => {
    if (images.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50) // Small delay to ensure state update
      }, 500) // Half of the transition duration
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [images.length, isPaused])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (images.length > 1) {
      const nextImage = images[(currentImageIndex + 1) % images.length]
      if (nextImage?.isValid && nextImage.src) {
        const img = new Image()
        img.src = nextImage.src
      }
    }
  }, [currentImageIndex, images])

  // Get current and next images
  const currentImage = useMemo(() => {
    if (images.length === 0) {
      return {
        src: getPlaceholderImage(title),
        alt: `${title} - Coming Soon`,
        isValid: false
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
        <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isLoading || isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
          <OptimizedImage
            src={currentImage.src}
            alt={currentImage.alt}
            fill
            priority={true}
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes={getHeroCardImageSizes()}
            quality={85}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>

        {/* Next Image (for smooth transitions) */}
        {images.length > 1 && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}>
            <OptimizedImage
              src={nextImage.src}
              alt={nextImage.alt}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              sizes={getHeroCardImageSizes()}
              quality={85}
            />
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-gray-500 text-sm text-center px-4">
              {error}
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

      {/* Image Counter Indicator */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white text-xs font-medium">
            {currentImageIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </div>
  )
}

// Helper function for placeholder image
function getPlaceholderImage(title: string): string {
  const width = 400
  const height = 600
  const text = encodeURIComponent(title || 'Product Image')
  return `https://via.placeholder.com/${width}x${height}/f3f4f6/6b7280?text=${text}`
} 