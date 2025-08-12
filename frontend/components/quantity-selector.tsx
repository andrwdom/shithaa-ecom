"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface QuantitySelectorProps {
  quantity: number
  onQuantityChange: (quantity: number) => void
  max?: number
  stock?: number // Add stock parameter for validation
  disabled?: boolean
}

export default function QuantitySelector({ quantity, onQuantityChange, max = 10, stock, disabled = false }: QuantitySelectorProps) {
  // Use stock as the maximum if available, otherwise fall back to max prop
  const actualMax = stock !== undefined ? stock : max;
  
  const decreaseQuantity = () => {
    if (quantity > 1 && !disabled) {
      onQuantityChange(quantity - 1)
    }
  }

  const increaseQuantity = () => {
    if (quantity < actualMax && !disabled) {
      onQuantityChange(quantity + 1)
    }
  }

  const isAtMax = quantity >= actualMax;
  const isAtMin = quantity <= 1;
  const isOutOfStock = stock !== undefined && stock <= 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900">Quantity</label>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={decreaseQuantity}
          disabled={isAtMin || disabled || isOutOfStock}
          className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all duration-300 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-center min-w-[60px]">
          <span className="text-xl font-semibold text-gray-900">{quantity}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={increaseQuantity}
          disabled={isAtMax || disabled || isOutOfStock}
          className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Stock status and warnings */}
      {stock !== undefined && (
        <div className="text-sm">
          {stock === 0 ? (
            <p className="text-red-500 font-medium">Out of Stock</p>
          ) : stock <= 5 ? (
            <p className="text-orange-500 font-medium">Only {stock} left!</p>
          ) : (
            <p className="text-green-600 font-medium">In Stock</p>
          )}
        </div>
      )}

      {isAtMax && stock !== undefined && stock > 0 && (
        <p className="text-xs text-amber-600">Maximum quantity reached ({stock})</p>
      )}
      
      {isOutOfStock && (
        <p className="text-xs text-red-600 font-medium">This item is currently out of stock</p>
      )}
    </div>
  )
}
