"use client"

import { useState, useEffect } from "react"
import { X, Plus, Minus, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useCart } from "@/components/cart-context"
import { useBuyNow } from "@/components/buy-now-context"
import { useCheckoutFlow } from "@/components/checkout-flow-manager"

interface Product {
  id: number
  _id: string
  name: string
  price: number
  originalPrice: number
  image: string
  images?: string[]
  category: string
  categorySlug?: string
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
  const { cartItems } = useCart()
  const { setBuyNowItem } = useBuyNow()
  const { setCheckoutFlow } = useCheckoutFlow()

  // Reset state when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSize("")
      setQuantity(1)
    }
  }, [isOpen])

  // Get current cart quantity for selected product and size
  const getCurrentCartQuantity = (productId: string, size: string) => {
    const existingItem = cartItems.find(item => item._id === productId && item.size === size)
    return existingItem ? existingItem.quantity : 0
  }

  if (!isOpen || !product) return null

  // Use product.sizes as array of { size, stock, availableStock } only
  const sizeObjs = product.sizes;
  const sizeOptions = sizeObjs.map(s => s.size);
  const selectedSizeObj = sizeObjs.find(s => s.size === selectedSize);
  const selectedSizeStock = selectedSizeObj ? (selectedSizeObj.availableStock || selectedSizeObj.stock || 0) : 0;
  
  // Enhanced stock status logic
  let stockStatus = '';
  let stockStatusColor = '';
  if (!selectedSize) {
    stockStatus = '';
    stockStatusColor = '';
  } else if (selectedSizeStock === 0) {
    stockStatus = 'Out of Stock';
    stockStatusColor = 'text-red-500';
  } else {
    const currentCartQty = getCurrentCartQuantity(product._id, selectedSize)
    const availableToAdd = selectedSizeStock - currentCartQty
    
    if (currentCartQty > 0) {
      stockStatus = `You have ${currentCartQty} in cart. ${availableToAdd} more available.`;
      stockStatusColor = 'text-blue-600';
    } else if (selectedSizeStock <= 5) {
      stockStatus = `Only ${selectedSizeStock} left!`;
      stockStatusColor = 'text-orange-500';
    } else {
      stockStatus = 'In Stock';
      stockStatusColor = 'text-green-600';
    }
  }

  const handleAddToCart = () => {
    if (!selectedSize) {
      return
    }
    if (!selectedSizeStock || selectedSizeStock === 0) {
      return
    }
    
    const currentCartQty = getCurrentCartQuantity(product._id, selectedSize)
    const availableToAdd = selectedSizeStock - currentCartQty
    
    if (quantity > availableToAdd) {
      return
    }
    
    onAddToCart(product, selectedSize, quantity, selectedSizeStock)
    onClose()
  }

  const handleBuyNow = () => {
    if (!selectedSize) {
      return
    }
    if (!selectedSizeStock || selectedSizeStock === 0) {
      return
    }
    
    const currentCartQty = getCurrentCartQuantity(product._id, selectedSize)
    const availableToAdd = selectedSizeStock - currentCartQty
    
    if (quantity > availableToAdd) {
      return
    }
    
    // 🔑 FIXED: Implement proper Buy Now logic matching product page exactly
    const buyNowItem = {
      id: (product._id || product.id)?.toString() || product._id,
      _id: (product._id || product.id)?.toString() || product._id,
      name: product.name,
      price: product.price,
      quantity,
      size: selectedSize,
      image: product.images?.[0] || product.image || "/placeholder.svg",
      categorySlug: product.categorySlug,
      category: product.category
    };
    
    console.log('🛒 [SizeSelectionSidebar] Setting buy-now item:', buyNowItem);
    
    // Set buy now item in context
    setBuyNowItem(buyNowItem);
    
    // Also manually save to storage to ensure persistence (EXACTLY like product page)
    const buyNowData = {
      flow: {
        mode: 'buy-now',
        items: [buyNowItem],
        source: 'buy-now',
        timestamp: Date.now(),
        sessionId: `buynow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      items: [buyNowItem],
      timestamp: Date.now()
    };
    
    // Save to multiple storage locations for maximum persistence
    sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
    localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
    sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
    localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
    
    console.log('💾 [SizeSelectionSidebar] Buy-now item saved to storage before navigation');
    
    // Navigate to checkout using the checkout flow manager
    setCheckoutFlow('buy-now');
    
    // Small delay to ensure storage is written before navigation
    setTimeout(() => {
      console.log('🚀 [SizeSelectionSidebar] Navigating to buy-now checkout');
      window.location.href = '/checkout?mode=buynow';
    }, 100);
    
    onClose()
  }

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
    setQuantity(1); // Reset quantity when changing size
  }

  const increaseQuantity = () => {
    const currentCartQty = getCurrentCartQuantity(product._id, selectedSize)
    const availableToAdd = selectedSizeStock - currentCartQty
    
    if (quantity < availableToAdd) {
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
                  disabled={selectedSizeStock !== undefined && quantity >= (selectedSizeStock - getCurrentCartQuantity(product._id, selectedSize))}
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
              
              {/* Cart quantity info */}
              {selectedSize && getCurrentCartQuantity(product._id, selectedSize) > 0 && (
                <div className="text-xs text-blue-600 font-medium">
                  You already have {getCurrentCartQuantity(product._id, selectedSize)} in your cart
                </div>
              )}
              
              {/* Stock warning if quantity exceeds available stock */}
              {selectedSize && selectedSizeStock > 0 && quantity > (selectedSizeStock - getCurrentCartQuantity(product._id, selectedSize)) && (
                <div className="text-xs text-red-500 font-medium">
                  Maximum quantity you can add: {selectedSizeStock - getCurrentCartQuantity(product._id, selectedSize)}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || selectedSizeStock === 0 || (selectedSizeStock > 0 && quantity > (selectedSizeStock - getCurrentCartQuantity(product._id, selectedSize)))}
                className="w-full py-4 px-6 bg-white border-2 border-[#473C66] text-[#473C66] font-bold rounded-xl hover:bg-[#473C66] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ADD TO CART
              </button>
              
              <button
                onClick={handleBuyNow}
                disabled={!selectedSize || selectedSizeStock === 0 || (selectedSizeStock > 0 && quantity > (selectedSizeStock - getCurrentCartQuantity(product._id, selectedSize)))}
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
