'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, RefreshCw, ShoppingBag, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="loading loading-spinner loading-lg text-red-600"></div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  )
}

function PaymentFailedContent() {
  const params = useSearchParams()
  const router = useRouter()
  const transactionId = params.get('transactionId')
  const reason = params.get('reason') || 'Payment was not completed'
  const amount = params.get('amount')
  const itemsParam = params.get('items')
  const email = params.get('email')
  
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [orderAmount, setOrderAmount] = useState<number | null>(null)
  const [orderEmail, setOrderEmail] = useState<string>('')

  // Parse items and amount from URL parameters
  useEffect(() => {
    if (itemsParam) {
      try {
        const items = JSON.parse(itemsParam)
        setOrderItems(Array.isArray(items) ? items : [])
      } catch (error) {
        console.error('Error parsing items parameter:', error)
      }
    }
    
    if (amount) {
      setOrderAmount(parseFloat(amount))
    }
    
    if (email) {
      setOrderEmail(email)
    }
  }, [itemsParam, amount, email])

  // Try to get additional order data from localStorage
  useEffect(() => {
    const failedOrderData = localStorage.getItem('failedOrderData')
    if (failedOrderData) {
      try {
        const orderData = JSON.parse(failedOrderData)
        if (orderData.cartItems && !orderItems.length) {
          setOrderItems(orderData.cartItems)
        }
        if (orderData.amount && !orderAmount) {
          setOrderAmount(orderData.amount)
        }
        if (orderData.email && !orderEmail) {
          setOrderEmail(orderData.email)
        }
      } catch (error) {
        console.error('Error parsing failed order data:', error)
      }
    }
  }, [orderItems.length, orderAmount, orderEmail])

  // Clear any temporary order data since payment failed
  useEffect(() => {
    // Clear all temporary order data to prevent false orders
    sessionStorage.removeItem('pendingOrderData')
    localStorage.removeItem('pendingOrderData')
    localStorage.removeItem('phonepeOrderData')
    localStorage.removeItem('phonepeBuyNowItem')
    localStorage.removeItem('phonepeCartItems')
    
    console.log('Cleared temporary order data due to payment failure')
  }, [])

  const handleTryAgain = () => {
    // Navigate back to checkout with the same items
    if (orderItems.length > 0) {
      // Store the items for checkout to use
      const checkoutData = {
        items: orderItems,
        amount: orderAmount,
        email: orderEmail,
        timestamp: Date.now()
      }
      localStorage.setItem('retryOrderData', JSON.stringify(checkoutData))
      router.push('/checkout')
    } else {
      router.push('/')
    }
  }

  const handleContinueShopping = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </button>
        </div>

        {/* Failure Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-red-50 p-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600">{reason}</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {transactionId && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Transaction ID:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{transactionId}</span>
                </div>
              )}
              
              {orderAmount && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Amount:</span>
                  <span className="text-lg font-medium text-gray-900">₹{orderAmount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">Status:</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Failed
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">Reason:</span>
                <span className="text-gray-600">{reason}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Summary */}
        {orderItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gray-50 p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">What You Were Trying to Buy</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500">Size: {item.size} • Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-gray-900">₹{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              {orderAmount && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-lg font-bold text-gray-900">₹{orderAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What Happens Next */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-blue-50 p-4 border-b">
            <h2 className="text-lg font-semibold text-blue-900">What Happens Next?</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">No Charges Made</h3>
                  <p className="text-sm text-gray-600">Your account has not been charged. The payment was not completed.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Items Still Available</h3>
                  <p className="text-sm text-gray-600">The items you wanted to purchase are still available in your cart.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Try Again or Contact Support</h3>
                  <p className="text-sm text-gray-600">You can try the payment again or contact our support team if the issue persists.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleTryAgain}
            className="w-full bg-[#473C66] hover:bg-[#473C66]/90 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Payment Again
          </button>
          
          <button
            onClick={handleContinueShopping}
            className="w-full bg-white border-2 border-[#473C66] text-[#473C66] hover:bg-[#473C66] hover:text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            Continue Shopping
          </button>
        </div>

        {/* Support Information */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Need help? Contact our support team</p>
          <div className="flex justify-center gap-4 text-sm">
            <a href="mailto:support@shithaa.in" className="text-[#473C66] hover:underline">
              support@shithaa.in
            </a>
            <span className="text-gray-300">|</span>
            <a href="tel:+919876543210" className="text-[#473C66] hover:underline">
              +91 98765 43210
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 