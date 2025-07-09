"use client"

import { Button } from "@/components/ui/button"
import { Baby, Heart, Shirt } from "lucide-react"

export default function CategoryReminder() {
  const categories = [
    {
      icon: Baby,
      title: "Feeding Wear",
      description: "Easy access designs",
      color: "from-pink-400 to-pink-500",
    },
    {
      icon: Heart,
      title: "Zipless Lounge",
      description: "Revolutionary comfort",
      color: "from-purple-400 to-purple-500",
    },
    {
      icon: Shirt,
      title: "Casual Wear",
      description: "Everyday elegance",
      color: "from-blue-400 to-blue-500",
    },
  ]

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-pink-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">Find Your Perfect Fit</h2>
          <p className="text-lg text-gray-600">Every piece designed with love for your comfort</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <div key={index} className="text-center group cursor-pointer">
                <div
                  className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-pink-500 transition-colors">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="group-hover:bg-pink-400 group-hover:text-white group-hover:border-pink-400 transition-all duration-300 bg-transparent"
                >
                  Shop Now
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
