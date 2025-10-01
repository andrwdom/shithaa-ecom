"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import HeroCategoryCard from "./HeroCategoryCard"
import OptimizedImagePreloader from "./optimized-image-preloader"
import { HERO_SECTION_CATEGORIES } from "@/lib/hero-section-images"

const EnhancedHeroSection = () => {
  const [allImages, setAllImages] = useState<string[]>([])
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [isReady, setIsReady] = useState(true) // Always ready to show immediately

  const handleCategoryClick = useCallback((slug: string) => {
    window.location.href = `/collections/${slug}`
  }, [])

  // Light preloading - only fetch first category images for mobile performance
  useEffect(() => {
    const lightPreload = async () => {
      try {
        setIsPreloading(true)
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        // Only preload first category for initial performance
        const firstCategory = HERO_SECTION_CATEGORIES[0]
        
        if (firstCategory) {
          try {
            const url = new URL(`${baseUrl}/api/hero-images`)
            url.searchParams.append('categoryId', firstCategory.slug)
            url.searchParams.append('device', 'mobile')
            url.searchParams.append('limit', '3') // Reduced for mobile

            const response = await fetch(url.toString(), {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'max-age=300'
              }
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.images) {
                const imageUrls = data.images.map((img: any) => img.thumbUrl).filter(Boolean)
                setAllImages(imageUrls.slice(0, 3)) // Only first 3 images
                setPreloadProgress(1)
              }
            }
          } catch (error) {
            console.warn(`Failed to preload images for ${firstCategory.slug}:`, error)
          }
        }
      } catch (error) {
        console.error('Error in light preload:', error)
      } finally {
        setIsPreloading(false)
      }
    }

    // Start light preload after UI is ready - prioritize rendering
    const timer = setTimeout(lightPreload, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleImagesLoaded = useCallback((loadedImages: Set<string>) => {
    console.log(`Preloaded ${loadedImages.size} hero images successfully`)
  }, [])

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      {/* Image Preloader - Hidden but functional */}
      <OptimizedImagePreloader
        images={allImages}
        onImagesLoaded={handleImagesLoaded}
        priority={true}
      />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-6 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Category Cards Grid - Render immediately without animation delays */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {HERO_SECTION_CATEGORIES.map((category) => (
            <HeroCategoryCard
              key={category.id}
              categoryId={category.id.toString()}
              categorySlug={category.slug}
              title={category.title}
              ctaText={category.ctaText}
              isComingSoon={category.isComingSoon}
              maxImages={6}
              onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default EnhancedHeroSection 