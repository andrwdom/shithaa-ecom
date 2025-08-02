"use client"

import React from "react"
import OptimizedImage from "./optimized-image"

const HeroSection = () => {
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

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="relative h-80 lg:h-96 xl:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
              onClick={() => !category.isComingSoon && handleCategoryClick(category.slug)}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <OptimizedImage
                  src={category.image || "/placeholder.svg"}
                  alt={`${category.title} - ${category.subtitle}`}
                  fill
                  priority={index < 2} // Load first 2 images with priority
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

              {/* Glass Effect Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className={
                  (category.id === 1
                    ? "bg-blue-100/50 backdrop-blur-sm "
                    : category.id === 2
                    ? "bg-pink-100/50 backdrop-blur-sm "
                    : category.id === 3
                    ? "bg-green-100/50 backdrop-blur-sm "
                    : category.id === 4
                    ? "bg-yellow-100/50 backdrop-blur-sm "
                    : "bg-gray-100/50 backdrop-blur-sm ") +
                  "rounded-xl p-5 border border-white/20 shadow-xl flex flex-col h-[180px]"
                }>
                  <div className="text-center flex-1 flex flex-col justify-center space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 font-serif line-clamp-2">
                      {category.title}
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-2 px-1">
                      {category.subtitle}
                    </p>
                  </div>
                  <div className="text-center pt-3 border-t border-white/20">
                    <div className="inline-flex items-center text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
                      {category.ctaText}
                      {!category.isComingSoon && (
                        <svg
                          className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"
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

              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-white/30 transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroSection
