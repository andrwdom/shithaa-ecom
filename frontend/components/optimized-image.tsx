"use client"

import React, { useState } from 'react'
import Image from 'next/image'

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
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
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
  blurDataURL
}: OptimizedImageProps) {
  const [webpError, setWebpError] = useState(false)

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
      />
    )
  }

  // For non-SVG images, check if WebP version exists
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shithaa.in'
  const fullSrc = src.startsWith('http') ? src : `${baseUrl}${src}`
  
  // Generate WebP version URL
  const webpSrc = fullSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  
  // If WebP failed to load or doesn't exist, just use the original image
  if (webpError) {
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
        loading={priority ? 'eager' : 'lazy'}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    )
  }
  
  return (
    <picture className={className}>
      {/* WebP format for modern browsers */}
      <source
        srcSet={webpSrc}
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
      />
    </picture>
  )
} 