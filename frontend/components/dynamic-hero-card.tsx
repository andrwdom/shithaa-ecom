"use client"

import React, { useState, useEffect, useCallback } from "react"
import OptimizedImage from "./optimized-image"

interface Product {
  _id: string
  name: string
  images: string[]
  category: string
  categorySlug: string
}

interface DynamicHeroCardProps {
  categorySlug: string
  title: string
  ctaText: string
  isComingSoon?: boolean
  fallbackImage?: string
  onClick?: () => void
}

export default function DynamicHeroCard({
  categorySlug,
  title,
  ctaText,
  isComingSoon = false,
  fallbackImage = "/placeholder.svg",
  onClick
}: DynamicHeroCardProps) {
  const [productImages, setProductImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch product images for this category
  const fetchProductImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = new URL(`${baseUrl}/api/products`)
      url.searchParams.append('categorySlug', categorySlug)
      url.searchParams.append('limit', '10') // Limit to 10 products for performance
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }
      
      const data = await response.json()
      const products: Product[] = data.products || data.data || []
      
      // Extract first image from each product
      const images = products
        .map(product => {
          if (Array.isArray(product.images) && product.images.length > 0) {
            return product.images[0]
          }
          return null
        })
        .filter((image): image is string => image !== null)
      
      setProductImages(images)
      
      if (images.length === 0) {
        console.warn(`No product images found for category: ${categorySlug}`)
      } else {
        console.log(`Loaded ${images.length} images for category: ${categorySlug}`)
      }
    } catch (err) {
      console.error(`Error fetching product images for ${categorySlug}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }, [categorySlug])

  // Cycle through images with fade animation
  useEffect(() => {
    if (productImages.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentImageIndex(prev => (prev + 1) % productImages.length)
        setIsTransitioning(false)
      }, 500) // Half of the transition duration
    }, 4000) // Change image every 4 seconds

    return () => clearInterval(interval)
  }, [productImages.length, isPaused])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (productImages.length > 1) {
      const nextImage = productImages[(currentImageIndex + 1) % productImages.length]
      if (nextImage) {
        const img = new Image()
        img.src = nextImage
      }
    }
  }, [currentImageIndex, productImages])

  // Fetch images on mount
  useEffect(() => {
    fetchProductImages()
  }, [fetchProductImages])

  // Get current image to display
  const currentImage = productImages.length > 0 
    ? productImages[currentImageIndex] 
    : fallbackImage

  // Get next image for smooth transition
  const nextImage = productImages.length > 1 
    ? productImages[(currentImageIndex + 1) % productImages.length]
    : currentImage

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

  return (
    <div
      className="relative h-80 lg:h-96 xl:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Images with Fade Animation */}
      <div className="absolute inset-0">
        {/* Current Image */}
        <div className={`absolute inset-0 image-fade-transition ${
          isLoading || isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
          <OptimizedImage
            src={currentImage}
            alt={`${title} - Product ${currentImageIndex + 1}`}
            fill
            priority={true}
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError('Failed to load image')
            }}
          />
        </div>

        {/* Next Image (for smooth transitions) */}
        {productImages.length > 1 && (
          <div className={`absolute inset-0 image-fade-transition ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}>
            <OptimizedImage
              src={nextImage}
              alt={`${title} - Next Product`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
        <div className={
          (categorySlug === "maternity-feeding-wear"
            ? "bg-blue-100/50 backdrop-blur-sm "
            : categorySlug === "zipless-feeding-lounge-wear"
            ? "bg-pink-100/50 backdrop-blur-sm "
            : categorySlug === "non-feeding-lounge-wear"
            ? "bg-green-100/50 backdrop-blur-sm "
            : categorySlug === "zipless-feeding-dupatta-lounge-wear"
            ? "bg-yellow-100/50 backdrop-blur-sm "
            : "bg-gray-100/50 backdrop-blur-sm ") +
          "rounded-xl p-4 border border-white/20 shadow-xl"
        }>
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