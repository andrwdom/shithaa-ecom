"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useHeroSectionImages } from '@/hooks/useHeroSectionImages'
import OptimizedImage from './optimized-image'

interface OptimizedMobileHeroCardProps {
  categorySlug: string
  title: string
  ctaText: string
  isComingSoon?: boolean
  onClick?: () => void
}

export default function OptimizedMobileHeroCard({
  categorySlug,
  title,
  ctaText,
  isComingSoon = false,
  onClick
}: OptimizedMobileHeroCardProps) {
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isIntersecting = useRef(true)
  const intersectionObserver = useRef<IntersectionObserver | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Use the hero images hook
  const { 
    images, 
    loading, 
    error, 
    currentImageIndex: hookIndex,
    isTransitioning: hookTransitioning,
    pauseSlideshow,
    resumeSlideshow
  } = useHeroSectionImages({
    categorySlug,
    limit: 6,
    autoPlay: true,
    interval: isMobile ? 4000 : 5000, // Shorter interval for mobile
    enableControls: true
  })

  // Detect mobile and setup intersection observer
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Setup intersection observer for performance
    if (cardRef.current) {
      intersectionObserver.current = new IntersectionObserver(
        ([entry]) => {
          isIntersecting.current = entry.isIntersecting
          if (entry.isIntersecting) {
            resumeSlideshow()
          } else {
            pauseSlideshow()
          }
        },
        { threshold: 0.1 }
      )
      intersectionObserver.current.observe(cardRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect()
      }
    }
  }, [pauseSlideshow, resumeSlideshow])

  // Optimized transition handling
  const handleTransition = useCallback(() => {
    if (images.length <= 1 || isPaused || !isIntersecting.current) return
    
    setIsTransitioning(true)
    
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      setTimeout(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length)
        
        // Use requestAnimationFrame for the fade-in
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsTransitioning(false)
          }, isMobile ? 50 : 100) // Faster on mobile
        })
      }, isMobile ? 300 : 500) // Shorter transition on mobile
    })
  }, [images.length, isPaused, isMobile])

  // Auto-rotate with mobile optimizations
  useEffect(() => {
    if (images.length <= 1 || isPaused || !isIntersecting.current) return

    const interval = isMobile ? 4000 : 5000 // Shorter interval for mobile
    intervalRef.current = setInterval(handleTransition, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [images.length, isPaused, handleTransition])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (images.length > 1) {
      const nextImage = images[(currentImageIndex + 1) % images.length]
      if (nextImage?.src) {
        const img = new Image()
        img.src = nextImage.src
      }
    }
  }, [currentImageIndex, images])

  const handleCardClick = () => {
    if (!isComingSoon && onClick) {
      onClick()
    } else if (!isComingSoon) {
      router.push(`/category/${categorySlug}`)
    }
  }

  const handleMouseEnter = () => {
    setIsPaused(true)
    pauseSlideshow()
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
    if (isIntersecting.current) {
      resumeSlideshow()
    }
  }

  const currentImage = images.length > 0 ? images[currentImageIndex] : null
  const nextImage = images.length > 1 ? images[(currentImageIndex + 1) % images.length] : null

  if (loading) {
    return (
      <div className="relative w-full h-64 md:h-80 bg-gray-200 animate-pulse rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-6 bg-gray-300 rounded animate-pulse mb-2" />
          <div className="h-4 bg-gray-300 rounded animate-pulse w-2/3" />
        </div>
      </div>
    )
  }

  if (error || !currentImage) {
    return (
      <div className="relative w-full h-64 md:h-80 bg-gray-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600">{ctaText}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-105"
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image Container with optimized transitions */}
      <div className="hero-carousel-container relative w-full h-full">
        {/* Current Image */}
        <OptimizedImage
          src={currentImage.src}
          alt={currentImage.alt || title}
          width={currentImage.width || 400}
          height={currentImage.height || 300}
          className={`hero-carousel-image absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          priority={currentImageIndex === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Next Image (preloaded) */}
        {nextImage && (
          <OptimizedImage
            src={nextImage.src}
            alt={nextImage.alt || title}
            width={nextImage.width || 400}
            height={nextImage.height || 300}
            className={`hero-carousel-image absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            priority={false}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all duration-300" />
      
      {/* Content */}
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <h3 className="text-xl md:text-2xl font-bold mb-2 drop-shadow-lg">
          {title}
        </h3>
        <p className="text-sm md:text-base drop-shadow-md">
          {isComingSoon ? 'Coming Soon' : ctaText}
        </p>
      </div>

      {/* Loading indicator for mobile */}
      {isMobile && images.length > 1 && (
        <div className="absolute top-4 right-4">
          <div className="flex space-x-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
