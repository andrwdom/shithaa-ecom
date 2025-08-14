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
      console.error('No transaction ID found in URL parameters')
      
      // Emergency fallback: Try to find the most recent pending order
      const checkRecentOrders = async () => {
        try {
          console.log('Trying emergency fallback - checking recent orders...')
          const recentOrderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/orders/recent-pending`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (recentOrderRes.ok) {
            const recentOrderData = await recentOrderRes.json()
            if (recentOrderData.success && recentOrderData.order) {
              console.log('Found recent pending order:', recentOrderData.order)
              setMerchantTransactionId(recentOrderData.order.phonepeTransactionId)
              
              // Check if this order is actually paid
              if (recentOrderData.order.paymentStatus === 'paid' || recentOrderData.order.payment === true) {
                setStatus('success')
                setMessage('Payment successful! Your order has been confirmed.')
                setOrderId(recentOrderData.order.phonepeTransactionId)
                setOrderDetails(recentOrderData.order)
                localStorage.setItem('lastOrder', JSON.stringify({
                  id: recentOrderData.order.phonepeTransactionId,
                  orderSummary: { total: recentOrderData.order.amount },
                  paymentMethod: 'PhonePe'
                }))
                // Redirect to OrderSummary page with order ID
                setTimeout(() => { 
                  router.push(`/order-summary?orderId=${recentOrderData.order._id || recentOrderData.order.orderId}`)
                }, 2000)
                return
              }
            }
          }
        } catch (fallbackError) {
          console.error('Emergency fallback failed:', fallbackError)
        }
        
        // No transaction ID found - redirect to PaymentFailed page
        console.log('No transaction ID found, redirecting to PaymentFailed page')
        const failureReason = 'Invalid payment response - No transaction ID found'
        
        // Clear any temporary order data since payment failed
        sessionStorage.removeItem('pendingOrderData')
        localStorage.removeItem('pendingOrderData')
        localStorage.removeItem('phonepeOrderData')
        localStorage.removeItem('phonepeBuyNowItem')
        localStorage.removeItem('phonepeCartItems')
        
        // Redirect to PaymentFailed page with details
        const failureUrl = `/payment-failed?reason=${encodeURIComponent(failureReason)}`
        router.push(failureUrl)
        return
      }
      
      checkRecentOrders()
      return
    }
    
    setMerchantTransactionId(transactionId)
    
    async function checkPaymentStatus() {
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
              if (interval) clearInterval(interval)
              stopped = true
              return
            } else if (order.paymentStatus === 'failed') {
              // Payment failed - redirect to PaymentFailed page
              console.log('Order payment status is failed, redirecting to PaymentFailed page')
              const failureReason = 'Payment was marked as failed'
              
              // Clear any temporary order data since payment failed
              sessionStorage.removeItem('pendingOrderData')
              localStorage.removeItem('pendingOrderData')
              localStorage.removeItem('phonepeOrderData')
              localStorage.removeItem('phonepeBuyNowItem')
              localStorage.removeItem('phonepeCartItems')
              
              // Redirect to PaymentFailed page with details
              const failureUrl = `/payment-failed?transactionId=${transactionId}&reason=${encodeURIComponent(failureReason)}`
              router.push(failureUrl)
              return
            } else {
              // Order exists but payment status is pending, try PhonePe verification
              console.log('Order found but payment pending, checking PhonePe status...')
            }
          }
        }
        
        // If order lookup failed or payment is pending, try PhonePe verification
        console.log('Attempting PhonePe verification...')
        const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/verify/${transactionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        console.log('PhonePe verification response status:', verifyRes.status)
        
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          console.log('PhonePe verification response:', verifyData)
          
          if (verifyData.success && verifyData.data) {
            const paymentData = verifyData.data
            
            // Handle different success conditions
            const isSuccess = (
              (paymentData.code === 'PAYMENT_SUCCESS' && paymentData.paymentState === 'COMPLETED') ||
              (paymentData.code === 'PAYMENT_SUCCESS' && paymentData.state === 'COMPLETED') ||
              (paymentData.paymentState === 'COMPLETED') ||
              (paymentData.state === 'COMPLETED')
            )
            
            const isPending = (
              paymentData.paymentState === 'PENDING' || 
              paymentData.state === 'PENDING' ||
              paymentData.code === 'PAYMENT_PENDING'
            )
            
            if (isSuccess) {
              setStatus('success')
              setMessage('Payment successful! Creating your order...')
              setOrderId(paymentData.merchantTransactionId || transactionId)
              
              // Payment successful - create order from payment session
              console.log('Payment successful, creating order from payment session')
              
              try {
                // Try to get order data from multiple storage locations
                let pendingOrderData = sessionStorage.getItem('pendingOrderData')
                
                if (!pendingOrderData) {
                  console.log('Order data not found in sessionStorage, checking localStorage backups...')
                  pendingOrderData = localStorage.getItem('pendingOrderData')
                }
                
                if (!pendingOrderData) {
                  console.log('Order data not found in pendingOrderData, checking phonepeOrderData...')
                  pendingOrderData = localStorage.getItem('phonepeOrderData')
                }
                
                if (!pendingOrderData) {
                  console.log('Order data not found in phonepeOrderData, trying to reconstruct from cart/buy-now...')
                  // Try to reconstruct from cart/buy-now items
                  const buyNowItem = localStorage.getItem('phonepeBuyNowItem')
                  const cartItems = localStorage.getItem('phonepeCartItems')
                  
                  if (buyNowItem) {
                    const buyNow = JSON.parse(buyNowItem)
                    pendingOrderData = JSON.stringify({
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
                    console.log('Reconstructed order data from buy-now item:', pendingOrderData)
                  } else if (cartItems) {
                    const cart = JSON.parse(cartItems)
                    const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
                    pendingOrderData = JSON.stringify({
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
                    console.log('Reconstructed order data from cart items:', pendingOrderData)
                  }
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
                  console.log('Order creation response headers:', Object.fromEntries(createOrderRes.headers.entries()))
                  
                  if (createOrderRes.ok) {
                    const orderResult = await createOrderRes.json()
                    console.log('Order creation response data:', orderResult)
                    
                    if (orderResult.success) {
                      console.log('Order created successfully:', orderResult.order)
                      
                      // Clear cart and buy-now items after successful order creation
                      if (orderData.isBuyNow) {
                        // Clear buy-now item
                        sessionStorage.removeItem('buyNowItem')
                        localStorage.removeItem('buyNowItem')
                        localStorage.removeItem('phonepeBuyNowItem')
                        console.log('Cleared buy-now items')
                      } else {
                        // Clear cart items
                        localStorage.removeItem('cartItems')
                        sessionStorage.removeItem('cartItems')
                        localStorage.removeItem('phonepeCartItems')
                        console.log('Cleared cart items')
                      }
                      
                      // Clear pending order data
                      sessionStorage.removeItem('pendingOrderData')
                      localStorage.removeItem('pendingOrderData')
                      localStorage.removeItem('phonepeOrderData')
                      console.log('Cleared pending order data')
                      
                      setMessage('Payment successful! Your order has been created and confirmed.')
                      setOrderDetails(orderResult.order)
                      
                      localStorage.setItem('lastOrder', JSON.stringify({
                        id: orderResult.order._id || transactionId,
                        orderSummary: { total: orderResult.order.totalAmount },
                        paymentMethod: 'PhonePe'
                      }))
                      
                      // Redirect to OrderSummary page with order ID
                      setTimeout(() => { 
                        router.push(`/order-summary?orderId=${orderResult.order._id || orderResult.order.orderId}`)
                      }, 2000)
                    } else {
                      console.error('Order creation failed with success: false:', orderResult)
                      console.error('Full order result:', JSON.stringify(orderResult, null, 2))
                      throw new Error(orderResult.message || 'Failed to create order')
                    }
                  } else {
                    let errorData
                    let responseText = ''
                    try {
                      errorData = await createOrderRes.json()
                    } catch (parseError) {
                      errorData = { message: 'Failed to parse error response' }
                    }
                    try {
                      responseText = await createOrderRes.text()
                    } catch (textError) {
                      responseText = 'Failed to get response text'
                    }
                    
                    console.error('=== ORDER CREATION FAILED ===')
                    console.error('Status:', createOrderRes.status)
                    console.error('Status Text:', createOrderRes.statusText)
                    console.error('Headers:', Object.fromEntries(createOrderRes.headers.entries()))
                    console.error('Error Data:', errorData)
                    console.error('Response Text:', responseText)
                    console.error('Transaction ID:', transactionId)
                    console.error('=== END ORDER CREATION FAILED ===')
                    
                    throw new Error(errorData.message || `Failed to create order (${createOrderRes.status})`)
                  }
                } else {
                  console.error('No order data found in any storage location')
                  throw new Error('No order data found')
                }
              } catch (orderError) {
                console.error('Order creation failed:', orderError)
                // Order creation failed - redirect to PaymentFailed page
                console.log('Order creation failed, redirecting to PaymentFailed page')
                const failureReason = 'Payment successful but order creation failed. Please contact support.'
                
                // Clear any temporary order data since order creation failed
                sessionStorage.removeItem('pendingOrderData')
                localStorage.removeItem('pendingOrderData')
                localStorage.removeItem('phonepeOrderData')
                localStorage.removeItem('phonepeBuyNowItem')
                localStorage.removeItem('phonepeCartItems')
                
                // Redirect to PaymentFailed page with details
                const failureUrl = `/payment-failed?transactionId=${transactionId}&reason=${encodeURIComponent(failureReason)}`
                router.push(failureUrl)
                return
              }
              
              if (interval) clearInterval(interval)
              stopped = true
            } else if (isPending) {
              setStatus('pending')
              setMessage('Processing your payment, please wait...')
            } else {
              // Payment failed - redirect to PaymentFailed page
              console.log('Payment failed, redirecting to PaymentFailed page')
              const failureReason = paymentData.message || 'Payment was not completed'
              const failureAmount = paymentData.amount || amount
              
              // Clear any temporary order data since payment failed
              sessionStorage.removeItem('pendingOrderData')
              localStorage.removeItem('pendingOrderData')
              localStorage.removeItem('phonepeOrderData')
              localStorage.removeItem('phonepeBuyNowItem')
              localStorage.removeItem('phonepeCartItems')
              
              // Redirect to PaymentFailed page with details
              const failureUrl = `/payment-failed?transactionId=${transactionId}&reason=${encodeURIComponent(failureReason)}&amount=${failureAmount}`
              router.push(failureUrl)
              return
            }
          } else {
            console.error('PhonePe verification failed:', verifyData)
            // Payment verification failed - redirect to PaymentFailed page
            console.log('Payment verification failed, redirecting to PaymentFailed page')
            const failureReason = verifyData.message || 'Payment verification failed'
            
            // Clear any temporary order data since payment failed
            sessionStorage.removeItem('pendingOrderData')
            localStorage.removeItem('pendingOrderData')
            localStorage.removeItem('phonepeOrderData')
            localStorage.removeItem('phonepeBuyNowItem')
            localStorage.removeItem('phonepeCartItems')
            
            // Redirect to PaymentFailed page with details
            const failureUrl = `/payment-failed?transactionId=${transactionId}&reason=${encodeURIComponent(failureReason)}`
            router.push(failureUrl)
            return
          }
        } else {
          console.error('PhonePe verification request failed with status:', verifyRes.status)
          // Payment verification request failed - redirect to PaymentFailed page
          console.log('Payment verification request failed, redirecting to PaymentFailed page')
          const failureReason = `Payment verification failed (HTTP ${verifyRes.status})`
          
          // Clear any temporary order data since payment failed
          sessionStorage.removeItem('pendingOrderData')
          localStorage.removeItem('pendingOrderData')
          localStorage.removeItem('phonepeOrderData')
          localStorage.removeItem('phonepeBuyNowItem')
          localStorage.removeItem('phonepeCartItems')
          
          // Redirect to PaymentFailed page with details
          const failureUrl = `/payment-failed?transactionId=${transactionId}&reason=${encodeURIComponent(failureReason)}`
          router.push(failureUrl)
          return
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        // Payment verification error - redirect to PaymentFailed page
        console.log('Payment verification error, redirecting to PaymentFailed page')
        const failureReason = 'Payment processing error occurred'
        
        // Clear any temporary order data since payment failed
        sessionStorage.removeItem('pendingOrderData')
        localStorage.removeItem('pendingOrderData')
        localStorage.removeItem('phonepeOrderData')
        localStorage.removeItem('phonepeBuyNowItem')
        localStorage.removeItem('phonepeCartItems')
        
        // Redirect to PaymentFailed page with details
        const failureUrl = `/payment-failed?transactionId=${transactionId}&reason=${encodeURIComponent(failureReason)}`
        router.push(failureUrl)
        return
      }
    }
    
    // Start checking payment status
    checkPaymentStatus()
    
    // Set up polling for payment status
    interval = setInterval(() => {
      if (!stopped && tries < 20) {
        setTries(t => t + 1)
        checkPaymentStatus()
      } else if (!stopped) {
        // Payment status could not be confirmed - redirect to PaymentFailed page
        console.log('Payment status could not be confirmed, redirecting to PaymentFailed page')
        const failureReason = 'Payment status could not be confirmed after multiple attempts'
        
        // Clear any temporary order data since payment failed
        sessionStorage.removeItem('pendingOrderData')
        localStorage.removeItem('pendingOrderData')
        localStorage.removeItem('phonepeOrderData')
        localStorage.removeItem('phonepeBuyNowItem')
        localStorage.removeItem('phonepeCartItems')
        
        // Redirect to PaymentFailed page with details
        const failureUrl = `/payment-failed?transactionId=${merchantTransactionId || 'unknown'}&reason=${encodeURIComponent(failureReason)}`
        router.push(failureUrl)
        return
      }
    }, 3000)
    
    return () => { if (interval) clearInterval(interval) }
  }, [router, tries])



  if (status === 'loading' || status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="loading loading-spinner loading-lg text-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Processing Payment...</h2>
          <p className="text-gray-500">{message || 'Please wait while we verify your payment.'}</p>
          {tries > 0 && (
            <p className="text-sm text-gray-400 mt-2">Attempt {tries}/20</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'success' ? (
          <>
            <div className="text-green-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="#e6f9ea" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l2 2l4-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700">
                <strong>Order ID:</strong> {orderId}
              </p>
              {orderDetails && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-green-700">
                    <strong>Amount:</strong> ₹{orderDetails.amount}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Status:</strong> {orderDetails.status}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Payment Method:</strong> PhonePe
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Order Date:</strong> {new Date(orderDetails.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Link 
                href={`/order-summary?orderId=${orderDetails?._id || orderDetails?.orderId || orderId}`}
                className="btn btn-success w-full"
              >
                View Order Details
              </Link>
              <Link 
                href="/" 
                className="btn btn-outline w-full"
              >
                Continue Shopping
              </Link>
            </div>
          </>
                 ) : status === 'pending' ? (
           <>
             <div className="text-blue-500 mb-4">
               <svg className="w-16 h-16 mx-auto animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="#eff6ff" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
               </svg>
             </div>
             <h1 className="text-2xl font-bold text-blue-700 mb-2">Processing Payment</h1>
             <p className="text-gray-600 mb-4">{message}</p>
             <div className="bg-blue-50 rounded-lg p-4 mb-6">
               <p className="text-sm text-blue-700">
                 <strong>Transaction ID:</strong> {merchantTransactionId || orderId}
               </p>
               <p className="text-sm text-blue-700 mt-2">
                 Please wait while we confirm your payment and create your order...
               </p>
             </div>
             <div className="space-y-3">
               <div className="btn btn-outline w-full cursor-not-allowed opacity-50">
                 Processing...
               </div>
             </div>
           </>
         ) : null}
      </div>
    </div>
  )
}

export default function PhonePeCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="loading loading-spinner loading-lg text-blue-600"></div></div>}>
      <PhonePeCallbackInner />
    </Suspense>
  )
} 