"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

export default function CategoryCards() {
  const categories = [
    {
      id: 1,
      title: "Maternity Feeding Wear",
      description: "Comfortable & stylish feeding essentials",
      image: "/blue-dress.JPG",
      color: "from-pink-100 to-pink-200",
    },
    {
      id: 2,
      title: "Zipless Feeding Lounge Wear",
      description: "Revolutionary zipless design for easy access",
      image: "/placeholder.svg?height=300&width=400",
      color: "from-purple-100 to-purple-200",
      featured: true,
    },
    {
      id: 3,
      title: "Non-Feeding Lounge Wear",
      description: "Elegant comfort for everyday moments",
      image: "/placeholder.svg?height=300&width=400",
      color: "from-blue-100 to-blue-200",
    },
  ]

  return (
    <section id="categories" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">Shop by Category</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our carefully curated collections designed for every stage of your motherhood journey
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <Card
              key={category.id}
              className={`group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                category.featured ? "md:scale-105" : ""
              }`}
            >
              <CardContent className="p-0">
                <div className={`relative h-64 bg-gradient-to-br ${category.color} rounded-t-lg overflow-hidden`}>
                  <Image
                    src={category.image || "/placeholder.svg"}
                    alt={category.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {category.featured && (
                    <div className="absolute top-4 right-4 bg-pink-400 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Featured
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-500 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{category.description}</p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-pink-400 group-hover:text-white group-hover:border-pink-400 transition-all duration-300 bg-transparent"
                  >
                    Explore Collection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
