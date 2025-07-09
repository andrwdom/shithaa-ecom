"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface QuantitySelectorProps {
  quantity: number
  onQuantityChange: (quantity: number) => void
  max?: number
}

export default function QuantitySelector({ quantity, onQuantityChange, max = 10 }: QuantitySelectorProps) {
  const decreaseQuantity = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1)
    }
  }

  const increaseQuantity = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1)
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900">Quantity</label>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={decreaseQuantity}
          disabled={quantity <= 1}
          className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all duration-300 bg-transparent"
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
          disabled={quantity >= max}
          className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {quantity >= max && <p className="text-xs text-amber-600">Maximum quantity reached</p>}
    </div>
  )
}
