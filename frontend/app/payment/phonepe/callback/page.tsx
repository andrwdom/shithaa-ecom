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
    
    // Function to check payment status for a specific transaction
    async function checkPaymentStatusForTransaction(transactionId: string, storedOrderData: any) {
      try {
        console.log('Checking payment status for:', transactionId)
        
        // REMOVED ORDER LOOKUP - Only verify payment directly
        // Try to verify payment with PhonePe - ENHANCED WITH WEBHOOK AWARENESS
        console.log('Attempting PhonePe payment verification...')
        
        // First, wait a bit for webhook to potentially update the status
        if (tries === 0) {
          console.log('First verification attempt - waiting for webhook...')
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds for webhook
        }
        
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
            console.log('Payment data from PhonePe:', paymentData)
            
            // Check payment status - ENHANCED LOGIC
            const isSuccess = (
              paymentData.code === 'PAYMENT_SUCCESS' ||
              paymentData.code === 'SUCCESS' ||
              paymentData.status === 'SUCCESS' ||
              paymentData.paymentState === 'COMPLETED' ||
              paymentData.state === 'COMPLETED'
            )
            
            const isPending = (
              paymentData.code === 'PAYMENT_PENDING' ||
              paymentData.status === 'PENDING' ||
              paymentData.paymentState === 'PENDING' ||
              paymentData.state === 'PENDING'
            )
           
            if (isSuccess) {
              // 🔑 SIMPLIFIED LOGIC:
              // 1. Stop polling immediately.
              // 2. Set status to success to show a confirmation message.
              // 3. Redirect to the order success page with the transactionId.
              // The success page will be responsible for fetching the final order details.
              // This is more robust and avoids the race condition that caused the previous error.
              if (interval) clearInterval(interval);
              stopped = true;
              setStatus('success');
              setMessage('Payment successful! Redirecting to your order summary...');
              
              // Redirect to the success page, which will handle fetching the order.
              setTimeout(() => {
                router.push(`/order-success?transactionId=${transactionId}`);
              }, 1500); // Wait 1.5 seconds before redirecting
              
              return; // Stop further processing

            } else if (isPending) {
              setStatus('pending')
              setMessage('Processing your payment, please wait...')
            } else {
              // Payment failed - redirect to PaymentFailed page
              console.log('Payment failed, redirecting to PaymentFailed page')
              const failureReason = paymentData.message || 'Payment was not completed'
              // 🔧 FIX: Convert amount from paise to rupees (PhonePe returns amount in paise)
              const failureAmount = paymentData.amount ? paymentData.amount / 100 : null
              
              redirectToPaymentFailed(transactionId, failureReason, failureAmount, storedOrderData)
              return
            }
          } else {
            console.error('PhonePe verification failed:', verifyData)
            // Payment verification failed - redirect to PaymentFailed page
            console.log('Payment verification failed, redirecting to PaymentFailed page')
            
            // Enhanced error logging
            console.log('🔍 VERIFICATION FAILURE DETAILS:', {
              success: verifyData.success,
              message: verifyData.message,
              data: verifyData.data,
              fullResponse: verifyData,
              transactionId: transactionId
            })
            
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
    
    // Set up polling for payment status - INCREASED RETRY COUNT AND DELAY
    interval = setInterval(() => {
      if (!stopped && tries < 30) { // Increased from 20 to 30 tries
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
    }, 5000) // Increased from 3000ms to 5000ms to give webhook more time
    
    return () => { if (interval) clearInterval(interval) }
  }, [router, tries])

  // Function to reconstruct order data from available sources
  function reconstructOrderData() {
    try {
      // Try to reconstruct from cart/buy-now items
      const buyNowItem = localStorage.getItem('phonepeBuyNowItem')
      const cartItems = localStorage.getItem('phonepeCartItems')
      const pendingOrderData = localStorage.getItem('pendingOrderData')
      
      // PRIORITY 1: Use pendingOrderData if available (most complete)
      if (pendingOrderData) {
        try {
          const parsed = JSON.parse(pendingOrderData)
          console.log('Using pendingOrderData for reconstruction:', parsed)
          return pendingOrderData
        } catch (error) {
          console.error('Error parsing pendingOrderData:', error)
        }
      }
      
      // PRIORITY 2: Use phonepeOrderData if available
      const phonepeOrderData = localStorage.getItem('phonepeOrderData')
      if (phonepeOrderData) {
        try {
          const parsed = JSON.parse(phonepeOrderData)
          console.log('Using phonepeOrderData for reconstruction:', parsed)
          return phonepeOrderData
        } catch (error) {
          console.error('Error parsing phonepeOrderData:', error)
        }
      }
      
      // PRIORITY 3: Reconstruct from buy-now item
      if (buyNowItem) {
        const buyNow = JSON.parse(buyNowItem)
        console.log('Reconstructing from buy-now item:', buyNow)
        return JSON.stringify({
          isBuyNow: true,
          cartItems: [buyNow],
          amount: buyNow.price * buyNow.quantity,
          email: buyNow.email || 'guest@example.com',
          shipping: {
            fullName: buyNow.shipping?.fullName || 'Guest User',
            email: buyNow.email || 'guest@example.com',
            phone: buyNow.shipping?.phone || '0000000000',
            addressLine1: buyNow.shipping?.addressLine1 || 'Guest Address',
            addressLine2: buyNow.shipping?.addressLine2 || '',
            city: buyNow.shipping?.city || 'Guest City',
            state: buyNow.shipping?.state || 'Guest State',
            postalCode: buyNow.shipping?.postalCode || '000000',
            country: buyNow.shipping?.country || 'India'
          },
          userId: buyNow.userId || null,
          timestamp: Date.now()
        })
      } 
      
      // PRIORITY 4: Reconstruct from cart items
      if (cartItems) {
        const cart = JSON.parse(cartItems)
        const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
        console.log('Reconstructing from cart items:', cart)
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
      
      console.log('No order data found in any storage location')
      return null
    } catch (error) {
      console.error('Error reconstructing order data:', error)
      return null
    }
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
          <div className="animate-spin rounded-full h-32 w-32 border-yellow-500 mx-auto"></div>
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
  // Add warning when user tries to leave page
  useEffect(() => {
    // Check payment status every 30 seconds
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/phonepe/verify/${merchantTransactionId}`);
        const data = await response.json();
        
        // If payment has timed out, redirect to failure page
        if (data.data?.state === 'TIMEOUT' || data.data?.code === 'PAYMENT_TIMEOUT') {
          window.location.href = '/payment-failed?reason=timeout';
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    // Start checking payment status
    const statusInterval = setInterval(checkPaymentStatus, 30000);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your payment is in progress. If you leave now, your order will be cancelled. Are you sure?';
      return e.returnValue;
    };

    // Add warning when user tries to go back
    const handlePopState = (e: PopStateEvent) => {
      const confirmLeave = window.confirm('Your payment is in progress. If you go back, your order will be cancelled. Are you sure?');
      if (confirmLeave) {
        // Send cancellation to backend
        fetch('/api/payment/phonepe/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantTransactionId })
        }).catch(console.error);
      } else {
        // Stay on page
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href); // Add entry to history

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      clearInterval(statusInterval);
    };
  }, []);
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