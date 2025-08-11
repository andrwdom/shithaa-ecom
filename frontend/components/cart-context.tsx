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
  offerDetails: {
    completeSets: number;
    remainingItems: number;
    offerPrice: number;
    originalPrice: number;
    savings: number;
  } | null;
  offerDiscount: number;
  loungewearCount: number;
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
  refreshCartData: () => Promise<void> // Add this function
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)
  const [cartTotal, setCartTotal] = useState(0)
  const [cartSubtotal, setCartSubtotal] = useState(0)
  const [offerDetails, setOfferDetails] = useState<OfferDetails | null>(null)
  const [isLoadingOffer, setIsLoadingOffer] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("cartItems")
    if (stored) setCartItems(JSON.parse(stored))
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
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

  // Function to refresh cart data from backend to ensure fresh data
  const refreshCartData = async () => {
    try {
      // Get current cart items from localStorage
      const stored = localStorage.getItem("cartItems")
      if (!stored) return
      
      const currentCartItems = JSON.parse(stored)
      if (currentCartItems.length === 0) return

      // Fetch fresh product data for all cart items
      const refreshedItems: CartItem[] = []
      
      for (const item of currentCartItems) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/products/${item._id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              const product = data.data
              
              // Check if the selected size still has stock
              const sizeData = product.sizes?.find((s: any) => s.size === item.size)
              const currentStock = sizeData?.stock || 0
              
              // If item is out of stock, remove it
              if (currentStock === 0) {
                console.log(`Product ${product.name} size ${item.size} is out of stock, removing from cart`)
                continue
              }
              
              // If quantity exceeds stock, adjust it
              const adjustedQuantity = Math.min(item.quantity, currentStock)
              
              // Create refreshed item with latest data
              const refreshedItem: CartItem = {
                id: product._id || product.id,
                _id: product._id || product.id,
                name: product.name,
                price: product.price,
                quantity: adjustedQuantity,
                size: item.size,
                image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image || item.image,
                categorySlug: product.categorySlug,
                category: product.category,
              }
              
              refreshedItems.push(refreshedItem)
              
              // Update localStorage with adjusted quantity if needed
              if (adjustedQuantity !== item.quantity) {
                console.log(`Adjusted quantity for ${product.name} size ${item.size} from ${item.quantity} to ${adjustedQuantity}`)
              }
            } else {
              // Product not found, keep original item but mark as potentially invalid
              refreshedItems.push(item)
            }
          } else {
            // API call failed, keep original item
            refreshedItems.push(item)
          }
        } catch (error) {
          console.error(`Error refreshing product ${item._id}:`, error)
          // Keep original item on error
          refreshedItems.push(item)
        }
      }
      
      // Update cart with refreshed data
      if (refreshedItems.length !== currentCartItems.length || 
          JSON.stringify(refreshedItems) !== JSON.stringify(currentCartItems)) {
        setCartItems(refreshedItems)
        localStorage.setItem("cartItems", JSON.stringify(refreshedItems))
        console.log("Cart data refreshed from backend")
      }
      
    } catch (error) {
      console.error("Error refreshing cart data:", error)
    }
  }

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
            loungewearCount: data.data.loungewearCount,
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

  return (
    <CartContext.Provider
      value={{ 
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
        refreshCartData
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
} 