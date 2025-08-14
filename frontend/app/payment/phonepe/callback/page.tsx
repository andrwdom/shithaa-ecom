'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PhonePeCallbackInner() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [tries, setTries] = useState(0)
  const [merchantTransactionId, setMerchantTransactionId] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let stopped = false;
    
    // Get all URL parameters for debugging
    const urlParams = new URLSearchParams(window.location.search)
    const allParams = Object.fromEntries(urlParams.entries())
    console.log('All URL parameters:', allParams)
    setDebugInfo(JSON.stringify(allParams, null, 2))
    
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
                setTimeout(() => { router.push('/account') }, 3000)
                return
              }
            }
          }
        } catch (fallbackError) {
          console.error('Emergency fallback failed:', fallbackError)
        }
        
        setStatus('failed')
        setMessage('Invalid payment response - No transaction ID found')
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
              setTimeout(() => { router.push('/account') }, 3000)
              if (interval) clearInterval(interval)
              stopped = true
              return
            } else if (order.paymentStatus === 'failed') {
              setStatus('failed')
              setMessage('Payment failed. Please try again.')
              if (interval) clearInterval(interval)
              stopped = true
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
              
              // Debug: Check what's available in storage
              console.log('=== STORAGE DEBUG ===')
              console.log('SessionStorage content:', {
                pendingOrderData: sessionStorage.getItem('pendingOrderData'),
                buyNowItem: sessionStorage.getItem('buyNowItem'),
                cartItems: sessionStorage.getItem('cartItems')
              })
              console.log('LocalStorage content:', {
                pendingOrderData: localStorage.getItem('pendingOrderData'),
                buyNowItem: localStorage.getItem('buyNowItem'),
                cartItems: localStorage.getItem('cartItems')
              })
              console.log('=== END STORAGE DEBUG ===')
              
              // Direct order creation - no webhook dependency
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
                  
                  // Create order using the exact format expected by createStructuredOrder
                  const orderPayload = {
                    userInfo: {
                      userId: orderData.userId,
                      name: orderData.shipping.fullName,
                      email: orderData.email
                    },
                    shippingInfo: {
                      fullName: orderData.shipping.fullName,
                      email: orderData.email,
                      phone: orderData.shipping.phone,
                      addressLine1: orderData.shipping.addressLine1,
                      addressLine2: orderData.shipping.addressLine2 || '',
                      city: orderData.shipping.city,
                      state: orderData.shipping.state,
                      postalCode: orderData.shipping.postalCode,
                      country: orderData.shipping.country || 'India'
                    },
                    items: orderData.cartItems.map((item: any) => ({
                      _id: item._id,
                      name: item.name,
                      quantity: item.quantity,
                      price: item.price,
                      image: item.image,
                      size: item.size
                    })),
                    totalAmount: orderData.amount,
                    paymentStatus: 'paid',
                    phonepeTransactionId: transactionId,
                    paymentMethod: 'PhonePe',
                    createdAt: new Date().toISOString()
                  }
                  
                  // Validate required fields
                  if (!orderPayload.userInfo.userId) {
                    console.warn('User ID is missing, proceeding without user ID')
                    delete orderPayload.userInfo.userId
                  }
                  if (!orderPayload.userInfo.email) {
                    throw new Error('User email is missing')
                  }
                  if (!orderPayload.shippingInfo.fullName) {
                    throw new Error('Shipping name is missing')
                  }
                  if (!orderPayload.items || orderPayload.items.length === 0) {
                    throw new Error('Order items are missing')
                  }
                  if (!orderPayload.totalAmount) {
                    throw new Error('Total amount is missing')
                  }
                  
                  console.log('Sending order creation request with payload:', orderPayload)
                  
                  const createOrderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/orders`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify(orderPayload)
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
                      
                      setTimeout(() => { router.push('/order-success') }, 3000)
                    } else {
                      console.error('Order creation failed with success: false:', orderResult)
                      throw new Error(orderResult.message || 'Failed to create order')
                    }
                  } else {
                    let errorData
                    try {
                      errorData = await createOrderRes.json()
                    } catch (parseError) {
                      errorData = { message: 'Failed to parse error response' }
                    }
                    console.error('Order creation failed with status:', createOrderRes.status, 'Error:', errorData)
                    console.error('Response text:', await createOrderRes.text())
                    throw new Error(errorData.message || `Failed to create order (${createOrderRes.status})`)
                  }
                } else {
                  console.error('No order data found in any storage location')
                  throw new Error('No order data found')
                }
              } catch (orderError) {
                console.error('Order creation failed:', orderError)
                setMessage('Payment successful but order creation failed. Please contact support.')
                // Still redirect to account page to show payment success
                setTimeout(() => { router.push('/account') }, 5000)
              }
              
              if (interval) clearInterval(interval)
              stopped = true
            } else if (isPending) {
              setStatus('pending')
              setMessage('Processing your payment, please wait...')
            } else {
              setStatus('failed')
              setMessage('Payment failed. Please try again.')
              if (interval) clearInterval(interval)
              stopped = true
            }
          } else {
            console.error('PhonePe verification failed:', verifyData)
            setStatus('failed')
            setMessage(verifyData.message || 'Payment verification failed. Please contact support.')
            if (interval) clearInterval(interval)
            stopped = true
          }
        } else {
          console.error('PhonePe verification request failed with status:', verifyRes.status)
          setStatus('failed')
          setMessage('Payment verification failed. Please contact support.')
          if (interval) clearInterval(interval)
          stopped = true
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        setStatus('failed')
        setMessage('Payment processing error. Please contact support.')
        if (interval) clearInterval(interval)
        stopped = true
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
        setStatus('failed')
        setMessage('Payment status could not be confirmed. Please contact support.')
        if (interval) clearInterval(interval)
      }
    }, 3000)
    
    return () => { if (interval) clearInterval(interval) }
  }, [router, tries])

  const handleManualFix = async () => {
    if (!merchantTransactionId) {
      alert('Transaction ID not found')
      return
    }
    
    try {
      // Try the quick fix endpoint first
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/quick-fix/${merchantTransactionId}`, {
        method: 'POST'
      })
      if (res.ok) {
        alert('Order manually marked as paid! Please refresh the page.')
        window.location.reload()
        return
      }
      
      // Fallback to test-success endpoint
      const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/test-success/${merchantTransactionId}`, {
        method: 'POST'
      })
      if (fallbackRes.ok) {
        alert('Order manually marked as paid! Please refresh the page.')
        window.location.reload()
      } else {
        const errorData = await fallbackRes.json()
        alert(`Failed to mark order as paid: ${errorData.message || 'Unknown error'}`)
      }
    } catch (err) {
      alert('Failed to mark order as paid')
    }
  }

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
                href="/order-success" 
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
        ) : (
          <>
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="#fee2e2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
              <div className="bg-gray-100 p-4 rounded mb-4 text-left">
                <p className="text-xs text-gray-600 mb-2">Debug Info (URL Parameters):</p>
                <pre className="text-xs text-gray-800 overflow-auto">{debugInfo}</pre>
              </div>
            )}
            
            <div className="space-y-3">
              <Link 
                href="/checkout" 
                className="btn btn-primary w-full"
              >
                Try Again
              </Link>
              <Link 
                href="/" 
                className="btn btn-outline w-full"
              >
                Back to Home
              </Link>
              {merchantTransactionId && (
                <button
                  onClick={handleManualFix}
                  className="btn btn-warning w-full text-sm"
                >
                  Manual Fix (If Payment Actually Succeeded)
                </button>
              )}
              <Link 
                href="/payment/phonepe/debug" 
                className="btn btn-info w-full text-sm"
              >
                Debug Payment
              </Link>
            </div>
          </>
        )}
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