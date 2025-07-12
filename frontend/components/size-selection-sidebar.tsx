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
  onAddToCart: (product: Product, size: string, quantity: number) => void
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
  let stockStatus = '';
  if (!selectedSize) stockStatus = '';
  else if (selectedSizeStock > 5) stockStatus = 'In Stock';
  else if (selectedSizeStock > 0) stockStatus = `Only ${selectedSizeStock} left!`;
  else stockStatus = 'Out of Stock';

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Please select a size first!")
      return
    }
    if (selectedSizeStock === 0) {
      alert("Selected size is out of stock!");
      return;
    }
    onAddToCart(product, selectedSize, quantity)
    onClose()
  }

  const handleBuyNow = () => {
    if (!selectedSize) {
      alert("Please select a size first!")
      return
    }
    if (selectedSizeStock === 0) {
      alert("Selected size is out of stock!");
      return;
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
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-x-0 bottom-0 md:right-0 md:top-0 md:left-auto md:w-96 md:inset-y-0 bg-white z-50 transform transition-transform duration-300 md:shadow-2xl">
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
                      {s.stock === 0 && <span className="text-[10px] text-[#E75480] mt-1 font-bold">Out</span>}
                      {s.stock > 0 && s.stock <= 5 && <span className="text-[10px] text-[#FDE68A] mt-1 font-semibold flex items-center gap-1">{s.stock} left <svg className="inline h-3 w-3 text-[#FDE68A]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" /></svg></span>}
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
                  className="w-12 h-12 border border-gray-300 rounded-r-lg flex items-center justify-center hover:bg-gray-50"
                  disabled={selectedSizeStock !== undefined && quantity >= selectedSizeStock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {/* Stock status */}
              {selectedSize && (
                <div className={`text-xs font-semibold mt-1 ${selectedSizeStock === 0 ? 'text-[#E75480]' : selectedSizeStock <= 5 ? 'text-[#FDE68A]' : 'text-green-600'}`}>{stockStatus}</div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 md:p-6 border-t border-gray-200 bg-white space-y-3">
            <Button
              onClick={handleAddToCart}
              variant="outline"
              size="lg"
              className="w-full py-4 text-base font-semibold border-2 border-[#473C66] text-[#473C66] hover:bg-[#473C66] hover:text-white transition-all duration-300 bg-transparent rounded-xl"
              disabled={sizeOptions.length === 0 || !selectedSize || selectedSizeStock === 0}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              ADD TO CART
            </Button>

            <Button
              onClick={handleBuyNow}
              size="lg"
              className="w-full py-4 text-base font-semibold bg-[#473C66] hover:bg-[#3a3054] text-white transition-all duration-300 rounded-xl shadow-md"
              disabled={sizeOptions.length === 0 || !selectedSize || selectedSizeStock === 0}
            >
              BUY IT NOW
            </Button>

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
