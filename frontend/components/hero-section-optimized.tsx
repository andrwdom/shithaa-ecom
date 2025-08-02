"use client"

import React from "react"
import OptimizedImage from "./optimized-image"

const HeroSectionOptimized = () => {
  const categories = [
    {
      id: 1,
      title: "Maternity Feeding Wear",
      subtitle: "Comfortable and stylish feeding wear for new mothers",
      slug: "maternity-feeding-wear",
      image: "/blue-dress.JPG",
      ctaText: "See Styles",
      isComingSoon: false,
    },
    {
      id: 2,
      title: "Zipless Feeding Lounge Wear",
      subtitle: "Revolutionary zipless design for hassle-free feeding",
      slug: "zipless-feeding-lounge-wear",
      image: "/prink-dress.JPG",
      ctaText: "View Drop",
      isComingSoon: false,
    },
    {
      id: 3,
      title: "Non-Feeding Lounge Wear",
      subtitle: "Comfortable everyday wear for expecting mothers",
      slug: "non-feeding-lounge-wear",
      image: "/leopard-dress.jpg",
      ctaText: "Unveil Now",
      isComingSoon: false,
    },
    {
      id: 4,
      title: "Zipless Feeding Dupatta Lounge Wear",
      subtitle: "Zipless design with attached dupatta for more comfort",
      slug: "zipless-feeding-dupatta-lounge-wear",
      image: "/placeholder.svg?height=400&width=300",
      ctaText: "Coming Soon",
      isComingSoon: true,
    },
  ]

  const handleCategoryClick = (slug: string) => {
    window.location.href = `/collections/${slug}`
  }

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight mb-3 lg:mb-4 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Optimized Category Cards - Better Mobile Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-7xl mx-auto">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 cursor-pointer"
              onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
            >
              {/* Optimized Image Container - Better Mobile Aspect Ratio */}
              <div className="relative w-full">
                {/* Mobile: Taller aspect ratio for better clothing visibility */}
                <div className="aspect-[3/4] sm:aspect-[2/3] lg:aspect-[3/4] xl:aspect-[2/3]">
                  <OptimizedImage
                    src={category.image || "/placeholder.svg"}
                    alt={`${category.title} - ${category.subtitle}`}
                    fill
                    priority={index < 2} // Load first 2 images with priority
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    quality={85}
                  />
                </div>

                {/* Gradient Overlay - Improved for Mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                {/* Content Overlay - Responsive Typography */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-5">
                  <div className={
                    (category.id === 1
                      ? "bg-blue-100/90 backdrop-blur-sm "
                      : category.id === 2
                      ? "bg-pink-100/90 backdrop-blur-sm "
                      : category.id === 3
                      ? "bg-green-100/90 backdrop-blur-sm "
                      : category.id === 4
                      ? "bg-yellow-100/90 backdrop-blur-sm "
                      : "bg-gray-100/90 backdrop-blur-sm ") +
                    "rounded-xl p-3 sm:p-4 border border-white/30 shadow-lg"
                  }>
                    <div className="text-center space-y-2 sm:space-y-3">
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 font-serif line-clamp-2 leading-tight">
                        {category.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-2 px-1">
                        {category.subtitle}
                      </p>
                    </div>
                    <div className="text-center pt-2 sm:pt-3 border-t border-white/30 mt-2 sm:mt-3">
                      <div className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
                        {category.ctaText}
                        {!category.isComingSoon && (
                          <svg
                            className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroSectionOptimized 