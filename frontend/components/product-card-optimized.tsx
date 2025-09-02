"use client"

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"
import OptimizedImage from "./optimized-image"
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

interface ProductCardOptimizedProps {
  product: Product
  onClick: () => void
  index?: number
}

export default function ProductCardOptimized({ product, onClick, index = 0 }: ProductCardOptimizedProps) {
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Add quick add functionality
  }

  return (
    <Card
      className="group cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Optimized Image Container - Ideal Fashion Aspect Ratio */}
        <div className="relative w-full bg-gray-50">
          {/* Fashion-optimized aspect ratio: 3:4 for clothing visibility */}
          <div className="aspect-responsive">
            <OptimizedImage
              src={product.image || "/placeholder.svg"}
              alt={`${product.name} - ${product.category}`}
              fill
              loading={index < 4 ? "eager" : "lazy"} // Load first 4 images eagerly
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              quality={85}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAAcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          </div>

          {/* Always visible wishlist button */}
          <div className="absolute top-3 right-3 z-10">
            <WishlistButton productId={product._id || product.id.toString()} size="sm" />
          </div>

          {/* Overlay buttons - Responsive positioning */}
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 sm:gap-3">
            <Button 
              size="sm" 
              className="rounded-full bg-pink-500 hover:bg-pink-600 shadow-lg" 
              onClick={handleQuickAdd}
            >
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Discount badge - Responsive sizing */}
          {product.originalPrice > product.price && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </div>
          )}

          {/* Bestseller badge - Responsive positioning */}
          {(product.bestseller || product.isBestSeller) && (
            <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              </svg>
              <span className="hidden sm:inline">Bestseller</span>
            </div>
          )}
        </div>

        {/* Product Info - Responsive typography */}
        <div className="card-responsive space-y-2 sm:space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {product.category}
            </p>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-pink-500 transition-colors line-clamp-2 leading-tight mt-1">
              {product.name}
            </h3>
          </div>

          {/* Price - Responsive layout */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-gray-900">
              ₹{product.price.toLocaleString()}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                ₹{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Description - Responsive text */}
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* CTA Button - Responsive sizing */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 sm:mt-3 group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-500 transition-all duration-300 bg-transparent text-sm"
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