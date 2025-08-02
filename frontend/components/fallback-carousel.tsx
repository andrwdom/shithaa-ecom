"use client"

import React from 'react'
import OptimizedImage from './optimized-image'

interface FallbackCarouselProps {
  className?: string
}

export default function FallbackCarousel({ className = '' }: FallbackCarouselProps) {
  // Fallback images for when no carousel images are available
  const fallbackImages = [
    {
      id: 'fallback-1',
      url: '/blue-dress.JPG',
      alt: 'Maternity Feeding Wear Collection',
      title: 'New Maternity Collection',
      link: '/collections/maternity-feeding-wear'
    },
    {
      id: 'fallback-2', 
      url: '/prink-dress.JPG',
      alt: 'Zipless Feeding Lounge Wear',
      title: 'Revolutionary Zipless Design',
      link: '/collections/zipless-feeding-lounge-wear'
    },
    {
      id: 'fallback-3',
      url: '/leopard-dress.jpg', 
      alt: 'Non-Feeding Lounge Wear',
      title: 'Comfortable Everyday Wear',
      link: '/collections/non-feeding-lounge-wear'
    }
  ]

  return (
    <div className={`w-full h-64 md:h-80 lg:h-96 relative overflow-hidden rounded-2xl shadow-lg ${className}`}>
      <OptimizedImage
        src={fallbackImages[0].url}
        alt={fallbackImages[0].alt}
        fill
        priority={true}
        className="object-cover"
        sizes="100vw"
      />
      
      {/* Overlay with title and CTA */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h3 className="text-lg md:text-xl lg:text-2xl font-semibold mb-2">
            {fallbackImages[0].title}
          </h3>
          <p className="text-sm md:text-base mb-4 opacity-90">
            Discover our latest collection designed for comfort and style
          </p>
          <a
            href={fallbackImages[0].link}
            className="inline-block bg-white text-gray-900 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
          >
            Shop Now
          </a>
        </div>
      </div>
    </div>
  )
} 