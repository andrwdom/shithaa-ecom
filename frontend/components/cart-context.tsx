"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"

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
  cartTotal: number
  cartSubtotal: number
  offerDetails: OfferDetails | null
  isLoadingOffer: boolean
  // Add function to notify checkout that cart has changed
  notifyCheckoutCartChanged: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  console.log("CartProvider initializing...")
  
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)
  const [cartTotal, setCartTotal] = useState(0)
  const [cartSubtotal, setCartSubtotal] = useState(0)
  const [offerDetails, setOfferDetails] = useState<OfferDetails | null>(null)
  const [isLoadingOffer, setIsLoadingOffer] = useState(false)
  // Add state to track cart changes for checkout
  const [cartChangeCounter, setCartChangeCounter] = useState(0)

  // Load cart from localStorage on mount
  useEffect(() => {
    console.log("CartProvider: Loading cart from localStorage")
    const loadCart = () => {
      try {
        const stored = localStorage.getItem("cartItems")
        if (stored) {
          const parsed = JSON.parse(stored)
          console.log("CartProvider: Loaded cart items:", parsed)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCartItems(parsed)
          } else {
            console.log("CartProvider: Stored cart is empty or invalid")
            setCartItems([])
          }
        } else {
          console.log("CartProvider: No stored cart found")
          setCartItems([])
        }
      } catch (error) {
        console.error("CartProvider: Error parsing stored cart:", error)
        setCartItems([])
      }
    }

    // Load immediately
    loadCart()
    
    // Also listen for storage events (in case cart is updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cartItems" && e.newValue) {
        console.log("CartProvider: Storage event detected, reloading cart")
        loadCart()
      }
    }

    // Additional restoration attempt for page refreshes
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        console.log("CartProvider: Page restored from cache, reloading cart")
        loadCart()
      }
    }

    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && cartItems.length === 0) {
        console.log("CartProvider: Page became visible, checking for stored cart")
        loadCart()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Removed cartItems.length dependency to prevent infinite loops

  // Save cart to localStorage on change
  useEffect(() => {
    console.log("CartProvider: Saving cart to localStorage:", cartItems)
    localStorage.setItem("cartItems", JSON.stringify(cartItems))
    // Increment counter to notify checkout of cart changes
    setCartChangeCounter(prev => prev + 1)
  }, [cartItems])

  // Function to calculate cart total with offers - moved before useEffect
  const calculateCartTotalWithOffers = useCallback(async () => {
    if (cartItems.length === 0) return

    setIsLoadingOffer(true)
    try {
      // Import the safeFetch function
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
        `cart-total-${cartItems.map(item => `${item._id}-${item.size}-${item.quantity}`).join('-')}`,
        2 * 60 * 1000 // 2 minutes cache
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
        // Fallback to simple calculation if API fails
        const fallbackTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        setCartTotal(fallbackTotal)
        setOfferDetails(null)
      }
    } catch (error) {
      console.error("Error calculating cart total:", error)
      // Fallback to simple calculation
      const fallbackTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      setCartTotal(fallbackTotal)
      setOfferDetails(null)
    } finally {
      setIsLoadingOffer(false)
    }
  }, [cartItems])

  // Calculate cart total and check for offers when cart changes
  useEffect(() => {
    if (cartItems.length > 0) {
      calculateCartTotalWithOffers()
    } else {
      setCartTotal(0)
      setOfferDetails(null)
    }
  }, [cartItems, calculateCartTotalWithOffers])

  console.log("CartProvider: Rendering with cartItems:", cartItems)

  const addToCart = useCallback((item: CartItem, openSidebar: boolean = true, stock?: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === item._id && i.size === item.size)
      const existingQty = existing ? existing.quantity : 0
      const newQty = existingQty + item.quantity
      if (typeof stock === 'number' && newQty > stock) {
        alert(`Cannot add more than ${stock} in stock for this size.`)
        return prev
      }
      if (existing) {
        return prev.map((i) =>
          i._id === item._id && i.size === item.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
    if (openSidebar) setIsCartSidebarOpen(true)
  }, [])

  const updateCartItem = useCallback((_id: string, size: string, quantity: number, stock?: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === _id && i.size === size)
      if (!existing) return prev;
      
      // Strict stock validation
      if (typeof stock === 'number' && stock > 0) {
        if (quantity > stock) {
          alert(`Cannot set quantity higher than ${stock} in stock for this size.`);
          return prev;
        }
      }
      
      // Ensure quantity is at least 1
      if (quantity < 1) {
        quantity = 1;
      }
      
      return prev.map((item) =>
        item._id === _id && item.size === size ? { ...item, quantity } : item
      )
    })
  }, [])

  const removeFromCart = useCallback((_id: string, size: string) => {
    setCartItems((prev) => prev.filter((item) => !(item._id === _id && item.size === size)))
  }, [])

  const openCartSidebar = useCallback(() => {
    setIsCartSidebarOpen(true)
  }, [])

  const closeCartSidebar = useCallback(() => {
    setIsCartSidebarOpen(false)
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
    localStorage.removeItem("cartItems")
  }, [])

  // Function to notify checkout that cart has changed
  const notifyCheckoutCartChanged = useCallback(() => {
    setCartChangeCounter(prev => prev + 1)
  }, [])

  // Listen for custom events to open cart sidebar
  useEffect(() => {
    const handleOpenCartSidebar = () => {
      setIsCartSidebarOpen(true);
    };

    window.addEventListener('openCartSidebar', handleOpenCartSidebar);
    
    return () => {
      window.removeEventListener('openCartSidebar', handleOpenCartSidebar);
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    cartItems, 
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    isCartSidebarOpen, 
    openCartSidebar, 
    closeCartSidebar, 
    clearCart,
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
    cartTotal,
    cartSubtotal,
    offerDetails,
    isLoadingOffer,
    notifyCheckoutCartChanged
  ])

  console.log("CartProvider: Providing context value:", contextValue)

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  console.log("useCart hook called")
  const ctx = useContext(CartContext)
  console.log("useCart: Context value:", ctx)
  if (!ctx) {
    console.error("useCart hook called outside of CartProvider")
    console.error("Stack trace:", new Error().stack)
    throw new Error("useCart must be used within a CartProvider")
  }
  console.log("useCart: Returning context:", ctx)
  return ctx
}

// Add default export for the context
export default CartContext 