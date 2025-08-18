"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react"

export interface CartItem {
  id: string; // for frontend logic
  _id: string; // MongoDB ObjectId as string, for backend
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  categorySlug?: string; // Add categorySlug for offer calculation
  category?: string; // Add category name for shipping calculation
}

export interface OfferDetails {
  offerApplied: boolean;
  offerDetails: any;
  offerDiscount: number;
  loungewearCategoryCount: number;
  otherItemsCount: number;
}

interface CartContextType {
  cartItems: CartItem[]
  addToCart: (item: CartItem, openSidebar?: boolean, stock?: number) => void
  updateCartItem: (id: string, size: string, quantity: number, stock?: number) => void
  removeFromCart: (id: string, size: string) => void
  isCartSidebarOpen: boolean
  openCartSidebar: () => void
  closeCartSidebar: () => void
  clearCart: () => void
  clearCartAfterSuccessfulCheckout: () => void
  cartTotal: number
  cartSubtotal: number
  offerDetails: OfferDetails | null
  isLoadingOffer: boolean
  notifyCheckoutCartChanged: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)
  const [cartTotal, setCartTotal] = useState(0)
  const [cartSubtotal, setCartSubtotal] = useState(0)
  const [offerDetails, setOfferDetails] = useState<OfferDetails | null>(null)
  const [isLoadingOffer, setIsLoadingOffer] = useState(false)
  const [cartChangeCounter, setCartChangeCounter] = useState(0)
  const [wasCartIntentionallyCleared, setWasCartIntentionallyCleared] = useState(false)
  
  // Simple refs for API call optimization
  const isCalculatingRef = useRef(false)
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCartHashRef = useRef<string>('')

  // 🔧 RELIABLE CART PERSISTENCE: Load cart from localStorage on mount
  useEffect(() => {
    if (wasCartIntentionallyCleared) {
      console.log("[CartContext] 🚫 Cart was intentionally cleared, not loading from storage")
      return
    }
    
    try {
      const stored = localStorage.getItem("cartItems")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validItems = parsed.filter(item => 
            item && 
            item._id && 
            item.name && 
            typeof item.price === 'number' && 
            typeof item.quantity === 'number' && 
            item.size
          )
          if (validItems.length > 0) {
            setCartItems(validItems)
            console.log("[CartContext] ✅ Loaded", validItems.length, "items from localStorage")
          }
        }
      }
    } catch (error) {
      console.error("[CartContext] ❌ Error loading cart from storage:", error)
    }
  }, [wasCartIntentionallyCleared])

  // 🔧 RELIABLE CART PERSISTENCE: Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      const cartData = JSON.stringify(cartItems);
      localStorage.setItem("cartItems", cartData);
      console.log("[CartContext] 💾 Saved cart items to localStorage");
      
      // Store in checkout flow specific storage with unique key
      const cartCheckoutData = {
        flow: {
          mode: 'cart',
          items: cartItems,
          source: 'cart',
          timestamp: Date.now(),
          sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        items: cartItems,
        timestamp: Date.now()
      };
      sessionStorage.setItem("cartCheckoutData", JSON.stringify(cartCheckoutData));
      localStorage.setItem("cartCheckoutData", JSON.stringify(cartCheckoutData));
      
      // Also store in flow-specific storage for immediate checkout access
      const flow = {
        mode: 'cart',
        items: cartItems,
        source: 'cart',
        timestamp: Date.now(),
        sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      sessionStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
      sessionStorage.setItem("cartCheckoutItems", JSON.stringify(cartItems));
      localStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
      localStorage.setItem("cartCheckoutItems", JSON.stringify(cartItems));
      
      console.log("[CartContext] 💾 Saved cart checkout flow data to all storage locations");
    } else {
      // Only clear localStorage if cart is intentionally empty (not on mount)
      if (wasCartIntentionallyCleared) {
        localStorage.removeItem("cartItems");
        console.log("[CartContext] 🗑️ Cleared cart items from localStorage after successful checkout");
      }
      
      // Clear checkout flow data
      sessionStorage.removeItem("cartCheckoutData");
      localStorage.removeItem("cartCheckoutData");
      sessionStorage.removeItem("cartCheckoutFlow");
      localStorage.removeItem("cartCheckoutFlow");
      sessionStorage.removeItem("cartCheckoutItems");
      localStorage.removeItem("cartCheckoutItems");
    }
  }, [cartItems, wasCartIntentionallyCleared]);

  // Simple function to save cart to storage - called only after actions complete
  const saveCartToStorage = useCallback((items: CartItem[]) => {
    try {
      if (items.length > 0) {
        localStorage.setItem("cartItems", JSON.stringify(items))
        sessionStorage.setItem("cartItems", JSON.stringify(items))
        console.log("[CartContext] 💾 Cart saved to both storages")
      } else {
        localStorage.removeItem("cartItems")
        sessionStorage.removeItem("cartItems")
        console.log("[CartContext] 🗑️ Cart cleared from both storages")
      }
    } catch (error) {
      console.error("[CartContext] ❌ Error saving cart to storage:", error)
    }
  }, [])

  // Calculate cart total with offers - optimized
  const calculateCartTotalWithOffers = useCallback(async () => {
    if (cartItems.length === 0) return

    const cartHash = cartItems.map(item => `${item._id}-${item.size}-${item.quantity}`).join('|')
    
    if (cartHash === lastCartHashRef.current) return
    if (isCalculatingRef.current) return

    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current)
    }

    calculationTimeoutRef.current = setTimeout(async () => {
      isCalculatingRef.current = true
      lastCartHashRef.current = cartHash
      
      setIsLoadingOffer(true)
      try {
        const { safeFetch } = await import('@/lib/api-utils')
        
        const response = await safeFetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/calculate-total`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: cartItems }),
          },
          `cart-total-${cartHash}`,
          2 * 60 * 1000
        )

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setCartTotal(data.data.total)
            setCartSubtotal(data.data.subtotal)
            setOfferDetails({
              offerApplied: data.data.offerApplied,
              offerDetails: data.data.offerDetails,
              offerDiscount: data.data.offerDiscount,
              loungewearCategoryCount: data.data.loungewearCategoryCount,
              otherItemsCount: data.data.otherItemsCount,
            })
          }
        } else {
          const fallbackTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          setCartTotal(fallbackTotal)
          setOfferDetails(null)
        }
      } catch (error) {
        console.error("Error calculating cart total:", error)
        const fallbackTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        setCartTotal(fallbackTotal)
        setOfferDetails(null)
      } finally {
        setIsLoadingOffer(false)
        isCalculatingRef.current = false
      }
    }, 300) // Reduced debounce for faster response
  }, [cartItems])

  // Calculate total when cart changes
  useEffect(() => {
    if (cartItems.length > 0) {
      calculateCartTotalWithOffers()
    } else {
      setCartTotal(0)
      setOfferDetails(null)
      lastCartHashRef.current = ''
    }
  }, [cartItems, calculateCartTotalWithOffers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current)
      }
    }
  }, [])

  // SIMPLE CART OPERATIONS - Save to storage only after action completes
  const addToCart = useCallback((item: CartItem, openSidebar: boolean = true, stock?: number) => {
    console.log("[CartContext] 🛒 addToCart called with:", item)
    
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === item._id && i.size === item.size)
      const existingQty = existing ? existing.quantity : 0
      const newQty = existingQty + item.quantity
      
      if (typeof stock === 'number' && newQty > stock) {
        alert(`Cannot add more than ${stock} in stock for this size.`)
        return prev
      }
      
      let newCart: CartItem[]
      if (existing) {
        newCart = prev.map((i) =>
          i._id === item._id && i.size === item.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      } else {
        newCart = [...prev, item]
      }
      
      // Save to storage IMMEDIATELY to prevent race conditions
      console.log("[CartContext] 💾 Saving to storage immediately:", newCart)
      saveCartToStorage(newCart)
      
      // Reset the flag since we now have items in the cart
      if (newCart.length > 0) {
        setWasCartIntentionallyCleared(false)
        console.log("[CartContext] ✅ Cart has items, allowing storage restoration")
      }
      
      console.log("[CartContext] ✅ Added item, new cart:", newCart)
      return newCart
    })
    
    if (openSidebar) setIsCartSidebarOpen(true)
  }, [saveCartToStorage])

  const updateCartItem = useCallback((_id: string, size: string, quantity: number, stock?: number) => {
    console.log("[CartContext] 🔄 updateCartItem called with:", { _id, size, quantity, stock })
    
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === _id && i.size === size)
      if (!existing) {
        console.log("[CartContext] ❌ Item not found for update:", { _id, size })
        return prev
      }
      
      if (typeof stock === 'number' && stock > 0 && quantity > stock) {
        alert(`Cannot set quantity higher than ${stock} in stock for this size.`)
        return prev
      }
      
      if (quantity < 1) quantity = 1
      
      const newCart = prev.map((item) =>
        item._id === _id && item.size === size ? { ...item, quantity } : item
      )
      
      // Save to storage IMMEDIATELY to prevent race conditions
      console.log("[CartContext] 💾 Saving to storage immediately:", newCart)
      saveCartToStorage(newCart)
      
      console.log("[CartContext] ✅ Updated item, new cart:", newCart)
      return newCart
    })
  }, [saveCartToStorage])

  const removeFromCart = useCallback((_id: string, size: string) => {
    console.log("[CartContext] 🗑️ removeFromCart called with:", { _id, size })
    console.log("[CartContext] 📦 Current cart before removal:", cartItems)
    
    setCartItems((prev) => {
      console.log("[CartContext] 📦 Previous cart state:", prev)
      const newCart = prev.filter((item) => !(item._id === _id && item.size === size))
      console.log("[CartContext] 📦 Filtered cart after removal:", newCart)
      
      // Save to storage IMMEDIATELY to prevent race conditions
      console.log("[CartContext] 💾 Saving to storage immediately:", newCart)
      saveCartToStorage(newCart)
      
      // If cart becomes empty, set flag to prevent restoration from storage
      if (newCart.length === 0) {
        setWasCartIntentionallyCleared(true)
        console.log("[CartContext] 🚫 Cart is now empty, preventing restoration from storage")
      }
      
      console.log("[CartContext] ✅ Removed item, returning new cart:", newCart)
      return newCart
    })
  }, [saveCartToStorage, cartItems])

  const openCartSidebar = useCallback(() => {
    setIsCartSidebarOpen(true)
  }, [])

  const closeCartSidebar = useCallback(() => {
    setIsCartSidebarOpen(false)
  }, [])

  const clearCart = () => {
    console.log("CartProvider: Clearing cart");
    setCartItems([]);
    setCartTotal(0);
    setCartSubtotal(0);
    setOfferDetails(null);
    setWasCartIntentionallyCleared(true);
    
    // Clear from localStorage after successful checkout
    localStorage.removeItem("cartItems");
    sessionStorage.removeItem("cartItems");
    
    // Clear checkout flow data
    sessionStorage.removeItem("cartCheckoutData");
    localStorage.removeItem("cartCheckoutData");
    
    console.log("CartProvider: Cart cleared and marked as intentionally cleared");
  }

  // 🔧 NEW FUNCTION: Clear cart after successful checkout (keeps buy-now intact)
  const clearCartAfterSuccessfulCheckout = () => {
    console.log("[CartContext] 🗑️ Clearing cart after successful checkout");
    setCartItems([]);
    setCartTotal(0);
    setCartSubtotal(0);
    setOfferDetails(null);
    setWasCartIntentionallyCleared(true);
    
    // Clear cart items from localStorage
    localStorage.removeItem("cartItems");
    sessionStorage.removeItem("cartItems");
    
    // Clear cart checkout flow data
    sessionStorage.removeItem("cartCheckoutData");
    localStorage.removeItem("cartCheckoutData");
    sessionStorage.removeItem("cartCheckoutFlow");
    sessionStorage.removeItem("cartCheckoutItems");
    localStorage.removeItem("cartCheckoutFlow");
    localStorage.removeItem("cartCheckoutItems");
    localStorage.removeItem("cartOrderData");
    sessionStorage.removeItem("cartOrderData");
    
    console.log("[CartContext] 🗑️ Cart cleared after successful checkout - all storage locations cleaned");
  }

  const notifyCheckoutCartChanged = useCallback(() => {
    setCartChangeCounter(prev => prev + 1)
  }, [])

  // Listen for custom events to open cart sidebar
  useEffect(() => {
    const handleOpenCartSidebar = () => {
      setIsCartSidebarOpen(true)
    }

    window.addEventListener('openCartSidebar', handleOpenCartSidebar)
    return () => window.removeEventListener('openCartSidebar', handleOpenCartSidebar)
  }, [])

  // Memoize context value
  const contextValue = useMemo(() => ({
    cartItems, 
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    isCartSidebarOpen, 
    openCartSidebar, 
    closeCartSidebar, 
    clearCart,
    clearCartAfterSuccessfulCheckout,
    cartTotal,
    cartSubtotal,
    offerDetails,
    isLoadingOffer,
    notifyCheckoutCartChanged
  }), [
    cartItems, 
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    isCartSidebarOpen, 
    openCartSidebar, 
    closeCartSidebar, 
    clearCart,
    clearCartAfterSuccessfulCheckout,
    cartTotal,
    cartSubtotal,
    offerDetails,
    isLoadingOffer,
    notifyCheckoutCartChanged
  ])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}

export default CartContext 