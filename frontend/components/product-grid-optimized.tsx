"use client"

import React from 'react'
import ProductCardOptimized from './product-card-optimized'

interface Product {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  category: string
  description: string
  bestseller?: boolean
  isBestSeller?: boolean
}

interface ProductGridOptimizedProps {
  products: Product[]
  title?: string
  subtitle?: string
  loading?: boolean
  onProductClick?: (product: Product) => void
  className?: string
}

export default function ProductGridOptimized({
  products,
  title,
  subtitle,
  loading = false,
  onProductClick,
  className = ''
}: ProductGridOptimizedProps) {
  
  const handleProductClick = (product: Product) => {
    onProductClick?.(product)
  }

  if (loading) {
    return (
      <section className={`py-8 lg:py-12 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {title && (
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 font-serif">
                {title}
              </h2>
              {subtitle && (
                <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          
          {/* Loading skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`py-8 lg:py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 font-serif">
              {title}
            </h2>
            {subtitle && (
              <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Optimized Product Grid - Responsive Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product, index) => (
            <ProductCardOptimized
              key={product.id}
              product={product}
              index={index}
              onClick={() => handleProductClick(product)}
            />
          ))}
        </div>

        {/* Empty state */}
        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </section>
  )
} 