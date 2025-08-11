"use client"

import React from "react"
import { X, Plus, Minus, ShoppingBag, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useCart, CartItem } from "@/components/cart-context"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CartSidebar() {
  const {
    cartItems, 
    updateCartItem, 
    removeFromCart, 
    isCartSidebarOpen, 
    closeCartSidebar,
    cartTotal,
    offerDetails,
    isLoadingOffer,
    refreshCartData
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

  // Handle proceed to checkout with data refresh
  const handleProceedToCheckout = async () => {
    try {
      // Refresh cart data before navigating to checkout
      await refreshCartData();
      // Close sidebar and navigate to checkout
      closeCartSidebar();
      window.location.href = "/checkout";
    } catch (error) {
      console.error("Error refreshing cart data:", error);
      // Still navigate to checkout even if refresh fails
      closeCartSidebar();
      window.location.href = "/checkout";
    }
  };

  if (!isCartSidebarOpen) return null;

  return (
    <React.Fragment>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={closeCartSidebar} />
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[9999] transform transition-transform duration-300 flex flex-col">
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
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Your cart is empty</p>
              <Button onClick={closeCartSidebar} className="bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item._id + item.size} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-sm text-gray-500">Size: {item.size}</p>
                    <p className="text-sm font-semibold text-[rgb(71,60,102)]">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentStock = productStocks[item._id]?.[item.size] || 0;
                        if (item.quantity > 1) {
                          updateCartItem(item._id, item.size, item.quantity - 1, currentStock);
                        }
                      }}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentStock = productStocks[item._id]?.[item.size] || 0;
                        updateCartItem(item._id, item.size, item.quantity + 1, currentStock);
                      }}
                      disabled={item.quantity >= (productStocks[item._id]?.[item.size] || 999)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item._id, item.size)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-white">
            {/* Offer Details */}
            {offerDetails?.offerApplied && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Gift className="h-4 w-4" />
                  <span className="text-sm font-medium">Special Offer Applied!</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {offerDetails.offerDetails?.completeSets || 0} complete sets at special price
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
            <div className="text-xs text-gray-500 text-center mb-4">
              Shipping calculated based on your location and items
            </div>
            <Button className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white py-3 rounded-xl font-semibold" onClick={handleProceedToCheckout}>
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
    </React.Fragment>
  );
}
