"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Heart, Share2, Truck, Shield, RotateCcw, Plus, Minus } from "lucide-react"
import Image from "next/image"

interface Product {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  images: string[]
  category: string
  description: string
  sizes: string[]
  stock: number
}

interface ProductPageProps {
  product: Product
  onBack: () => void
}

export default function ProductPage({ product, onBack }: ProductPageProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)

  // Stock status logic
  // (removed all stock status display)

  const handleBuyNow = () => {
    // Stub for buy now functionality
    alert(`Added ${quantity} x ${product.name} (Size: ${selectedSize}) to cart!`)
  }

  const handleAddToWishlist = () => {
    // Stub for wishlist functionality
    alert("Added to wishlist!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 truncate">{product.name}</h1>
            <div className="ml-auto flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleAddToWishlist}>
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative h-96 lg:h-[500px] bg-white rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
              {product.originalPrice > product.price && (
                <div className="absolute top-4 left-4 bg-red-400 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="flex gap-3 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-none w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index ? "border-pink-400" : "border-gray-200"
                  }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${product.name} ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{product.category}</p>
              <h1 className="text-3xl font-bold text-gray-900 mb-4 font-serif">{product.name}</h1>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                {product.originalPrice > product.price && (
                  <span className="text-xl text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                )}
                <span className={`ml-4 text-base font-semibold ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-yellow-600' : 'text-green-600'}`}></span>
              </div>

              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Size Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Select Size</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose your size" />
                </SelectTrigger>
                <SelectContent>
                  {product.sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleBuyNow}
                disabled={!selectedSize || stock === 0}
                size="lg"
                className="w-full bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Buy Now
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" className="py-6 bg-transparent" disabled={stock === 0}>
                  Add to Cart
                </Button>
                <Button variant="outline" size="lg" className="py-6 bg-transparent" onClick={handleAddToWishlist}>
                  <Heart className="h-4 w-4 mr-2" />
                  Wishlist
                </Button>
              </div>
            </div>

            {/* Delivery Info */}
            <Card className="border-0 bg-gradient-to-r from-pink-50 to-purple-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-pink-400" />
                    <span className="text-sm font-medium">Delivery in 3-5 Days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium">Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RotateCcw className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-medium">7-Day Easy Return</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
