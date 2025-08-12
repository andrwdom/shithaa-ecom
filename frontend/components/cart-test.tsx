"use client"

import React from 'react'
import { useCart } from './cart-context'
import { useBuyNow } from './buy-now-context'
import { Button } from './ui/button'

export default function CartTest() {
  const { cartItems, addToCart, clearCart } = useCart()
  const { buyNowItem, setBuyNowItem, clearBuyNowItem } = useBuyNow()

  const testProduct = {
    id: 'test-1',
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Product',
    price: 999,
    quantity: 1,
    size: 'M',
    image: '/placeholder.svg'
  }

  const testBuyNowProduct = {
    id: 2,
    _id: '507f1f77bcf86cd799439012',
    name: 'Buy Now Product',
    price: 1499,
    quantity: 1,
    size: 'L',
    image: '/placeholder.svg'
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Cart/Buy-Now Test</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Cart Items ({cartItems.length})</h4>
          <div className="space-y-2">
            {cartItems.map((item, index) => (
              <div key={index} className="text-sm text-gray-600">
                {item.name} - {item.size} - ₹{item.price}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              onClick={() => addToCart(testProduct, false)}
            >
              Add to Cart
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Buy Now Item</h4>
          <div className="text-sm text-gray-600 mb-2">
            {buyNowItem ? `${buyNowItem.name} - ${buyNowItem.size} - ₹${buyNowItem.price}` : 'None'}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setBuyNowItem(testBuyNowProduct)}
            >
              Set Buy Now
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={clearBuyNowItem}
            >
              Clear Buy Now
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Navigation Test</h4>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.href = '/checkout'}
            >
              Go to Checkout
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.href = '/checkout?mode=buynow'}
            >
              Go to Checkout (Buy Now)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 