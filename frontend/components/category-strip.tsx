"use client"

import { Button } from "@/components/ui/button"
import { Baby, Heart, Shirt } from "lucide-react"

interface CategoryStripProps {
  onCategoryClick?: (slug: string) => void
  currentCategory?: string
}

export default function CategoryStrip({ onCategoryClick, currentCategory }: CategoryStripProps) {
  const categories = [
    {
      icon: Baby,
      title: "Feeding Wear",
      slug: "maternity-feeding-wear",
      bgColor: "bg-blue-50",
      hoverBgColor: "hover:bg-blue-100",
      borderColor: "border-blue-200",
      hoverBorderColor: "hover:border-blue-400",
      textColor: "text-blue-700",
      hoverTextColor: "hover:text-blue-800",
    },
    {
      icon: Heart,
      title: "Zipless Lounge",
      slug: "zipless-feeding-lounge-wear",
      bgColor: "bg-pink-50",
      hoverBgColor: "hover:bg-pink-100",
      borderColor: "border-pink-200",
      hoverBorderColor: "hover:border-pink-400",
      textColor: "text-pink-700",
      hoverTextColor: "hover:text-pink-800",
    },
    {
      icon: Shirt,
      title: "Casual Wear",
      slug: "non-feeding-lounge-wear",
      bgColor: "bg-green-50",
      hoverBgColor: "hover:bg-green-100",
      borderColor: "border-green-200",
      hoverBorderColor: "hover:border-green-400",
      textColor: "text-green-700",
      hoverTextColor: "hover:text-green-800",
    },
  ]

  const handleCategoryClick = (slug: string) => {
    // Navigate directly to collection page
    window.location.href = `/collections/${slug}`
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 lg:mb-4 font-serif">
            Shop by Category
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">Find exactly what you need for your journey</p>
        </div>

        {/* Horizontal Layout for All Screen Sizes */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 xl:gap-6 justify-center items-center max-w-4xl mx-auto">
          {categories.map((category, index) => {
            const isActive = currentCategory === category.slug

            return (
              <Button
                key={index}
                variant="outline"
                className={`w-full sm:w-auto flex items-center justify-center gap-2 lg:gap-3 px-6 lg:px-8 py-4 lg:py-6 rounded-full border-2 transition-all duration-300 font-medium text-sm lg:text-base transform hover:scale-105 hover:shadow-lg ${
                  isActive
                    ? `${category.bgColor.replace("bg-", "bg-").replace("-50", "-100")} ${category.borderColor.replace("border-", "border-").replace("-200", "-400")} ${category.textColor}`
                    : `${category.bgColor} ${category.hoverBgColor} ${category.borderColor} ${category.hoverBorderColor} ${category.textColor} ${category.hoverTextColor}`
                }`}
                onClick={() => onCategoryClick ? onCategoryClick(category.slug) : handleCategoryClick(category.slug)}
              >
                <category.icon className="h-5 w-5" />
                {category.title}
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
