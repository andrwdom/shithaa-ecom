"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"
import Image from "next/image"
import ResponsiveImage from "./responsive-image"
import WishlistButton from "./WishlistButton"

interface Product {
  id: number
  _id?: string // MongoDB ID for wishlist operations
  name: string
  price: number
  originalPrice: number
  image: string
  category: string
  description: string
  bestseller?: boolean
  isBestSeller?: boolean
}

interface ProductCardProps {
  product: Product
  onClick: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
            // Item added to cart silently
  }

  return (
    <Card
      className="group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative h-64 bg-gradient-to-br from-pink-50 to-purple-50 rounded-t-lg overflow-hidden">
          <ResponsiveImage
            imageUrls={product.image || "/placeholder.svg"}
            alt={`${product.name} - ${product.category}`}
            fill
            componentType="product-card"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Always visible wishlist button */}
          <div className="absolute top-3 right-3 z-10">
            <WishlistButton productId={product._id || product.id.toString()} size="sm" />
          </div>

          {/* Overlay buttons on hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <Button size="sm" className="rounded-full bg-pink-400 hover:bg-pink-500" onClick={handleQuickAdd}>
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>

          {/* Discount badge */}
          {product.originalPrice > product.price && (
            <div className="absolute top-4 left-4 bg-red-400 text-white px-2 py-1 rounded-full text-xs font-medium">
              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </div>
          )}

          {/* Bestseller badge */}
          {(product.bestseller || product.isBestSeller) && (
            <div className="absolute top-4 left-4 bg-purple-700 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
              Bestseller
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</p>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-500 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
            )}
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 group-hover:bg-pink-400 group-hover:text-white group-hover:border-pink-400 transition-all duration-300 bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
