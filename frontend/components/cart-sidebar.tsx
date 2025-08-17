"use client"

import React from "react"
import { X, Plus, Minus, ShoppingBag, Gift, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useCart, CartItem } from "@/components/cart-context"
import { useBuyNow } from "@/components/buy-now-context"
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
    isLoadingOffer
  } = useCart();
  const { clearBuyNowItem } = useBuyNow();
  const [productStocks, setProductStocks] = useState<Record<string, Record<string, number>>>({});
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const router = useRouter();
  
  // Add refs to prevent excessive API calls and improve performance
  const stockFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCartItemsRef = useRef<string>('');

  // Memoize cart items count to prevent unnecessary re-renders
  const cartItemsCount = useMemo(() => cartItems.length, [cartItems.length]);
  
  // Memoize cart items hash for stock fetching optimization
  const cartItemsHash = useMemo(() => 
    cartItems.map(item => `${item._id}-${item.size}-${item.quantity}`).join('|'), 
    [cartItems]
  );

  // Show empty state after a small delay to prevent flickering
  useEffect(() => {
    if (cartItemsCount === 0) {
      const timer = setTimeout(() => setShowEmptyState(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowEmptyState(false);
    }
  }, [cartItemsCount]);

  // Optimized stock fetching with debouncing and caching
  const fetchStocks = useCallback(async () => {
    if (cartItemsCount === 0) return;
    
    // Create a hash of cart items to check if they've changed
    if (cartItemsHash === lastCartItemsRef.current) return;
    
    // Clear any existing timeout
    if (stockFetchTimeoutRef.current) {
      clearTimeout(stockFetchTimeoutRef.current);
    }
    
    // Debounce stock fetching to prevent rapid API calls
    stockFetchTimeoutRef.current = setTimeout(async () => {
      setIsLoadingStocks(true);
      
      const stocks: Record<string, Record<string, number>> = {};
      
      try {
        // Import the safeFetch function
        const { safeFetch } = await import('@/lib/api-utils')
        
        // Only fetch stocks for items we don't already have
        const itemsToFetch = cartItems.filter(item => !productStocks[item._id]);
        
        for (const item of itemsToFetch) {
          if (!stocks[item._id]) {
            try {
              const response = await safeFetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/products/${item._id}`,
                {},
                `product-stock-${item._id}`,
                5 * 60 * 1000 // 5 minutes cache for stock info
              )
              
              if (response.ok) {
                const data = await response.json()
                if (data.product && Array.isArray(data.product.sizes)) {
                  stocks[item._id] = {};
                  for (const s of data.product.sizes) {
                    stocks[item._id][s.size] = s.stock;
                  }
                } else if (data.data && Array.isArray(data.data.sizes)) {
                  stocks[item._id] = {};
                  for (const s of data.data.sizes) {
                    stocks[item._id][s.size] = s.stock;
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching stock for item:', item._id, error);
            }
          }
        }
        
        // Merge new stocks with existing ones
        setProductStocks(prev => ({ ...prev, ...stocks }));
        lastCartItemsRef.current = cartItemsHash;
        
      } catch (error) {
        console.error('Error importing safeFetch:', error);
      } finally {
        setIsLoadingStocks(false);
      }
    }, 300); // Reduced to 300ms debounce delay
  }, [cartItems, productStocks, cartItemsCount, cartItemsHash]);

  // Fetch stock info for all cart items on open - with debouncing
  useEffect(() => {
    if (isCartSidebarOpen && cartItemsCount > 0) {
      fetchStocks();
    }
  }, [isCartSidebarOpen, cartItemsCount, fetchStocks]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (stockFetchTimeoutRef.current) {
        clearTimeout(stockFetchTimeoutRef.current);
      }
    };
  }, []);

  // Function to handle checkout from cart
  const handleProceedToCheckout = () => {
    clearBuyNowItem();
    closeCartSidebar();
    router.push('/checkout');
  };

  if (!isCartSidebarOpen) return null;

  return (
    <React.Fragment>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={closeCartSidebar} />
      
      {/* Sidebar - Removed problematic transitions */}
      <div className="fixed right-0 top-0 h-full w-[420px] max-w-[95vw] bg-white shadow-2xl z-[9999] flex flex-col cart-sidebar-mobile">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[rgb(71,60,102)] font-serif flex items-center gap-2 sm:gap-3">
              <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7" />
              Shopping Cart
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={closeCartSidebar}
              className="hover:bg-purple-100 rounded-full p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            {cartItemsCount} item{cartItemsCount !== 1 ? "s" : ""} in cart
          </p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {/* Show loading state while stocks are being fetched */}
          {isLoadingStocks && cartItemsCount > 0 ? (
            <div className="text-center py-16 px-6">
              <div className="animate-pulse">
                <div className="h-20 w-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
            </div>
          ) : cartItemsCount === 0 && showEmptyState ? (
            <div className="text-center py-16 px-6">
              <ShoppingBag className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">Your cart is empty</p>
              <p className="text-gray-400 text-sm">Start shopping to add items to your cart</p>
            </div>
          ) : cartItemsCount > 0 ? (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Special Offer Banner */}
              {offerDetails?.offerApplied && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-green-800 text-xs sm:text-sm mb-1">
                        🎉 Special Loungewear Bundle Offer!
                      </h3>
                      <p className="text-green-700 text-xs leading-relaxed">
                        {offerDetails.offerDetails?.completeSets || 0} set(s) of 3 for ₹1,299 each
                        {offerDetails.offerDetails?.remainingItems > 0 && (
                          <span> • {offerDetails.offerDetails.remainingItems} item(s) at ₹450 each</span>
                        )}
                      </p>
                      <div className="mt-2 text-green-800 font-semibold text-xs sm:text-sm">
                        Total Savings: ₹{offerDetails.offerDiscount?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Progress to Next Offer */}
              {offerDetails?.loungewearCategoryCount && offerDetails.loungewearCategoryCount > 0 && offerDetails.loungewearCategoryCount < 3 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-800 text-xs sm:text-sm mb-1">Almost there!</h3>
                      <p className="text-blue-700 text-xs">
                        Add {3 - (offerDetails.loungewearCategoryCount || 0)} more loungewear item(s) to unlock the ₹1,299 bundle offer
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Cart Items */}
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const stock = productStocks[item._id]?.[item.size];
                  const isMaxQuantity = stock !== undefined && item.quantity >= stock;
                  
                  return (
                    <div key={`${item.id}-${item.size}`} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
                      <div className="flex gap-3 sm:gap-4">
                        {/* Product Image */}
                        <div className="w-16 h-20 sm:w-20 sm:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={80}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight mb-2 line-clamp-2">
                            {item.name}
                          </h3>
                          
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              Size: {item.size}
                            </p>
                            <p className="font-bold text-[rgb(71,60,102)] text-base sm:text-lg">
                              ₹{item.price.toLocaleString()}
                            </p>
                          </div>
                          
                          {/* Quantity Controls & Actions Row */}
                          <div className="flex items-center justify-between mb-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log("CartSidebar: Decrease quantity clicked for item:", { _id: item._id, size: item.size, currentQty: item.quantity })
                                  updateCartItem(item._id, item.size, Math.max(1, item.quantity - 1), stock)
                                }}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border-gray-300 hover:border-purple-400"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              
                              <span className={`text-sm font-medium w-6 sm:w-8 text-center ${
                                isMaxQuantity ? 'text-red-600' : 'text-gray-700'
                              }`}>
                                {item.quantity}
                              </span>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (stock !== undefined && item.quantity >= stock) {
                                    alert(`Cannot add more than ${stock} in stock for this size.`);
                                    return;
                                  }
                                  console.log("CartSidebar: Increase quantity clicked for item:", { _id: item._id, size: item.size, currentQty: item.quantity })
                                  updateCartItem(item._id, item.size, item.quantity + 1, stock);
                                }}
                                disabled={isMaxQuantity}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border-gray-300 hover:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Stock Info */}
                            {stock !== undefined && (
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                isMaxQuantity 
                                  ? 'bg-red-100 text-red-700 border border-red-200' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {isMaxQuantity ? (
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Max ({stock})
                                  </span>
                                ) : (
                                  `${stock} in stock`
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Remove Button - Full Width Row */}
                          <div className="pt-2 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log("CartSidebar: Remove button clicked for item:", { _id: item._id, size: item.size })
                                console.log("CartSidebar: Current cart items before removal:", cartItems)
                                console.log("CartSidebar: Calling removeFromCart...")
                                removeFromCart(item._id, item.size)
                                console.log("CartSidebar: removeFromCart called, checking cart after removal...")
                                // Add a small delay to check the cart state after removal
                                setTimeout(() => {
                                  console.log("CartSidebar: Cart items after removal (delayed check):", cartItems)
                                }, 100)
                              }}
                              className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm py-2 h-auto border border-red-200 hover:border-red-300 rounded-lg"
                            >
                              Remove Item
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {cartItemsCount > 0 && (
          <div className="border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 sm:p-6 space-y-4">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-semibold text-gray-900">Total:</span>
              <div className="text-right">
                {isLoadingOffer ? (
                  <div className="text-sm text-gray-500">Calculating...</div>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold text-[rgb(71,60,102)]">
                    ₹{cartTotal.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            {/* Shipping Info */}
            <div className="text-xs text-gray-500 text-center bg-white px-3 py-2 rounded-lg border border-gray-200">
              <Info className="h-3 w-3 inline mr-1" />
              Shipping calculated based on your location and items
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base shadow-lg" 
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-2 border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white bg-transparent py-2.5 sm:py-3 rounded-xl font-medium"
                onClick={closeCartSidebar}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
