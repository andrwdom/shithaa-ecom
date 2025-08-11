"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import PlaceholderImage from './placeholder-image'
import { 
  ResponsiveImageUrls, 
  generateWebPSrcSet, 
  generateAVIFSrcSet, 
  getSizesAttribute,
  generateLQIP 
} from '@/lib/responsive-images'

interface ResponsiveImageProps {
  imageUrls: ResponsiveImageUrls | string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  componentType?: 'hero' | 'product-card' | 'product-detail' | 'collection-grid'
  quality?: number
  placeholder?: 'empty' | 'blur'
  onError?: () => void
  onLoad?: () => void
}

export default function ResponsiveImage({
  imageUrls,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  componentType = 'product-card',
  quality = 85,
  placeholder = 'blur',
  onError,
  onLoad
}: ResponsiveImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Handle legacy string URLs (backward compatibility)
  if (typeof imageUrls === 'string') {
    return (
      <Image
        src={imageUrls}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        className={className}
        quality={quality}
        placeholder={placeholder}
        onError={() => {
          setImageError(true)
          onError?.()
        }}
        onLoad={() => {
          setIsLoading(false)
          onLoad?.()
        }}
      />
    )
  }

  // Handle responsive image URLs
  const sizes = getSizesAttribute(componentType)
  const webpSrcSet = generateWebPSrcSet(imageUrls)
  const avifSrcSet = generateAVIFSrcSet(imageUrls)
  const blurDataURL = generateLQIP(imageUrls)

  // Skip optimization for SVG files
  if (imageUrls.original.endsWith('.svg')) {
    return (
      <Image
        src={imageUrls.original}
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
        onError={() => {
          setImageError(true)
          onError?.()
        }}
        onLoad={() => {
          setIsLoading(false)
          onLoad?.()
        }}
      />
    )
  }

  // If image failed to load, show placeholder
  if (imageError) {
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
      {/* AVIF format for modern browsers */}
      <source
        srcSet={avifSrcSet}
        type="image/avif"
        sizes={sizes}
      />
      
      {/* WebP format for browsers that support it */}
      <source
        srcSet={webpSrcSet}
        type="image/webp"
        sizes={sizes}
      />
      
      {/* Fallback for older browsers */}
      <Image
        src={imageUrls.original}
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
        onLoad={() => {
          setIsLoading(false)
          onLoad?.()
        }}
      />
    </picture>
  )
} 