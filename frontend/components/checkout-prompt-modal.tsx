"use client"

import { CheckCircle, ShoppingBag, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface CheckoutPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onViewCart: () => void
  onCheckout: () => void
  product: {
    name: string
    price: number
    image: string
    size: string
    quantity: number
  } | null
}

export default function CheckoutPromptModal({
  isOpen,
  onClose,
  onViewCart,
  onCheckout,
  product,
}: CheckoutPromptModalProps) {
  if (!isOpen || !product) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all duration-300 scale-100">
          <CardContent className="p-6 text-center space-y-6">
            {/* Success Icon */}
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Added to Cart!</h3>
              <p className="text-gray-600">Your item has been successfully added to your cart.</p>
            </div>

            {/* Product Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={64}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Size: {product.size} | Qty: {product.quantity}
                  </p>
                  <p className="font-bold text-gray-900 mt-1">₹{product.price.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onCheckout}
                size="lg"
                className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white py-3 rounded-xl font-semibold"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={onViewCart}
                  variant="outline"
                  className="border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white bg-transparent"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  View Cart
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              By placing your order, you agree to our
              <a href="/terms" className="underline ml-1 hover:text-[rgb(71,60,102)]">Terms and Conditions</a>
              and
              <a href="/privacy-policy" className="underline ml-1 hover:text-[rgb(71,60,102)]">Privacy Policy</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
