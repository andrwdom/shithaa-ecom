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
}

interface CartContextType {
  cartItems: CartItem[]
  addToCart: (item: CartItem, openSidebar?: boolean) => void
  updateCartItem: (id: string, size: string, quantity: number) => void
  removeFromCart: (id: string, size: string) => void
  isCartSidebarOpen: boolean
  openCartSidebar: () => void
  closeCartSidebar: () => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("cartItems")
    if (stored) setCartItems(JSON.parse(stored))
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems))
  }, [cartItems])

  function addToCart(item: CartItem, openSidebar: boolean = true) {
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
    if (openSidebar) setIsCartSidebarOpen(true)
  }

  function updateCartItem(_id: string, size: string, quantity: number) {
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === _id && item.size === size ? { ...item, quantity } : item
      )
    )
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
      value={{ cartItems, addToCart, updateCartItem, removeFromCart, isCartSidebarOpen, openCartSidebar, closeCartSidebar, clearCart }}
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