"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import HeroCategoryCard from "./HeroCategoryCard"
import OptimizedImagePreloader from "./optimized-image-preloader"
import { HERO_SECTION_CATEGORIES } from "@/lib/hero-section-images"

const EnhancedHeroSection = () => {
  const [allImages, setAllImages] = useState<string[]>([])
  const [isPreloading, setIsPreloading] = useState(true)
  const [preloadProgress, setPreloadProgress] = useState(0)

  const handleCategoryClick = useCallback((slug: string) => {
    window.location.href = `/collections/${slug}`
  }, [])

  // Preload all hero images for better performance
  useEffect(() => {
    const preloadAllHeroImages = async () => {
      try {
        setIsPreloading(true)
        setPreloadProgress(0)

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const imagePromises = HERO_SECTION_CATEGORIES.map(async (category, index) => {
          try {
            const url = new URL(`${baseUrl}/api/hero-images`)
            url.searchParams.append('categoryId', category.slug)
            url.searchParams.append('device', 'desktop')
            url.searchParams.append('limit', '6')

            const response = await fetch(url.toString(), {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              }
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.images) {
                const imageUrls = data.images.map((img: any) => img.thumbUrl).filter(Boolean)
                setPreloadProgress((index + 1) / HERO_SECTION_CATEGORIES.length)
                return imageUrls
              }
            }
            return []
          } catch (error) {
            console.warn(`Failed to preload images for ${category.slug}:`, error)
            return []
          }
        })

        const allImageArrays = await Promise.allSettled(imagePromises)
        const flatImages = allImageArrays
          .filter((result): result is PromiseFulfilledResult<string[]> => result.status === 'fulfilled')
          .flatMap(result => result.value)
          .filter(Boolean)

        setAllImages(flatImages)
        setPreloadProgress(1)
      } catch (error) {
        console.error('Error preloading hero images:', error)
      } finally {
        setIsPreloading(false)
      }
    }

    preloadAllHeroImages()
  }, [])

  const handleImagesLoaded = useCallback((loadedImages: Set<string>) => {
    console.log(`Preloaded ${loadedImages.size} hero images successfully`)
  }, [])

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      {/* Image Preloader - Hidden but functional */}
      <OptimizedImagePreloader
        images={allImages}
        onImagesLoaded={handleImagesLoaded}
        priority={true}
      />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 lg:mb-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-6 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Loading Indicator */}
        {isPreloading && (
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-md">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${preloadProgress * 100}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                Loading beautiful images... {Math.round(preloadProgress * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* Optimized Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {HERO_SECTION_CATEGORIES.map((category, index) => (
            <div
              key={category.id}
              className={`transition-all duration-700 ease-out ${
                isPreloading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <HeroCategoryCard
                categoryId={category.id.toString()}
                categorySlug={category.slug}
                title={category.title}
                ctaText={category.ctaText}
                isComingSoon={category.isComingSoon}
                maxImages={6}
                onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default EnhancedHeroSection 