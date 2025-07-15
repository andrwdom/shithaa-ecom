"use client"

import Image from "next/image"

export default function HeroSection() {
  const categories = [
    {
      id: 1,
      title: "Maternity Feeding Wear",
      subtitle: "Comfortable and stylish feeding wear for new mothers",
      slug: "maternity-feeding-wear",
      overlayColor: "bg-green-500/20",
      backdropColor: "backdrop-blur-md bg-green-50/90",
      image: "/blue-dress.JPG",
    },
    {
      id: 2,
      title: "Zipless Feeding Lounge Wear",
      subtitle: "Revolutionary zipless design for hassle-free feeding",
      slug: "zipless-feeding-lounge-wear",
      overlayColor: "bg-pink-500/20",
      backdropColor: "backdrop-blur-md bg-pink-50/90",
      image: "/prink-dress.JPG",
    },
    {
      id: 3,
      title: "Non-Feeding Lounge Wear",
      subtitle: "Comfortable everyday wear for expecting mothers",
      slug: "non-feeding-lounge-wear",
      overlayColor: "bg-green-500/20",
      backdropColor: "backdrop-blur-md bg-green-50/90",
      image: "/leopard-dress.jpg",
    },
  ]

  const handleCategoryClick = (slug: string) => {
    window.location.href = `/collections/${slug}`
  }

  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Main Heading */}
        <div className="text-center mb-12 lg:mb-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-6 font-serif max-w-4xl mx-auto">
            PREMIUM MATERNITY WEARS
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Because motherhood should feel <span className="text-pink-500 italic font-medium">effortless</span>.
          </p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {categories.map((category) => (
            <div
              key={category.id}
              className="relative h-80 lg:h-96 xl:h-[420px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
              onClick={() => handleCategoryClick(category.slug)}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={category.image || "/placeholder.svg"}
                  alt={category.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>

              {/* Glass Effect Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className={
                  (category.id === 1
                    ? "bg-blue-100 "
                    : category.id === 2
                    ? "bg-pink-100 "
                    : "bg-green-100 ") +
                  "rounded-xl p-4 border border-white/20 shadow-xl flex flex-col items-center justify-center min-h-[170px]"
                }>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 font-serif mb-1">
                      {category.title}
                    </h3>
                    <p className="text-gray-700 text-sm leading-normal mb-2">{category.subtitle}</p>
                      <div className="inline-flex items-center text-sm font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
                        Explore Collection
                        <svg
                          className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
