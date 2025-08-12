"use client"

import { useCart } from "./cart-context"

export default function SimpleCartTest() {
  console.log("SimpleCartTest: Component rendering")
  
  try {
    console.log("SimpleCartTest: About to call useCart")
    const cart = useCart()
    console.log("SimpleCartTest: useCart successful, cart:", cart)
    
    return (
      <div className="p-4 bg-green-100 border border-green-300 rounded m-4">
        <h3 className="font-bold text-green-800">✅ Cart Context Test</h3>
        <p>Cart items: {cart.cartItems.length}</p>
        <p>Cart total: ₹{cart.cartTotal}</p>
        <p>Sidebar open: {cart.isCartSidebarOpen ? 'Yes' : 'No'}</p>
      </div>
    )
  } catch (error) {
    console.error("SimpleCartTest: Error using cart context:", error)
    
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded m-4">
        <h3 className="font-bold text-red-800">❌ Cart Context Error</h3>
        <p className="text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer text-red-600">Stack Trace</summary>
          <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
            {error instanceof Error ? error.stack : 'No stack trace available'}
          </pre>
        </details>
      </div>
    )
  }
} 