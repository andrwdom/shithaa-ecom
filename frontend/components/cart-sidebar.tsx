"use client"

import { X, Plus, Minus, ShoppingBag, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useCart } from "@/components/cart-context"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  size: string
  image: string
}

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (id: number, quantity: number) => void
  onRemoveItem: (id: number) => void
}

export default function CartSidebar() {
  const {
    cartItems, 
    updateCartItem, 
    removeFromCart, 
    isCartSidebarOpen, 
    closeCartSidebar,
    cartTotal,
    offerDetails,
    isLoadingOffer
  } = useCart();
  const [productStocks, setProductStocks] = useState<Record<string, Record<string, number>>>({});
  const router = useRouter();

  // Fetch stock info for all cart items on open
  useEffect(() => {
    async function fetchStocks() {
      const stocks: Record<string, Record<string, number>> = {};
      for (const item of cartItems) {
        if (!stocks[item._id]) {
          try {
            const res = await fetch(`/api/products/${item._id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.data && Array.isArray(data.data.sizes)) {
                stocks[item._id] = {};
                for (const s of data.data.sizes) {
                  stocks[item._id][s.size] = s.stock;
                }
              }
            }
          } catch {}
        }
      }
      setProductStocks(stocks);
    }
    if (isCartSidebarOpen && cartItems.length > 0) fetchStocks();
  }, [isCartSidebarOpen, cartItems]);

  if (!isCartSidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeCartSidebar} />
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[rgb(71,60,102)] font-serif flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              Shopping Cart
            </h2>
            <Button variant="ghost" size="sm" onClick={closeCartSidebar}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart
          </p>
        </div>
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const stock = productStocks[item._id]?.[item.size];
                return (
                  <div key={`${item.id}-${item.size}`} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl">
                    <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={64}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">Size: {item.size}</p>
                      <p className="font-bold text-[rgb(71,60,102)] mt-1">₹{item.price.toLocaleString()}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItem(item.id, item.size, Math.max(1, item.quantity - 1), stock)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItem(item.id, item.size, item.quantity + 1, stock)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id, item.size)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            {/* Offer Details */}
            {offerDetails?.offerApplied && (
              <div className="mb-4 bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Loungewear Offer Applied! 🎉</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  <p>• {offerDetails.offerDetails?.completeSets} set(s) of 3 for ₹1299 each</p>
                  {offerDetails.offerDetails?.remainingItems > 0 && (
                    <p>• {offerDetails.offerDetails.remainingItems} item(s) at ₹450 each</p>
                  )}
                  <p className="font-semibold">You saved ₹{offerDetails.offerDiscount}!</p>
                </div>
              </div>
            )}
            
            {/* Loungewear Offer Hint */}
            {offerDetails && !offerDetails.offerApplied && offerDetails.loungewearCount > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">almost there!</span>
                </div>
                <p className="text-xs text-blue-700">
                  Add {offerDetails.loungewearCount} more loungewear item(s) to get 3 for ₹1299
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <div className="text-right">
                {isLoadingOffer ? (
                  <div className="text-sm text-gray-500">Calculating...</div>
                ) : (
                  <span className="text-2xl font-bold text-[rgb(71,60,102)]">₹{cartTotal.toLocaleString()}</span>
                )}
              </div>
            </div>
            <Button className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white py-3 rounded-xl font-semibold" onClick={() => { window.location.href = "/checkout"; }}>
              Proceed to Checkout
            </Button>
            <Button
              variant="outline"
              className="w-full mt-3 border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white bg-transparent"
              onClick={closeCartSidebar}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
