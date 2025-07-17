"use client"

import type React from "react"
import { useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Flame } from "lucide-react"
import Image from "next/image"
import SizeSelectionSidebar from "./size-selection-sidebar"
import CheckoutPromptModal from "./checkout-prompt-modal"

interface Product {
  id: string
  _id: string
  name: string
  price: number
  originalPrice: number
  image: string
  category: string
  sizes?: string[]
  images?: string[]
}

interface ProductSliderProps {
  title: string
  products: Product[]
  loading: boolean
  showBestsellerBadge?: boolean
  onAddToCart?: (product: Product) => void
}

export default function ProductSlider({
  title,
  products,
  loading,
  showBestsellerBadge,
  onAddToCart,
}: ProductSliderProps) {
  const handleProductClick = (productId: string) => {
    window.location.href = `/product/${productId}`
  }

  const [sizeSelectionProduct, setSizeSelectionProduct] = useState<Product | null>(null)
  const [isSizeSelectionOpen, setIsSizeSelectionOpen] = useState(false)
  const [isCheckoutPromptOpen, setIsCheckoutPromptOpen] = useState(false)
  const [addedProduct, setAddedProduct] = useState<any>(null)

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()

    // Add sizes to product if not present
    const productWithSizes = {
      ...product,
      sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
      images: [product.image, product.image], // Add multiple images for the sidebar
    }

    setSizeSelectionProduct(productWithSizes)
    setIsSizeSelectionOpen(true)
  }

  const handleSizeSelectionAddToCart = (product: Product, size: string, quantity: number) => {
    onAddToCart?.({ ...product, _id: product._id, id: product._id })
    setAddedProduct({
      name: product.name,
      price: product.price,
      image: product.image,
      size,
      quantity,
    })
    setIsCheckoutPromptOpen(true)
  }

  const handleSizeSelectionBuyNow = (product: Product, size: string, quantity: number) => {
    // Handle buy now functionality
    const message = `Hi! I'd like to order:\n\n${product.name}\nSize: ${size}\nQuantity: ${quantity}\nPrice: ₹${product.price}\n\nPlease confirm availability and delivery details.`
    const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleCheckout = () => {
    window.location.href = "/checkout";
  }

  if (loading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center font-serif">{title}</h2>
          {/* Responsive Grid - 2 on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse border border-gray-200 rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-[2/3] bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id={title.toLowerCase().replace(" ", "-")} className="px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4 font-serif">{title}</h2>
          <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            Handpicked with love for expecting and new mothers
          </p>
        </div>

        {/* Responsive Grid Layout - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.slice(0, 4).map((product) => (
            <Card
              key={product.id}
              className="border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 cursor-pointer rounded-2xl overflow-hidden bg-white group"
              onClick={() => handleProductClick(product.id)}
            >
              <CardContent className="p-0">
                {/* Consistent aspect ratio for all screen sizes */}
                <div className="relative aspect-[2/3] bg-gray-100">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Bestseller Badge */}
                  {showBestsellerBadge && (
                    <div className="absolute top-2 left-2 lg:top-4 lg:left-4 bg-[rgb(71,60,102)] text-white px-2 py-1 lg:px-3 lg:py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                      <Flame className="h-3 w-3" />
                      <span className="hidden sm:inline">Bestseller</span>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {product.originalPrice > product.price && (
                    <div className="absolute top-2 right-2 lg:top-4 lg:right-4 bg-red-500 text-white px-2 py-1 lg:px-3 lg:py-1 rounded-full text-xs font-medium shadow-lg">
                      SAVE {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 lg:p-4 space-y-2 lg:space-y-3">
                  <h3 className="text-sm lg:text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-gray-700 transition-colors leading-tight">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-lg lg:text-xl font-bold text-gray-900">
                      ₹{product.price.toLocaleString()}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="text-xs lg:text-sm text-gray-500 line-through">
                        ₹{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-900 hover:text-white transition-all duration-300 rounded-lg text-xs lg:text-sm py-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProductClick(product.id)
                      }}
                    >
                      View Details
                    </Button>

                    <Button
                      size="sm"
                      className="bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white rounded-lg text-xs lg:text-sm py-2 px-3 lg:px-4"
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show More Button if there are more products */}
        {products.length > 4 && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="bg-white border-2 border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white rounded-full px-8 py-3"
              onClick={() => {
                // Navigate to appropriate collection page
                const categoryMap: { [key: string]: string } = {
                  "new arrivals": "maternity-feeding-wear",
                  "best sellers": "zipless-feeding-lounge-wear",
                }
                const slug = categoryMap[title.toLowerCase()] || "maternity-feeding-wear"
                window.location.href = `/collections/${slug}`
              }}
            >
              View All {title}
            </Button>
          </div>
        )}
      </div>
      <SizeSelectionSidebar
        isOpen={isSizeSelectionOpen}
        onClose={() => setIsSizeSelectionOpen(false)}
        product={sizeSelectionProduct}
        onAddToCart={handleSizeSelectionAddToCart}
        onBuyNow={handleSizeSelectionBuyNow}
      />

      <CheckoutPromptModal
        isOpen={isCheckoutPromptOpen}
        onClose={() => setIsCheckoutPromptOpen(false)}
        onViewCart={() => {
          setIsCheckoutPromptOpen(false)
          // Trigger cart sidebar if available
        }}
        onCheckout={handleCheckout}
        product={addedProduct}
      />
    </section>
  )
}
