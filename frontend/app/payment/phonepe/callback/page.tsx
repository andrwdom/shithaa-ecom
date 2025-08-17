'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PhonePeCallbackInner() {
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [tries, setTries] = useState(0)
  const [merchantTransactionId, setMerchantTransactionId] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let stopped = false;
    
    // Get all URL parameters for debugging
    const urlParams = new URLSearchParams(window.location.search)
    const allParams = Object.fromEntries(urlParams.entries())
    console.log('All URL parameters:', allParams)
    
    const transactionId = urlParams.get('merchantTransactionId') || 
                        urlParams.get('transactionId') || 
                        urlParams.get('orderId') ||
                        urlParams.get('id')
    const amount = urlParams.get('amount')
    
    console.log('Extracted transaction ID:', transactionId)
    console.log('Amount:', amount)
    
    if (!transactionId) {
      console.log('No transaction ID found in URL parameters')
      
      // Try to get transaction ID from stored order data
      let storedOrderData = sessionStorage.getItem('pendingOrderData') || 
                           localStorage.getItem('pendingOrderData') ||
                           localStorage.getItem('phonepeOrderData')
      
      if (storedOrderData) {
        try {
          const orderData = JSON.parse(storedOrderData)
          console.log('Found stored order data:', orderData)
          
          // Check if we have a recent payment session
          if (orderData.phonepeTransactionId) {
            console.log('Using stored transaction ID:', orderData.phonepeTransactionId)
            setMerchantTransactionId(orderData.phonepeTransactionId)
            
            // Check payment status for this transaction
            checkPaymentStatusForTransaction(orderData.phonepeTransactionId, orderData)
            return
          }
        } catch (error) {
          console.error('Error parsing stored order data:', error)
        }
      }
      
      // No transaction ID found - redirect to PaymentFailed page with stored data
      console.log('No transaction ID found, redirecting to PaymentFailed page with stored data')
      redirectToPaymentFailed(null, 'Payment was cancelled or interrupted', null, storedOrderData)
      return
    }
    
    setMerchantTransactionId(transactionId)
    
    // Check payment status for the transaction ID from URL
    checkPaymentStatusForTransaction(transactionId, null)
    
    // Set up polling for payment status
    interval = setInterval(() => {
      if (!stopped && tries < 20) {
        setTries(t => t + 1)
        checkPaymentStatusForTransaction(transactionId, null)
      } else if (!stopped) {
        // Payment status could not be confirmed - redirect to PaymentFailed page
        console.log('Payment status could not be confirmed, redirecting to PaymentFailed page')
        const storedOrderData = sessionStorage.getItem('pendingOrderData') || 
                               localStorage.getItem('pendingOrderData') ||
                               localStorage.getItem('phonepeOrderData')
        redirectToPaymentFailed(transactionId, 'Payment status could not be confirmed after multiple attempts', null, storedOrderData)
        return
      }
    }, 3000)
    
    return () => { if (interval) clearInterval(interval) }
  }, [router, tries])

  // Function to check payment status for a specific transaction
  async function checkPaymentStatusForTransaction(transactionId: string, storedOrderData: any) {
    try {
      console.log('Checking payment status for:', transactionId)
      
      // First, try to get order details from our database
      const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/orders/phonepe/${transactionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log('Order lookup response status:', orderRes.status)
      
      if (orderRes.ok) {
        const orderData = await orderRes.json()
        console.log('Order data:', orderData)
        
        if (orderData.success && orderData.order) {
          const order = orderData.order
          console.log('Order found, payment status:', order.paymentStatus)
          
          // Check if order is marked as paid
          if (order.paymentStatus === 'paid' || order.payment === true) {
            setStatus('success')
            setMessage('Payment successful! Your order has been confirmed.')
            setOrderId(transactionId || '')
            setOrderDetails(order)
            localStorage.setItem('lastOrder', JSON.stringify({
              id: transactionId,
              orderSummary: { total: order.amount },
              paymentMethod: 'PhonePe'
            }))
            // Redirect to OrderSummary page with order ID
            setTimeout(() => { 
              router.push(`/order-summary?orderId=${order._id || order.orderId}`)
            }, 2000)
            return
          } else if (order.paymentStatus === 'failed') {
            // Payment failed - redirect to PaymentFailed page
            console.log('Order payment status is failed, redirecting to PaymentFailed page')
            redirectToPaymentFailed(transactionId, 'Payment was marked as failed', order.amount, storedOrderData)
            return
          } else {
            // Order exists but payment status is pending, try PhonePe verification
            console.log('Order found but payment pending, checking PhonePe status...')
          }
        }
      }
      
      // Try to verify payment with PhonePe
      console.log('Attempting PhonePe payment verification...')
      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/verify/${transactionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log('PhonePe verification response status:', verifyRes.status)
      
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json()
        console.log('PhonePe verification response:', verifyData)
        
        if (verifyData.success && verifyData.paymentData) {
          const paymentData = verifyData.paymentData
          console.log('Payment data from PhonePe:', paymentData)
          
          // Check payment status
          const isSuccess = (
            paymentData.code === 'PAYMENT_SUCCESS' ||
            paymentData.code === 'SUCCESS' ||
            paymentData.status === 'SUCCESS'
          )
          
          const isPending = (
            paymentData.code === 'PAYMENT_PENDING' ||
            paymentData.status === 'PENDING'
          )
          
          if (isSuccess) {
            setStatus('success')
            setMessage('Payment successful! Creating your order...')
            setOrderId(paymentData.merchantTransactionId || transactionId)
            
            // Payment successful - create order from payment session
            console.log('Payment successful, creating order from payment session')
            
            try {
              // Try to get order data from multiple storage locations
              let pendingOrderData = storedOrderData || 
                                   sessionStorage.getItem('pendingOrderData') ||
                                   localStorage.getItem('pendingOrderData') ||
                                   localStorage.getItem('phonepeOrderData')
              
              if (!pendingOrderData) {
                console.log('Order data not found in storage, trying to reconstruct...')
                pendingOrderData = reconstructOrderData()
              }
              
              if (pendingOrderData) {
                const orderData = JSON.parse(pendingOrderData)
                console.log('Parsed order data:', orderData)
                
                // Validate that we have the basic data needed
                if (!orderData.shipping?.fullName) {
                  throw new Error('Shipping name is missing')
                }
                if (!orderData.cartItems || orderData.cartItems.length === 0) {
                  throw new Error('Order items are missing')
                }
                if (!orderData.amount) {
                  throw new Error('Total amount is missing')
                }
                
                console.log('Creating order from payment session for transaction:', transactionId)
                
                const createOrderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/create-order`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                  },
                  body: JSON.stringify({ phonepeTransactionId: transactionId })
                })
                
                console.log('Order creation response status:', createOrderRes.status)
                
                if (createOrderRes.ok) {
                  const orderResult = await createOrderRes.json()
                  console.log('Order creation response data:', orderResult)
                  
                  if (orderResult.success && orderResult.order) {
                    setStatus('success')
                    setMessage('Order created successfully! Redirecting to order summary...')
                    setOrderId(orderResult.order._id || orderResult.order.orderId)
                    setOrderDetails(orderResult.order)
                    
                    // Store order details for order summary page
                    localStorage.setItem('lastOrder', JSON.stringify({
                      id: transactionId,
                      orderSummary: { total: orderResult.order.amount || orderResult.order.total },
                      paymentMethod: 'PhonePe'
                    }))
                    
                    // Clear temporary order data after successful order creation
                    clearTemporaryOrderData()
                    
                    // Redirect to OrderSummary page with order ID
                    setTimeout(() => { 
                      router.push(`/order-summary?orderId=${orderResult.order._id || orderResult.order.orderId}`)
                    }, 2000)
                    return
                  } else {
                    throw new Error('Order creation failed: ' + (orderResult.message || 'Unknown error'))
                  }
                } else {
                  const errorData = await createOrderRes.json()
                  throw new Error('Order creation failed: ' + (errorData.message || `HTTP ${createOrderRes.status}`))
                }
              } else {
                throw new Error('Could not retrieve order data for order creation')
              }
            } catch (orderError: any) {
              console.error('Order creation error:', orderError)
              // Order creation failed - redirect to PaymentFailed page
              redirectToPaymentFailed(transactionId, `Order creation failed: ${orderError.message}`, null, storedOrderData)
              return
            }
          } else if (isPending) {
            setStatus('pending')
            setMessage('Processing your payment, please wait...')
          } else {
            // Payment failed - redirect to PaymentFailed page
            console.log('Payment failed, redirecting to PaymentFailed page')
            const failureReason = paymentData.message || 'Payment was not completed'
            const failureAmount = paymentData.amount || null
            
            redirectToPaymentFailed(transactionId, failureReason, failureAmount, storedOrderData)
            return
          }
        } else {
          console.error('PhonePe verification failed:', verifyData)
          // Payment verification failed - redirect to PaymentFailed page
          console.log('Payment verification failed, redirecting to PaymentFailed page')
          redirectToPaymentFailed(transactionId, verifyData.message || 'Payment verification failed', null, storedOrderData)
          return
        }
      } else {
        console.error('PhonePe verification request failed with status:', verifyRes.status)
        // Payment verification request failed - redirect to PaymentFailed page
        console.log('Payment verification request failed, redirecting to PaymentFailed page')
        redirectToPaymentFailed(transactionId, `Payment verification failed (HTTP ${verifyRes.status})`, null, storedOrderData)
        return
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      // Payment verification error - redirect to PaymentFailed page
      console.log('Payment verification error, redirecting to PaymentFailed page')
      redirectToPaymentFailed(transactionId, 'Payment processing error occurred', null, storedOrderData)
      return
    }
  }

  // Function to reconstruct order data from available sources
  function reconstructOrderData() {
    try {
      // Try to reconstruct from cart/buy-now items
      const buyNowItem = localStorage.getItem('phonepeBuyNowItem')
      const cartItems = localStorage.getItem('phonepeCartItems')
      
      if (buyNowItem) {
        const buyNow = JSON.parse(buyNowItem)
        return JSON.stringify({
          isBuyNow: true,
          cartItems: [buyNow],
          amount: buyNow.price * buyNow.quantity,
          email: buyNow.email || 'guest@example.com',
          shipping: {
            fullName: 'Guest User',
            email: buyNow.email || 'guest@example.com',
            phone: '0000000000',
            addressLine1: 'Guest Address',
            addressLine2: '',
            city: 'Guest City',
            state: 'Guest State',
            postalCode: '000000',
            country: 'India'
          },
          userId: null,
          timestamp: Date.now()
        })
      } else if (cartItems) {
        const cart = JSON.parse(cartItems)
        const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
        return JSON.stringify({
          isBuyNow: false,
          cartItems: cart,
          amount: total,
          email: 'guest@example.com',
          shipping: {
            fullName: 'Guest User',
            email: 'guest@example.com',
            phone: '0000000000',
            addressLine1: 'Guest Address',
            addressLine2: '',
            city: 'Guest City',
            state: 'Guest State',
            postalCode: '000000',
            country: 'India'
          },
          userId: null,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Error reconstructing order data:', error)
    }
    return null
  }

  // Function to redirect to payment failed page with proper data
  function redirectToPaymentFailed(transactionId: string | null, reason: string, amount: number | null, storedOrderData: any) {
    try {
      let failureAmount = amount
      let failureItems = []
      let failureEmail = 'guest@example.com'
      
      // Extract data from stored order data if available
      if (storedOrderData) {
        try {
          const orderData = JSON.parse(storedOrderData)
          failureAmount = failureAmount || orderData.amount
          failureItems = orderData.cartItems || []
          failureEmail = orderData.email || orderData.shipping?.email || 'guest@example.com'
          
          // Store the order data for the failure page to use
          localStorage.setItem('failedOrderData', storedOrderData)
        } catch (error) {
          console.error('Error parsing stored order data for failure page:', error)
        }
      }
      
      // Build failure URL with available data
      const failureParams = new URLSearchParams()
      if (transactionId) failureParams.set('transactionId', transactionId)
      failureParams.set('reason', reason)
      if (failureAmount) failureParams.set('amount', failureAmount.toString())
      if (failureItems.length > 0) failureParams.set('items', JSON.stringify(failureItems))
      if (failureEmail) failureParams.set('email', failureEmail)
      
      const failureUrl = `/payment-failed?${failureParams.toString()}`
      console.log('Redirecting to payment failed page:', failureUrl)
      
      // Clear temporary order data since payment failed
      clearTemporaryOrderData()
      
      // Redirect to PaymentFailed page
      router.push(failureUrl)
    } catch (error) {
      console.error('Error redirecting to payment failed page:', error)
      // Fallback redirect
      router.push(`/payment-failed?reason=${encodeURIComponent(reason)}`)
    }
  }

  // Function to clear temporary order data
  function clearTemporaryOrderData() {
    sessionStorage.removeItem('pendingOrderData')
    localStorage.removeItem('pendingOrderData')
    localStorage.removeItem('phonepeOrderData')
    localStorage.removeItem('phonepeBuyNowItem')
    localStorage.removeItem('phonepeCartItems')
    console.log('Cleared temporary order data')
  }

  // Rest of the component remains the same...
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#473C66] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Processing your payment...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we verify your payment status</p>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Payment Processing</p>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
          <p className="mt-4 text-xs text-gray-400">This may take a few minutes. Please don't close this page.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">{message}</p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
          )}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Redirecting to order summary...</p>
            <div className="flex justify-center">
              <Link href="/" className="text-[#473C66] hover:underline">
                Or click here to go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function PhonePeCallback() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="loading loading-spinner loading-lg text-red-600"></div>
      </div>
    }>
      <PhonePeCallbackInner />
    </Suspense>
  )
} 