"use client"

import { useState } from "react"
import { X, Plus, Minus, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Product {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  images?: string[]
  category: string
  description: string
  sizes: { size: string; stock: number }[]
  availableSizes?: string[]
}

interface SizeSelectionSidebarProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onAddToCart: (product: Product, size: string, quantity: number, stock: number) => void
  onBuyNow: (product: Product, size: string, quantity: number) => void
}

export default function SizeSelectionSidebar({
  isOpen,
  onClose,
  product,
  onAddToCart,
  onBuyNow,
}: SizeSelectionSidebarProps) {
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)

  // Reset state when sidebar opens
  useState(() => {
    if (isOpen) {
      setSelectedSize("")
      setQuantity(1)
    }
  })

  if (!isOpen || !product) return null

  // Use product.sizes as array of { size, stock } only
  const sizeObjs = product.sizes;
  const sizeOptions = sizeObjs.map(s => s.size);
  const selectedSizeObj = sizeObjs.find(s => s.size === selectedSize);
  const selectedSizeStock = selectedSizeObj ? selectedSizeObj.stock : 0;
  
  // Enhanced stock status logic
  let stockStatus = '';
  let stockStatusColor = '';
  if (!selectedSize) {
    stockStatus = '';
    stockStatusColor = '';
  } else if (selectedSizeStock === 0) {
    stockStatus = 'Out of Stock';
    stockStatusColor = 'text-red-500';
  } else if (selectedSizeStock <= 5) {
    stockStatus = `Only ${selectedSizeStock} left!`;
    stockStatusColor = 'text-orange-500';
  } else {
    stockStatus = 'In Stock';
    stockStatusColor = 'text-green-600';
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size first')
      return
    }
    if (!selectedSizeStock || selectedSizeStock === 0) {
      alert('This size is out of stock')
      return
    }
    if (quantity > selectedSizeStock) {
      alert(`Cannot add more than ${selectedSizeStock} in stock for this size.`)
      return
    }
    onAddToCart(product, selectedSize, quantity, selectedSizeStock)
    onClose()
  }

  const handleBuyNow = () => {
    if (!selectedSize) {
      alert('Please select a size first')
      return
    }
    if (!selectedSizeStock || selectedSizeStock === 0) {
      alert('This size is out of stock')
      return
    }
    if (quantity > selectedSizeStock) {
      alert(`Cannot add more than ${selectedSizeStock} in stock for this size.`)
      return
    }
    onBuyNow(product, selectedSize, quantity)
    onClose()
  }

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
    setQuantity(1); // Reset quantity when changing size
  }

  const increaseQuantity = () => {
    if (selectedSizeStock && quantity < selectedSizeStock) {
      setQuantity((prev) => prev + 1)
    } else if (selectedSizeStock && quantity >= selectedSizeStock) {
      // Show alert when trying to exceed stock
      alert(`Cannot add more than ${selectedSizeStock} in stock for this size.`)
    }
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-x-0 bottom-0 md:right-0 md:top-0 md:left-auto md:w-96 md:inset-y-0 bg-white z-[9999] transform transition-transform duration-300 md:shadow-2xl">
        {/* Mobile: Bottom sheet style, Desktop: Right sidebar */}
        <div className="h-full flex flex-col max-h-[90vh] md:max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 font-serif">SELECT OPTIONS</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Product Images */}
            {product.images && product.images.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 justify-center mb-2">
                {product.images.map((img, idx) => (
                  <div
                    key={img + idx}
                    className="rounded-lg border-2 border-gray-200 flex-shrink-0"
                    style={{ width: 120, height: 150 }}
                  >
                    <Image
                      src={img || "/placeholder.svg"}
                      alt={product.name}
                      width={120}
                      height={150}
                      className="object-cover w-full h-full rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Product Info */}
            <div className="space-y-3">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{product.name}</h3>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">₹{product.price.toLocaleString()} INR</span>
                {product.originalPrice > product.price && (
                  <span className="text-lg text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                )}
              </div>

              <p className="text-sm text-gray-600">Tax included.</p>
            </div>

            {/* Size Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">SIZE:</span>
                {selectedSize && <span className="text-sm font-bold text-gray-900">{selectedSize}</span>}
              </div>

              {/* Size Grid */}
              {sizeOptions.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {sizeObjs.map((s) => (
                    <button
                      key={s.size + '-' + s.stock}
                      onClick={() => handleSizeSelect(s.size)}
                      className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center justify-center border-2
                        ${selectedSize === s.size
                          ? 'bg-[#473C66] text-white border-[#473C66] shadow-lg'
                          : s.stock === 0
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : 'bg-white text-[#473C66] border-[#A78BFA] hover:bg-pink-50 hover:border-pink-300'}
                      `}
                      disabled={s.stock === 0}
                    >
                      {s.size}
                      {s.stock === 0 && <span className="text-[10px] text-[#E75480] mt-1 font-bold line-through">Out</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#E75480] font-medium">Size not available</div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="space-y-3">
              <span className="text-sm font-medium text-gray-900">QUANTITY:</span>
              <div className="flex items-center">
                <button
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="w-12 h-12 border border-gray-300 rounded-l-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-16 h-12 border-t border-b border-gray-300 flex items-center justify-center bg-white">
                  <span className="font-medium">{quantity}</span>
                </div>
                <button
                  onClick={increaseQuantity}
                  className="w-12 h-12 border border-gray-300 rounded-r-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedSizeStock !== undefined && quantity >= selectedSizeStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Stock status display */}
              {selectedSize && (
                <div className={`text-sm font-medium ${stockStatusColor}`}>
                  {stockStatus}
                </div>
              )}
              
              {/* Stock warning if quantity exceeds stock */}
              {selectedSize && selectedSizeStock > 0 && quantity > selectedSizeStock && (
                <div className="text-xs text-red-500 font-medium">
                  Maximum quantity: {selectedSizeStock}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || selectedSizeStock === 0 || (selectedSizeStock > 0 && quantity > selectedSizeStock)}
                className="w-full py-4 px-6 bg-white border-2 border-[#473C66] text-[#473C66] font-bold rounded-xl hover:bg-[#473C66] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ADD TO CART
              </button>
              
              <button
                onClick={handleBuyNow}
                disabled={!selectedSize || selectedSizeStock === 0 || (selectedSizeStock > 0 && quantity > selectedSizeStock)}
                className="w-full py-4 px-6 bg-[#473C66] text-white font-bold rounded-xl hover:bg-[#3a3054] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                BUY IT NOW
              </button>
            </div>

            {/* Size Guide Link */}
            <div className="text-center">
              <button className="text-sm text-gray-600 hover:text-gray-900 underline">Size Guide</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
