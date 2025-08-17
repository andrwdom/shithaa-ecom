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
  
  // Add refs to prevent race conditions and improve performance
  const isCalculatingRef = useRef(false)
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCartHashRef = useRef<string>('')
  const storageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Enhanced function to load cart from localStorage
  const loadCartFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem("cartItems")
      if (stored) {
        const parsed = JSON.parse(stored)
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
          }
        }
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

  // Load cart from localStorage on mount - simplified to prevent conflicts
  useEffect(() => {
    if (!isCartInitialized) {
      console.log("CartProvider: Initializing cart from storage...")
      const restored = loadCartFromStorage()
      if (restored) {
        setIsCartInitialized(true)
      } else {
        // Set as initialized even if no cart found
        setIsCartInitialized(true)
      }
    }
  }, [loadCartFromStorage, isCartInitialized])

  // Batched and debounced cart storage updates
  const updateCartStorage = useCallback((newCartItems: CartItem[]) => {
    // Clear any existing timeout
    if (storageUpdateTimeoutRef.current) {
      clearTimeout(storageUpdateTimeoutRef.current)
    }
    
    // Batch storage updates with debouncing
    storageUpdateTimeoutRef.current = setTimeout(() => {
      try {
        if (newCartItems.length > 0) {
          // Save to primary storage
          localStorage.setItem("cartItems", JSON.stringify(newCartItems))
          // Also save to sessionStorage as backup
          sessionStorage.setItem("cartItems", JSON.stringify(newCartItems))
          // Increment counter to notify checkout of cart changes
          setCartChangeCounter(prev => prev + 1)
        } else if (newCartItems.length === 0 && isCartInitialized) {
          // Only clear storage if we're sure the cart should be empty
          localStorage.removeItem("cartItems")
          sessionStorage.removeItem("cartItems")
        }
      } catch (error) {
        console.error("CartProvider: Error saving cart to localStorage:", error)
        // Try sessionStorage as fallback
        try {
          if (newCartItems.length > 0) {
            sessionStorage.setItem("cartItems", JSON.stringify(newCartItems))
          } else {
            sessionStorage.removeItem("cartItems")
          }
        } catch (sessionError) {
          console.error("CartProvider: Failed to save cart to both storages:", sessionError)
        }
      }
    }, 100) // 100ms debounce for storage updates
  }, [isCartInitialized])

  // Enhanced save cart to localStorage with batching and debouncing
  useEffect(() => {
    if (isCartInitialized) {
      updateCartStorage(cartItems)
    }
  }, [cartItems, isCartInitialized, updateCartStorage])

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
    }, 500) // Increased to 500ms debounce delay for better stability
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current)
      }
      if (storageUpdateTimeoutRef.current) {
        clearTimeout(storageUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Simplified cart operations without operation locks
  const addToCart = useCallback((item: CartItem, openSidebar: boolean = true, stock?: number) => {
    console.log("CartProvider: addToCart called with:", item)
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === item._id && i.size === item.size)
      const existingQty = existing ? existing.quantity : 0
      const newQty = existingQty + item.quantity
      if (typeof stock === 'number' && newQty > stock) {
        alert(`Cannot add more than ${stock} in stock for this size.`)
        return prev
      }
      if (existing) {
        const updated = prev.map((i) =>
          i._id === item._id && i.size === item.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
        console.log("CartProvider: Updated existing item, new cart:", updated)
        return updated
      }
      const newCart = [...prev, item]
      console.log("CartProvider: Added new item, new cart:", newCart)
      return newCart
    })
    if (openSidebar) setIsCartSidebarOpen(true)
  }, [])

  const updateCartItem = useCallback((_id: string, size: string, quantity: number, stock?: number) => {
    console.log("CartProvider: updateCartItem called with:", { _id, size, quantity, stock })
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === _id && i.size === size)
      if (!existing) {
        console.log("CartProvider: Item not found for update:", { _id, size })
        return prev;
      }
      
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
      
      const updated = prev.map((item) =>
        item._id === _id && item.size === size ? { ...item, quantity } : item
      )
      console.log("CartProvider: Updated item quantity, new cart:", updated)
      return updated
    })
  }, [])

  const removeFromCart = useCallback((_id: string, size: string) => {
    console.log("CartProvider: removeFromCart called with:", { _id, size })
    setCartItems((prev) => {
      const filtered = prev.filter((item) => !(item._id === _id && item.size === size))
      console.log("CartProvider: Removed item, new cart:", filtered)
      return filtered
    })
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

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    console.error("useCart hook called outside of CartProvider")
    console.error("Stack trace:", new Error().stack)
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}

// Add default export for the context
export default CartContext 