"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingBag } from "lucide-react"
import Image from "next/image"

interface Product {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  category: string
  description: string
}

interface ProductCarouselProps {
  title: string
  products: Product[]
  loading: boolean
  onProductClick: (product: Product) => void
}

export default function ProductCarousel({ title, products, loading, onProductClick }: ProductCarouselProps) {
  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 font-serif">{title}</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-none w-80">
                <Card className="animate-pulse">
                  <CardContent className="p-0">
                    <div className="h-64 bg-gray-200 rounded-t-lg" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-6 bg-gray-200 rounded w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id={title.toLowerCase().replace(" ", "-")} className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">{title}</h2>
          <p className="text-lg text-gray-600">Handpicked favorites loved by mothers everywhere</p>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {products.map((product) => (
            <Card
              key={product.id}
              className="flex-none w-80 group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
              onClick={() => onProductClick(product)}
            >
              <CardContent className="p-0">
                <div className="relative h-64 bg-gradient-to-br from-pink-50 to-purple-50 rounded-t-lg overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />

                  {/* Overlay buttons */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <Button size="sm" variant="secondary" className="rounded-full">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="rounded-full bg-pink-400 hover:bg-pink-500">
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Discount badge */}
                  {product.originalPrice > product.price && (
                    <div className="absolute top-4 left-4 bg-red-400 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</p>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-500 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through">
                        ₹{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
