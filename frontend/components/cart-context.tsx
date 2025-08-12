"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth/useAuth"

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
  addToCart: (item: CartItem, openSidebar?: boolean, stock?: number) => Promise<void>
  updateCartItem: (id: string, size: string, quantity: number, stock?: number) => Promise<void>
  removeFromCart: (id: string, size: string) => Promise<void>
  isCartSidebarOpen: boolean
  openCartSidebar: () => void
  closeCartSidebar: () => void
  clearCart: () => Promise<void>
  cartTotal: number
  cartSubtotal: number
  offerDetails: OfferDetails | null
  isLoadingOffer: boolean
  refreshCartData: () => Promise<void>
  syncCartWithBackend: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)
  const [cartTotal, setCartTotal] = useState(0)
  const [cartSubtotal, setCartSubtotal] = useState(0)
  const [offerDetails, setOfferDetails] = useState<OfferDetails | null>(null)
  const [isLoadingOffer, setIsLoadingOffer] = useState(false)
  const { user } = useAuth()

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

  // Sync cart with backend when user changes
  useEffect(() => {
    if (user) {
      syncCartWithBackend()
    }
  }, [user])

  // Function to get backend token
  const getBackendToken = async (): Promise<string | null> => {
    if (!user) return null
    
    let token = localStorage.getItem("token")
    if (token) return token
    
    // Try to get a new backend token using Firebase ID token
    try {
      const { getIdToken } = await import("firebase/auth")
      const idToken = await getIdToken(user)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (data.success && data.data.token) {
        localStorage.setItem("token", data.data.token)
        return data.data.token
      }
    } catch (err) {
      console.error("Error getting backend token:", err)
    }
    return null
  }

  // Function to sync cart with backend
  const syncCartWithBackend = async () => {
    if (!user) return
    
    try {
      const token = await getBackendToken()
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.cartData) {
          // Convert backend cart format to frontend format
          const backendCartItems: CartItem[] = []
          
          for (const [productId, sizes] of Object.entries(data.cartData)) {
            for (const [size, quantity] of Object.entries(sizes as Record<string, number>)) {
              // Fetch product details to get name, price, image, etc.
              try {
                const productResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/products/${productId}`)
                if (productResponse.ok) {
                  const productData = await productResponse.json()
                  if (productData.success && productData.data) {
                    const product = productData.data
                    const sizeData = product.sizes?.find((s: any) => s.size === size)
                    
                    if (sizeData && sizeData.stock > 0) {
                      backendCartItems.push({
                        id: product._id,
                        _id: product._id,
                        name: product.name,
                        price: product.price,
                        quantity: quantity as number,
                        size: size,
                        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image,
                        categorySlug: product.categorySlug,
                        category: product.category,
                      })
                    }
                  }
                }
              } catch (error) {
                console.error(`Error fetching product ${productId}:`, error)
              }
            }
          }
          
          // Update frontend cart with backend data
          setCartItems(backendCartItems)
          localStorage.setItem("cartItems", JSON.stringify(backendCartItems))
        }
      }
    } catch (error) {
      console.error("Error syncing cart with backend:", error)
    }
  }

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
        body: JSON.stringify({
          items: cartItems.map(item => ({
            _id: item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            image: item.image,
            category: item.category,
            categorySlug: item.categorySlug
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCartTotal(data.data.totalAmount)
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

  async function addToCart(item: CartItem, openSidebar: boolean = true, stock?: number) {
    // CRITICAL: Validate stock before any frontend updates
    if (typeof stock === 'number' && stock <= 0) {
      alert('This item is out of stock');
      return;
    }
    
    if (typeof stock === 'number' && item.quantity > stock) {
      alert(`Cannot add more than ${stock} in stock for this size.`);
      return;
    }

    // CRITICAL: Check if adding this quantity would exceed stock when combined with existing cart items
    const existingItem = cartItems.find((i) => i._id === item._id && i.size === item.size)
    const existingQty = existingItem ? existingItem.quantity : 0
    const newTotalQty = existingQty + item.quantity
    
    if (typeof stock === 'number' && newTotalQty > stock) {
      alert(`Cannot add ${item.quantity} more. You already have ${existingQty} in cart, and only ${stock} available in stock.`);
      return;
    }

    // Sync with backend FIRST if user is authenticated
    if (user) {
      try {
        const token = await getBackendToken()
        if (token) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': token
            },
            body: JSON.stringify({
              itemId: item._id,
              size: item.size,
              quantity: item.quantity
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Backend cart add failed:', errorData)
            alert(errorData.message || 'Failed to add item to cart')
            return
          }

          // Only update frontend after successful backend validation
          const responseData = await response.json()
          console.log('Backend cart add successful:', responseData)
          
          // Update frontend cart with validated data from backend
          setCartItems((prev) => {
            const existing = prev.find((i) => i._id === item._id && i.size === item.size)
            if (existing) {
              return prev.map((i) =>
                i._id === item._id && i.size === item.size
                  ? { ...i, quantity: responseData.data.quantity }
                  : i
              )
            }
            return [...prev, { ...item, quantity: responseData.data.quantity }]
          })
        }
      } catch (error) {
        console.error('Error syncing with backend:', error)
        alert('Failed to sync with backend. Please try again.')
        return
      }
    } else {
      // For non-authenticated users, update frontend immediately but with stock validation
      setCartItems((prev) => {
        const existing = prev.find((i) => i._id === item._id && i.size === item.size)
        if (existing) {
          return prev.map((i) =>
            i._id === item._id && i.size === item.size
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )
        }
        return [...prev, item]
      })
    }

    if (openSidebar) setIsCartSidebarOpen(true)
  }

  async function updateCartItem(_id: string, size: string, quantity: number, stock?: number) {
    console.log('updateCartItem called:', { _id, size, quantity, stock, user: !!user })
    
    // CRITICAL: Validate stock before any frontend updates
    if (typeof stock === 'number' && stock <= 0) {
      alert('This item is out of stock');
      return;
    }
    
    if (typeof stock === 'number' && quantity > stock) {
      console.warn(`Stock validation failed: quantity ${quantity} > stock ${stock}`)
      alert(`Cannot set quantity higher than ${stock} in stock for this size.`);
      return
    }

    // Don't allow quantity less than 1
    if (quantity < 1) {
      console.warn('Quantity validation failed: quantity < 1')
      alert('Quantity cannot be less than 1')
      return
    }

    // Sync with backend FIRST if user is authenticated
    if (user) {
      try {
        const token = await getBackendToken()
        if (token) {
          console.log('Sending update to backend:', { userId: user.mongoId || user.uid, itemId: _id, size, quantity })
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': token
            },
            body: JSON.stringify({
              itemId: _id,
              size: size,
              quantity: quantity
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Backend cart update failed:', errorData)
            alert(errorData.message || 'Failed to update cart')
            return
          }

          // Only update frontend after successful backend validation
          const responseData = await response.json()
          console.log('Backend cart update successful:', responseData)
          
          // Update frontend cart with validated data from backend
          setCartItems((prev) => {
            const existing = prev.find((i) => i._id === _id && i.size === size)
            if (existing) {
              return prev.map((i) =>
                i._id === _id && i.size === size
                  ? { ...i, quantity: responseData.data.quantity }
                  : i
              )
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Error syncing with backend:', error)
        alert('Failed to sync with backend. Please try again.')
        return
      }
    } else {
      // For non-authenticated users, update frontend immediately but with stock validation
      setCartItems((prev) => {
        const existing = prev.find((i) => i._id === _id && i.size === size)
        if (existing) {
          return prev.map((i) =>
            i._id === _id && i.size === size
              ? { ...i, quantity: quantity }
              : i
          )
        }
        return prev
      })
    }
  }

  async function removeFromCart(_id: string, size: string) {
    // Remove from frontend cart immediately for better UX
    setCartItems((prev) => prev.filter((item) => !(item._id === _id && item.size === size)))

    // Sync with backend if user is authenticated
    if (user) {
      try {
        const token = await getBackendToken()
        if (token) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': token
            },
            body: JSON.stringify({
              itemId: _id,
              size: size
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Backend cart remove failed:', errorData)
            // Revert frontend changes if backend fails
            setCartItems((prev) => {
              const existing = prev.find((i) => i._id === _id && i.size === size)
              if (existing) {
                return [...prev, existing]
              }
              return prev
            })
            alert(errorData.message || 'Failed to remove item from cart')
            return
          }
        }
      } catch (error) {
        console.error('Error syncing with backend:', error)
        // Revert frontend changes if backend sync fails
        setCartItems((prev) => {
          const existing = prev.find((i) => i._id === _id && i.size === size)
          if (existing) {
            return [...prev, existing]
          }
          return prev
        })
        alert('Failed to sync with backend. Please try again.')
        return
      }
    }
  }

  async function clearCart() {
    // Clear frontend cart immediately for better UX
    setCartItems([])
    localStorage.removeItem("cartItems")

    // Sync with backend if user is authenticated
    if (user) {
      try {
        const token = await getBackendToken()
        if (token) {
          // Remove all items one by one from backend
          for (const item of cartItems) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/remove`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': token
              },
              body: JSON.stringify({
                userId: user.mongoId || user.uid,
                itemId: item._id,
                size: item.size
              })
            })
          }
        }
      } catch (error) {
        console.error('Error clearing backend cart:', error)
      }
    }
  }

  function openCartSidebar() {
    setIsCartSidebarOpen(true)
  }
  
  function closeCartSidebar() {
    setIsCartSidebarOpen(false)
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
        refreshCartData,
        syncCartWithBackend
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