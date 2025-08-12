"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

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

  // Load cart from localStorage on mount
  useEffect(() => {
    console.log("CartProvider: Loading cart from localStorage")
    const stored = localStorage.getItem("cartItems")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        console.log("CartProvider: Loaded cart items:", parsed)
        setCartItems(parsed)
      } catch (error) {
        console.error("CartProvider: Error parsing stored cart:", error)
      }
    }
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
    console.log("CartProvider: Saving cart to localStorage:", cartItems)
    localStorage.setItem("cartItems", JSON.stringify(cartItems))
  }, [cartItems])

  // Calculate cart total and check for offers when cart changes
  useEffect(() => {
    if (cartItems.length > 0) {
      calculateCartTotalWithOffers()
    } else {
      setCartTotal(0)
      setOfferDetails(null)
    }
  }, [cartItems])

  console.log("CartProvider: Rendering with cartItems:", cartItems)

  // Function to calculate cart total with offers
  const calculateCartTotalWithOffers = async () => {
    if (cartItems.length === 0) return

    setIsLoadingOffer(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/calculate-total`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: cartItems }),
      })

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
        setCartSubtotal(fallbackTotal)
        setOfferDetails(null)
      }
    } catch (error) {
      console.error("Error calculating cart total:", error)
      // Fallback to simple calculation
      const fallbackTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      setCartTotal(fallbackTotal)
      setCartSubtotal(fallbackTotal)
      setOfferDetails(null)
    } finally {
      setIsLoadingOffer(false)
    }
  }

  function addToCart(item: CartItem, openSidebar: boolean = true, stock?: number) {
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
  }

  function updateCartItem(_id: string, size: string, quantity: number, stock?: number) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i._id === _id && i.size === size)
      if (typeof stock === 'number' && quantity > stock) {
        alert(`Cannot set quantity higher than ${stock} in stock for this size.`)
        return prev
      }
      return prev.map((item) =>
        item._id === _id && item.size === size ? { ...item, quantity } : item
      )
    })
  }

  function removeFromCart(_id: string, size: string) {
    setCartItems((prev) => prev.filter((item) => !(item._id === _id && item.size === size)))
  }

  function openCartSidebar() {
    setIsCartSidebarOpen(true)
  }
  function closeCartSidebar() {
    setIsCartSidebarOpen(false)
  }

  function clearCart() {
    setCartItems([])
    localStorage.removeItem("cartItems")
  }

  const contextValue: CartContextType = {
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
    isLoadingOffer
  }

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