"use client"

import { useCart } from "./cart-context"

export default function CartTest() {
  try {
    const cart = useCart()
    console.log("CartTest: Cart context working, items:", cart.cartItems)
    return (
      <div className="p-4 bg-green-100 border border-green-300 rounded">
        ✅ Cart context is working! Items: {cart.cartItems.length}
      </div>
    )
  } catch (error) {
    console.error("CartTest: Error using cart context:", error)
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded">
        ❌ Cart context error: {error instanceof Error ? error.message : String(error)}
      </div>
    )
  }
} 