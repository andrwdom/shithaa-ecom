"use client"

import React from "react"
import HeroCategoryCard from "./HeroCategoryCard"
import { HERO_SECTION_CATEGORIES } from "@/lib/hero-section-images"
import DebugHeroImages from "./debug-hero-images"

const HeroSection = () => {
  const handleCategoryClick = (slug: string) => {
    window.location.href = `/collections/${slug}`
  }

  return (
    <section className="spacing-section bg-white">
      <div className="container-responsive">
        <div className="text-center spacing-component">
          <h1 className="text-responsive-3xl font-bold text-gray-900 leading-tight mb-4 lg:mb-6 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-responsive-base text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Category Cards */}
        <div className="grid-responsive max-w-7xl mx-auto">
          {HERO_SECTION_CATEGORIES.map((category) => (
            <HeroCategoryCard
              key={category.id}
              categoryId={category.id.toString()}
              categorySlug={category.slug}
              title={category.title}
              ctaText={category.ctaText}
              isComingSoon={category.isComingSoon}
              maxImages={6} // Allow up to 6 images per category
              onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
            />
          ))}
        </div>
      </div>
      
      {/* Debug component for development */}
      {process.env.NODE_ENV === 'development' && (
        <DebugHeroImages categorySlug="maternity-feeding-wear" />
      )}
    </section>
  )
}

export default HeroSection
