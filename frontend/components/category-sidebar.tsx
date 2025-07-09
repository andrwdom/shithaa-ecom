"use client"

import { X, Baby, Heart, Shirt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

interface CategorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onCategorySelect: (slug: string) => void
  currentCategory?: string
}

export default function CategorySidebar({ isOpen, onClose, onCategorySelect, currentCategory }: CategorySidebarProps) {
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const categories = [
    {
      icon: Baby,
      title: "Maternity Feeding Wear",
      slug: "maternity-feeding-wear",
      description: "Comfortable feeding essentials",
      // Use blue pastel colors from hero section
      bgColor: "bg-blue-50/80",
      hoverBgColor: "hover:bg-blue-100/80",
      borderColor: "border-blue-100",
      hoverBorderColor: "hover:border-blue-300",
      iconBgColor: "bg-blue-100",
      activeIconBgColor: "bg-blue-500",
    },
    {
      icon: Heart,
      title: "Zipless Feeding Lounge Wear",
      slug: "zipless-feeding-lounge-wear",
      description: "Revolutionary zipless design",
      // Use pink pastel colors from hero section
      bgColor: "bg-pink-50/80",
      hoverBgColor: "hover:bg-pink-100/80",
      borderColor: "border-pink-100",
      hoverBorderColor: "hover:border-pink-300",
      iconBgColor: "bg-pink-100",
      activeIconBgColor: "bg-pink-500",
    },
    {
      icon: Shirt,
      title: "Non-Feeding Lounge Wear",
      slug: "non-feeding-lounge-wear",
      description: "Elegant everyday comfort",
      // Use green pastel colors from hero section
      bgColor: "bg-green-50/80",
      hoverBgColor: "hover:bg-green-100/80",
      borderColor: "border-green-100",
      hoverBorderColor: "hover:border-green-300",
      iconBgColor: "bg-green-100",
      activeIconBgColor: "bg-green-500",
    },
  ]

  const handleCategorySelect = (slug: string) => {
    onCategorySelect(slug)

    // Auto-close sidebar on mobile after selection
    if (isMobile) {
      setTimeout(() => {
        onClose()
      }, 300) // Small delay for smooth transition
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[rgb(71,60,102)] font-serif">Categories</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Categories List */}
          <div className="space-y-4">
            {categories.map((category) => {
              const Icon = category.icon
              const isActive = currentCategory === category.slug

              return (
                <button
                  key={category.slug}
                  onClick={() => handleCategorySelect(category.slug)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
                    isActive
                      ? `${category.borderColor} ${category.activeIconBgColor.replace("bg-", "bg-").replace("-500", "-50")} border-opacity-60`
                      : `${category.bgColor} ${category.hoverBgColor} ${category.borderColor} ${category.hoverBorderColor} border-opacity-40`
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-xl ${isActive ? category.activeIconBgColor : category.iconBgColor} transition-all duration-300`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-base mb-1 ${isActive ? "text-gray-900" : "text-gray-800"}`}>
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* More Categories Coming Soon */}
          <div className="mt-8 p-6 bg-gradient-to-br from-purple-50/60 to-pink-50/60 rounded-2xl border-2 border-purple-100/40 text-center">
            
            <h3 className="font-bold text-gray-900 mb-2 font-serif">More Categories Coming Soon!</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              We're working on exciting new collections to make your motherhood journey even more beautiful.
            </p>
            <div className="mt-4 text-xs text-gray-500">Stay tuned for updates 💕</div>
          </div>

          {/* Mobile-specific close hint */}
          {isMobile && (
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-600 text-center">Tap a category to browse products</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
