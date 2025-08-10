"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import OptimizedImage from "./optimized-image"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { useIsMobile } from "@/hooks/use-mobile"

interface Category {
  id: number
  title: string
  slug: string
  image: string
  ctaText: string
  isComingSoon: boolean
}

interface OptimizedCategoryCardProps {
  category: Category
  index: number
  onClick: () => void
}

export const OptimizedCategoryCard: React.FC<OptimizedCategoryCardProps> = React.memo(({
  category,
  index,
  onClick
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const intervalRef = useRef<NodeJS.Timeout>()
  
  const isMobile = useIsMobile()
  
  // Intersection Observer for performance optimization
  const isVisible = useIntersectionObserver(cardRef, {
    threshold: 0.1,
    rootMargin: '50px'
  })

  // Generate multiple product images for this category (simulated for demo)
  const productImages = useMemo(() => {
    // In a real implementation, you'd fetch these from your API
    // For now, we'll create variations of the main image
    const baseImage = category.image
    if (baseImage.includes('placeholder')) {
      return [baseImage] // Don't animate placeholder images
    }
    
    // Create image variations for smooth transitions
    return [
      baseImage,
      baseImage.replace('.JPG', '_2.JPG').replace('.jpg', '_2.jpg'),
      baseImage.replace('.JPG', '_3.JPG').replace('.jpg', '_3.jpg'),
    ].filter(img => img !== baseImage || true) // Include base image
  }, [category.image])

  // Staggered animation timing - each card starts at a different time
  const animationDelay = useMemo(() => {
    // Random delay between 0-2 seconds for each card
    const baseDelay = (index * 0.5) + (Math.random() * 1.5)
    return baseDelay * 1000 // Convert to milliseconds
  }, [index])

  // Animation duration based on device type
  const animationDuration = useMemo(() => {
    return isMobile ? 600 : 400 // Slightly slower on mobile for better perception
  }, [isMobile])

  // Start animation loop when card becomes visible
  useEffect(() => {
    if (!isVisible || productImages.length <= 1 || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = undefined
      }
      return
    }

    // Add initial delay for staggered effect
    const startDelay = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (!isVisible || isPaused) return
        
        setIsTransitioning(true)
        
        // Use requestAnimationFrame for smooth transitions
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(() => {
            setCurrentImageIndex(prev => (prev + 1) % productImages.length)
            setIsTransitioning(false)
          }, animationDuration / 2)
        })
      }, 4000) // Change image every 4 seconds
    }, animationDelay)

    return () => {
      clearTimeout(startDelay)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, productImages.length, isPaused, animationDelay, animationDuration])

  // Pause animation when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (productImages.length > 1 && isVisible) {
      const nextImage = productImages[(currentImageIndex + 1) % productImages.length]
      if (nextImage && nextImage !== productImages[currentImageIndex]) {
        const img = new Image()
        img.src = nextImage
      }
    }
  }, [currentImageIndex, productImages, isVisible])

  // Handle mouse interactions
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false)
  }, [])

  // Get current and next images
  const currentImage = productImages[currentImageIndex] || category.image
  const nextImage = productImages.length > 1 
    ? productImages[(currentImageIndex + 1) % productImages.length]
    : currentImage

  // Dynamic background color based on category
  const getBackgroundColor = useCallback((categoryId: number) => {
    const colors = {
      1: "bg-blue-100/90",
      2: "bg-pink-100/90", 
      3: "bg-green-100/90",
      4: "bg-yellow-100/90"
    }
    return colors[categoryId as keyof typeof colors] || "bg-gray-100/90"
  }, [])

  return (
    <div
      ref={cardRef}
      className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer will-change-transform"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        // GPU acceleration for smooth animations
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Image Container with GPU-accelerated animations */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[2/3] lg:aspect-[3/4] xl:aspect-[2/3]">
        {/* Current Image */}
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out will-change-opacity ${
            !isLoaded || isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transform: 'translateZ(0)' }}
        >
          <OptimizedImage
            src={currentImage}
            alt={`${category.title} - Product ${currentImageIndex + 1}`}
            fill
            priority={index < 2} // Load first 2 images with priority
            className="object-cover object-center group-hover:scale-110 transition-transform duration-700 will-change-transform"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
            quality={85}
            onLoad={() => setIsLoaded(true)}
            onError={() => setIsLoaded(true)}
          />
        </div>

        {/* Next Image for smooth transitions */}
        {productImages.length > 1 && (
          <div 
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out will-change-opacity ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: 'translateZ(0)' }}
          >
            <OptimizedImage
              src={nextImage}
              alt={`${category.title} - Next Product`}
              fill
              className="object-cover object-center group-hover:scale-110 transition-transform duration-700 will-change-transform"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
              quality={85}
            />
          </div>
        )}

        {/* Loading State */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Content Overlay with Glass Effect */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 lg:p-6">
        <div className={`
          ${getBackgroundColor(category.id)}
          backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30 shadow-lg
          transition-all duration-300 group-hover:shadow-xl
        `}>
          <div className="text-center space-y-2">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 font-serif line-clamp-2 leading-tight">
              {category.title}
            </h3>
            <div className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
              {category.ctaText}
              {!category.isComingSoon && (
                <svg
                  className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform duration-300"
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
})

OptimizedCategoryCard.displayName = 'OptimizedCategoryCard' 