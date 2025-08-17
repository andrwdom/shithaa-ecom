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
  cartTotal: number
  cartSubtotal: number
  offerDetails: OfferDetails | null
  isLoadingOffer: boolean
  // Add function to notify checkout that cart has changed
  notifyCheckoutCartChanged: () => void
  // Add function to restore cart from storage
  restoreCartFromStorage: () => void
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
  // Add state to track if cart has been initialized
  const [isCartInitialized, setIsCartInitialized] = useState(false)
  
  // Add refs to prevent race conditions
  const isCalculatingRef = useRef(false)
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCartHashRef = useRef<string>('')

  // Enhanced function to load cart from localStorage
  const loadCartFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem("cartItems")
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log("CartProvider: Loaded cart items from storage:", parsed)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate each item has required fields
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
            console.log("CartProvider: Successfully restored", validItems.length, "cart items")
            return true
          } else {
            console.log("CartProvider: No valid items found in stored cart")
          }
        } else {
          console.log("CartProvider: Stored cart is empty or invalid")
        }
      } else {
        console.log("CartProvider: No stored cart found")
      }
    } catch (error) {
      console.error("CartProvider: Error parsing stored cart:", error)
    }
    return false
  }, [])

  // Function to restore cart from storage (public API)
  const restoreCartFromStorage = useCallback(() => {
    console.log("CartProvider: Manual cart restoration requested")
    return loadCartFromStorage()
  }, [loadCartFromStorage])

  // Load cart from localStorage on mount with multiple fallback strategies
  useEffect(() => {
    console.log("CartProvider: Initializing cart from storage...")
    
    // First attempt: immediate load
    let restored = loadCartFromStorage()
    
    // Second attempt: if first failed, try again after a short delay
    if (!restored) {
      const timer = setTimeout(() => {
        console.log("CartProvider: Retrying cart restoration...")
        restored = loadCartFromStorage()
        if (restored) {
          setIsCartInitialized(true)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setIsCartInitialized(true)
    }
    
    // Also listen for storage events (in case cart is updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cartItems" && e.newValue) {
        console.log("CartProvider: Storage event detected, reloading cart")
        loadCartFromStorage()
      }
    }

    // Additional restoration attempt for page refreshes
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        console.log("CartProvider: Page restored from cache, reloading cart")
        loadCartFromStorage()
      }
    }

    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && cartItems.length === 0 && !isCartInitialized) {
        console.log("CartProvider: Page became visible, checking for stored cart")
        loadCartFromStorage()
      }
    }

    // Listen for focus events
    const handleFocus = () => {
      if (cartItems.length === 0 && !isCartInitialized) {
        console.log("CartProvider: Window focused, checking for stored cart")
        loadCartFromStorage()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadCartFromStorage, cartItems.length, isCartInitialized])

  // Enhanced save cart to localStorage with error handling and backup
  useEffect(() => {
    if (cartItems.length > 0) {
      console.log("CartProvider: Saving cart to localStorage:", cartItems)
      try {
        // Save to primary storage
        localStorage.setItem("cartItems", JSON.stringify(cartItems))
        
        // Also save to sessionStorage as backup
        sessionStorage.setItem("cartItems", JSON.stringify(cartItems))
        
        // Increment counter to notify checkout of cart changes
        setCartChangeCounter(prev => prev + 1)
        console.log("CartProvider: Cart saved successfully")
      } catch (error) {
        console.error("CartProvider: Error saving cart to localStorage:", error)
        // Try sessionStorage as fallback
        try {
          sessionStorage.setItem("cartItems", JSON.stringify(cartItems))
          console.log("CartProvider: Cart saved to sessionStorage as fallback")
        } catch (sessionError) {
          console.error("CartProvider: Failed to save cart to both storages:", sessionError)
        }
      }
    } else if (cartItems.length === 0 && isCartInitialized) {
      // Only clear storage if we're sure the cart should be empty
      console.log("CartProvider: Cart is empty, clearing storage")
      try {
        localStorage.removeItem("cartItems")
        sessionStorage.removeItem("cartItems")
      } catch (error) {
        console.error("CartProvider: Error clearing cart storage:", error)
      }
    }
  }, [cartItems, isCartInitialized])

  // Function to calculate cart total with offers - properly memoized and debounced
  const calculateCartTotalWithOffers = useCallback(async () => {
    if (cartItems.length === 0) return

    // Create a hash of the current cart to prevent unnecessary API calls
    const cartHash = cartItems.map(item => `${item._id}-${item.size}-${item.quantity}`).join('|')
    
    // If cart hasn't changed, don't recalculate
    if (cartHash === lastCartHashRef.current) {
      return
    }
    
    // If already calculating, don't start another calculation
    if (isCalculatingRef.current) {
      return
    }

    // Clear any existing timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current)
    }

    // Debounce the calculation to prevent excessive API calls
    calculationTimeoutRef.current = setTimeout(async () => {
      isCalculatingRef.current = true
      lastCartHashRef.current = cartHash
      
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
          `cart-total-${cartHash}`,
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
        isCalculatingRef.current = false
      }
    }, 300) // 300ms debounce delay
  }, [cartItems])

  // Calculate cart total and check for offers when cart changes - with proper dependency management
  useEffect(() => {
    if (cartItems.length > 0) {
      calculateCartTotalWithOffers()
    } else {
      setCartTotal(0)
      setOfferDetails(null)
      // Clear the hash when cart is empty
      lastCartHashRef.current = ''
    }
  }, [cartItems, calculateCartTotalWithOffers])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current)
      }
    }
  }, [])

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

  // Enhanced clearCart function that only clears after successful order
  const clearCart = useCallback(() => {
    console.log("CartProvider: clearCart called - this should only happen after successful order placement")
    setCartItems([])
    try {
      localStorage.removeItem("cartItems")
      sessionStorage.removeItem("cartItems")
    } catch (error) {
      console.error("CartProvider: Error clearing cart storage:", error)
    }
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
    notifyCheckoutCartChanged,
    restoreCartFromStorage
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
    notifyCheckoutCartChanged,
    restoreCartFromStorage
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