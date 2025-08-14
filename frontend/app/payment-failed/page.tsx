'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, RefreshCw, ShoppingBag, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Failure Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-lg text-gray-600">Your payment could not be processed. No charges were made to your account.</p>
        </div>

        {/* Failure Details Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Payment Details
            </h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {transactionId && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Transaction ID:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{transactionId}</span>
                </div>
              )}
              
              {amount && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Amount:</span>
                  <span className="text-lg font-medium text-gray-900">₹{amount}</span>
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

        {/* What Happens Next */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-blue-50 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">What Happens Next?</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>No charges were made to your account</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Your cart items are still available</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>You can try the payment again or continue shopping</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>If you continue to have issues, please contact our support team</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/checkout"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#473C66] text-white font-semibold rounded-lg hover:bg-[#3a3054] transition-colors shadow-md"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </Link>
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            Continue Shopping
          </Link>
        </div>

        {/* Support Information */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact our support team at support@shithaa.in</p>
          <p className="mt-1">Reference Transaction ID: {transactionId || 'N/A'}</p>
        </div>
      </div>
    </div>
  )
} 