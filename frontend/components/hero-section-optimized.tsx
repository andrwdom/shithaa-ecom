"use client"

import React, { useMemo, useCallback } from "react"
import { OptimizedCategoryCard } from "./optimized-category-card"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"

interface Category {
  id: number
  title: string
  slug: string
  image: string
  ctaText: string
  isComingSoon: boolean
}

const HeroSectionOptimized = () => {
  const categories: Category[] = useMemo(() => [
    {
      id: 1,
      title: "Maternity Feeding Wear",
      slug: "maternity-feeding-wear",
      image: "/blue-dress.JPG",
      ctaText: "See Styles",
      isComingSoon: false,
    },
    {
      id: 2,
      title: "Zipless Feeding Lounge Wear",
      slug: "zipless-feeding-lounge-wear",
      image: "/prink-dress.JPG",
      ctaText: "View Drop",
      isComingSoon: false,
    },
    {
      id: 3,
      title: "Non-Feeding Lounge Wear",
      slug: "non-feeding-lounge-wear",
      image: "/leopard-dress.jpg",
      ctaText: "Unveil Now",
      isComingSoon: false,
    },
    {
      id: 4,
      title: "Zipless Feeding Dupatta Lounge Wear",
      slug: "zipless-feeding-dupatta-lounge-wear",
      image: "/placeholder.svg?height=400&width=300",
      ctaText: "Check Out",
      isComingSoon: false,
    },
  ], [])

  const handleCategoryClick = useCallback((slug: string) => {
    window.location.href = `/collections/${slug}`
  }, [])

  // Preload critical images for better performance
  React.useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = categories.slice(0, 2).map((category) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = category.image
        })
      })
      
      // Wait for first 2 images to load
      await Promise.all(imagePromises)
    }
    
    preloadImages()
  }, [categories])

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 lg:mb-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-6 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Optimized Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {categories.map((category, index) => (
            <OptimizedCategoryCard
              key={category.id}
              category={category}
              index={index}
              onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroSectionOptimized 