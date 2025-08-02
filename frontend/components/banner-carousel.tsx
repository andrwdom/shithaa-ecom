"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import OptimizedImage from './optimized-image'
import FallbackCarousel from './fallback-carousel'
import { useCarousel } from '@/hooks/useCarousel'
import { CarouselImage, BannerCarouselProps } from '@/types/carousel'

export default function BannerCarousel({
  images = [],
  autoPlay = true,
  interval = 5000,
  showArrows = true,
  showDots = true,
  className = ''
}: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  
  const carouselRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<number>(0)
  const touchEndRef = useRef<number>(0)

  // Use custom hook for data fetching
  const { images: fetchedImages, loading, error } = useCarousel()
  
  // Use fetched images if available, otherwise fallback to props
  const carouselImages = fetchedImages.length > 0 ? fetchedImages : images

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || carouselImages.length <= 1) return

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, carouselImages.length, interval])

  // Pause auto-play on hover
  const handleMouseEnter = useCallback(() => {
    if (autoPlay) {
      setIsPlaying(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoPlay])

  const handleMouseLeave = useCallback(() => {
    if (autoPlay) {
      setIsPlaying(true)
    }
  }, [autoPlay])

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)
  }, [carouselImages.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % carouselImages.length)
  }, [carouselImages.length])

  // Touch/swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) return

    const distance = touchStartRef.current - touchEndRef.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }

    touchStartRef.current = 0
    touchEndRef.current = 0
  }, [goToNext, goToPrevious])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevious, goToNext])

  // Loading state
  if (loading) {
    return (
      <div className={`w-full h-64 md:h-80 lg:h-96 bg-gray-100 animate-pulse rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading carousel...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && carouselImages.length === 0) {
    return (
      <div className={`w-full h-64 md:h-80 lg:h-96 bg-gray-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <p>Unable to load carousel images</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // No images state
  if (carouselImages.length === 0) {
    return <FallbackCarousel className={className} />
  }

  return (
    <section className={`w-full ${className}`}>
      <div
        ref={carouselRef}
        className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-2xl shadow-lg"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Carousel Images */}
        <div className="relative w-full h-full">
          {carouselImages.map((image, index) => (
            <div
              key={image.id || index}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <OptimizedImage
                src={image.url}
                alt={image.alt || `Carousel image ${index + 1}`}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="100vw"
              />
              
              {/* Image overlay with title */}
              {image.title && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent">
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-semibold mb-2">
                      {image.title}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {showArrows && carouselImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow-lg"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow-lg"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Dots Indicator */}
        {showDots && carouselImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-white scale-125 shadow-lg'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Image Counter */}
        {carouselImages.length > 1 && (
          <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {carouselImages.length}
          </div>
        )}

        {/* Clickable overlay for image links */}
        {carouselImages[currentIndex]?.link && (
          <a
            href={carouselImages[currentIndex].link}
            className="absolute inset-0 z-10 cursor-pointer"
            aria-label={`Navigate to ${carouselImages[currentIndex].title || 'carousel link'}`}
          />
        )}
      </div>
    </section>
  )
} 