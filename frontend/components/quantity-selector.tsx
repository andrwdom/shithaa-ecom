"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { getSizeStockInfo, formatStockInfo, getStockStatus } from "@/lib/stock-utils"

interface QuantitySelectorProps {
  quantity: number
  onQuantityChange: (quantity: number) => void
  max?: number
  stock?: number // Raw stock (deprecated, use product and size instead)
  product?: any // Product object with sizes array
  size?: string // Size to check
  disabled?: boolean
}

export default function QuantitySelector({ quantity, onQuantityChange, max = 10, stock, product, size, disabled = false }: QuantitySelectorProps) {
  // Get available stock (accounting for reserved stock)
  const stockInfo = product && size ? getSizeStockInfo(product, size) : { available: stock || 0 };
  const availableStock = stockInfo.available;
  
  // Use available stock as the maximum if available, otherwise fall back to max prop
  const actualMax = availableStock > 0 ? availableStock : max;
  
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
  const isOutOfStock = availableStock <= 0;
  const stockStatus = getStockStatus(stockInfo);

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
      {(availableStock > 0 || isOutOfStock) && (
        <div className="text-sm">
          <p className={`font-medium ${
            stockStatus === 'out-of-stock' ? 'text-red-500' :
            stockStatus === 'low-stock' ? 'text-orange-500' :
            'text-green-600'
          }`}>
            {formatStockInfo(stockInfo)}
          </p>
        </div>
      )}

      {isAtMax && availableStock > 0 && (
        <p className="text-xs text-amber-600">Maximum quantity reached ({availableStock})</p>
      )}
      
      {isOutOfStock && (
        <p className="text-xs text-red-600 font-medium">This item is currently out of stock</p>
      )}
    </div>
  )
}
