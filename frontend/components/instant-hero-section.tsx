"use client"

import React, { useState, useEffect, useCallback } from "react"
import HeroCategoryCard from "./HeroCategoryCard"
import { HERO_SECTION_CATEGORIES } from "@/lib/hero-section-images"

const InstantHeroSection = () => {
  const [isReady, setIsReady] = useState(true) // Always ready to show immediately

  const handleCategoryClick = useCallback((slug: string) => {
    window.location.href = `/collections/${slug}`
  }, [])

  // No preloading delays - show content immediately
  useEffect(() => {
    // Mark as ready immediately
    setIsReady(true)
  }, [])

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-6 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Category Cards Grid - Render immediately */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {HERO_SECTION_CATEGORIES.map((category) => (
            <HeroCategoryCard
              key={category.id}
              categoryId={category.id.toString()}
              categorySlug={category.slug}
              title={category.title}
              ctaText={category.ctaText}
              isComingSoon={category.isComingSoon}
              maxImages={4} // Reduced for better performance
              onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default InstantHeroSection
