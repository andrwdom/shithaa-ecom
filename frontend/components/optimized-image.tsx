"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import PlaceholderImage from './placeholder-image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  sizes?: string
  quality?: number
  placeholder?: 'empty' | 'blur'
  blurDataURL?: string
  onError?: () => void
  onLoad?: () => void
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  sizes = '100vw',
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onError,
  onLoad
}: OptimizedImageProps) {
  const [webpError, setWebpError] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [fallbackSrc, setFallbackSrc] = useState<string>('')

  // Generate fallback image URL
  useEffect(() => {
    if (src && !src.startsWith('data:')) {
      // Try to create a fallback URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shithaa.in'
      const fullSrc = src.startsWith('http') ? src : `${baseUrl}${src}`
      
      // If it's a hero thumbnail, try the original image path
      if (src.includes('/uploads/hero-thumbs/')) {
        const originalPath = src.replace('/uploads/hero-thumbs/', '/uploads/')
        setFallbackSrc(originalPath)
      } else {
        setFallbackSrc(fullSrc)
      }
    }
  }, [src])

  // Skip optimization for SVG files
  if (src.endsWith('.svg')) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        className={className}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        style={{ maxWidth: '100%', height: 'auto' }}
        onError={onError}
        onLoad={onLoad}
      />
    )
  }

  // If WebP failed to load or doesn't exist, just use the original image
  if (webpError || imageError) {
    // If we have a fallback source, try it
    if (fallbackSrc && fallbackSrc !== src) {
      return (
        <Image
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          priority={priority}
          className={className}
          sizes={sizes}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          loading={priority ? 'eager' : 'lazy'}
          style={{ maxWidth: '100%', height: 'auto' }}
          onError={() => {
            // If fallback also fails, show placeholder
            setImageError(true)
            onError?.()
          }}
          onLoad={onLoad}
        />
      )
    }
    
    // If no fallback or fallback failed, show placeholder
    if (fill) {
      return (
        <PlaceholderImage
          className={className}
          text="Image Unavailable"
          bgColor="#f9fafb"
          textColor="#6b7280"
        />
      )
    }
    
    return (
      <PlaceholderImage
        width={width}
        height={height}
        className={className}
        text="Image Unavailable"
        bgColor="#f9fafb"
        textColor="#6b7280"
      />
    )
  }
  
  return (
    <picture className={className}>
      {/* WebP format for modern browsers */}
      <source
        srcSet={src}
        type="image/webp"
        sizes={sizes}
        onError={() => setWebpError(true)}
      />
      {/* Fallback for older browsers */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        className={className}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        loading={priority ? 'eager' : 'lazy'}
        style={{ maxWidth: '100%', height: 'auto' }}
        onError={() => {
          setImageError(true)
          onError?.()
        }}
        onLoad={onLoad}
      />
    </picture>
  )
} 