"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { HeroImage } from '@/lib/hero-section-images'

interface EnhancedHeroImageProps {
  image: HeroImage
  priority?: boolean
  sizes?: string
  className?: string
  onLoad?: () => void
  onError?: () => void
  fallbackDelay?: number
}

export const EnhancedHeroImage: React.FC<EnhancedHeroImageProps> = React.memo(({
  image,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw',
  className = '',
  onLoad,
  onError,
  fallbackDelay = 2000
}) => {
  const [currentSrc, setCurrentSrc] = useState(image.src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle image load success
  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    setShowFallback(false)
    onLoad?.()
  }, [onLoad])

  // Handle image load error
  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    
    // Show fallback after a delay to prevent flickering
    fallbackTimeoutRef.current = setTimeout(() => {
      setShowFallback(true)
    }, fallbackDelay)
    
    onError?.()
  }, [fallbackDelay, onError])

  // Reset state when image changes
  useEffect(() => {
    setCurrentSrc(image.src)
    setIsLoading(true)
    setHasError(false)
    setShowFallback(false)
    
    // Clear any existing fallback timeout
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
    }
  }, [image.src])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
      }
    }
  }, [])

  // If showing fallback, render the fallback image
  if (showFallback) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <Image
          src={image.fallbackSrc}
          alt={`${image.alt} - Fallback`}
          fill
          className="object-cover"
          sizes={sizes}
          priority={false}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium">{image.productName}</div>
            <div className="text-xs">Image Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium">Loading...</div>
          </div>
        </div>
      )}

      {/* Main image */}
      <Image
        ref={imageRef}
        src={currentSrc}
        alt={image.alt}
        fill
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        sizes={sizes}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Error overlay */}
      {hasError && !showFallback && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
          <div className="text-center text-red-500">
            <div className="text-sm font-medium">Image Error</div>
            <div className="text-xs">Loading fallback...</div>
          </div>
        </div>
      )}
    </div>
  )
})

EnhancedHeroImage.displayName = 'EnhancedHeroImage' 