"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import OptimizedImage from './optimized-image'

interface FallbackCarouselProps {
  className?: string
}

export default function FallbackCarousel({ className = '' }: FallbackCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<number>(0)
  const touchEndRef = useRef<number>(0)

  // Fallback images for when no carousel images are available
  const fallbackImages = [
    {
      id: 'fallback-1',
      url: '/blue-dress.JPG',
      alt: 'Maternity Feeding Wear Collection',
      title: 'New Maternity Collection',
      subtitle: 'Comfortable and stylish feeding wear',
      link: '/collections/maternity-feeding-wear'
    },
    {
      id: 'fallback-2', 
      url: '/prink-dress.JPG',
      alt: 'Zipless Feeding Lounge Wear',
      title: 'Revolutionary Zipless Design',
      subtitle: 'Hassle-free feeding experience',
      link: '/collections/zipless-feeding-lounge-wear'
    },
    {
      id: 'fallback-3',
      url: '/leopard-dress.jpg', 
      alt: 'Non-Feeding Lounge Wear',
      title: 'Comfortable Everyday Wear',
      subtitle: 'Perfect for expecting mothers',
      link: '/collections/non-feeding-lounge-wear'
    }
  ]

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % fallbackImages.length)
    }, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, fallbackImages.length])

  // Pause auto-play on hover
  const handleMouseEnter = useCallback(() => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPlaying(true)
  }, [])

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + fallbackImages.length) % fallbackImages.length)
  }, [fallbackImages.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % fallbackImages.length)
  }, [fallbackImages.length])

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

  return (
    <div 
      className={`w-full h-64 md:h-80 lg:h-96 relative overflow-hidden rounded-2xl shadow-lg ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fallback Carousel Images */}
      <div className="relative w-full h-full">
        {fallbackImages.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <OptimizedImage
              src={image.url}
              alt={image.alt}
              fill
              priority={index === 0}
              className="object-cover"
              sizes="100vw"
            />
            
            {/* Overlay with title and CTA */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-lg md:text-xl lg:text-2xl font-semibold mb-2">
                  {image.title}
                </h3>
                <p className="text-sm md:text-base mb-4 opacity-90">
                  {image.subtitle}
                </p>
                <a
                  href={image.link}
                  className="inline-block bg-white text-gray-900 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
                >
                  Shop Now
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
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

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {fallbackImages.map((_, index) => (
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

      {/* Image Counter */}
      <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        {currentIndex + 1} / {fallbackImages.length}
      </div>
    </div>
  )
} 