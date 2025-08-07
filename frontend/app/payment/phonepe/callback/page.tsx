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
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let stopped = false;
    const urlParams = new URLSearchParams(window.location.search)
    const merchantTransactionId = urlParams.get('merchantTransactionId')
    const amount = urlParams.get('amount')
    if (!merchantTransactionId) {
      setStatus('failed')
      setMessage('Invalid payment response')
      return
    }
    async function checkStatus() {
      try {
        console.log('Checking payment status for:', merchantTransactionId)
        console.log('API URL:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/verify/${merchantTransactionId}`)
        
        const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/verify/${merchantTransactionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        console.log('Response status:', verifyRes.status)
        console.log('Response headers:', verifyRes.headers)
        
        const verifyData = await verifyRes.json()
        console.log('Verification response:', verifyData)
        
        if (verifyRes.ok && verifyData.success) {
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
             setMessage('Payment successful! Your order has been confirmed.')
             setOrderId(paymentData.merchantTransactionId || merchantTransactionId)
             
             // Get order details for display
             try {
               const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/orders/phonepe/${merchantTransactionId}`)
               if (orderRes.ok) {
                 const orderData = await orderRes.json()
                 if (orderData.success && orderData.order) {
                   setOrderDetails(orderData.order)
                 }
               }
             } catch (err) {
               console.error('Failed to fetch order details:', err)
             }
             
             localStorage.setItem('lastOrder', JSON.stringify({
               id: paymentData.merchantTransactionId || merchantTransactionId,
               orderSummary: { total: amount ? amount / 100 : 0 },
               paymentMethod: 'PhonePe'
             }))
             setTimeout(() => { router.push('/order-success') }, 5000)
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
          console.error('Verification failed:', verifyData)
          
          // Try to check order status directly from our database as fallback
          try {
            console.log('Trying fallback order check...')
            const orderCheckRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/orders/phonepe/${merchantTransactionId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            })
            
            console.log('Fallback response status:', orderCheckRes.status)
            const orderData = await orderCheckRes.json()
            console.log('Fallback order data:', orderData)
            
            if (orderCheckRes.ok) {
              if (orderData.success && orderData.order) {
                console.log('Order found, payment status:', orderData.order.paymentStatus)
                if (orderData.order.paymentStatus === 'paid') {
                  setStatus('success')
                  setMessage('Payment successful! Your order has been confirmed.')
                  setOrderId(merchantTransactionId)
                  localStorage.setItem('lastOrder', JSON.stringify({
                    id: merchantTransactionId,
                    orderSummary: { total: amount ? amount / 100 : 0 },
                    paymentMethod: 'PhonePe'
                  }))
                  setTimeout(() => { router.push('/order-success') }, 3000)
                  if (interval) clearInterval(interval)
                  stopped = true
                  return
                } else {
                  console.log('Order found but payment not paid. Status:', orderData.order.paymentStatus)
                }
              }
            } else {
              console.log('Fallback order check failed with status:', orderCheckRes.status)
            }
          } catch (fallbackError) {
            console.error('Fallback order check failed:', fallbackError)
          }
          
          setStatus('failed')
          setMessage(verifyData.message || 'Payment verification failed. Please contact support.')
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
    checkStatus()
    interval = setInterval(() => {
      if (!stopped && tries < 20) {
        setTries(t => t + 1)
        checkStatus()
      } else if (!stopped) {
        setStatus('failed')
        setMessage('Payment status could not be confirmed. Please contact support.')
        if (interval) clearInterval(interval)
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
               <button
                 onClick={async () => {
                   try {
                     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/test-success/${merchantTransactionId}`, {
                       method: 'POST'
                     })
                     if (res.ok) {
                       alert('Order manually marked as paid! Please refresh the page.')
                       window.location.reload()
                     }
                   } catch (err) {
                     alert('Failed to mark order as paid')
                   }
                 }}
                 className="btn btn-warning w-full text-sm"
               >
                 Manual Fix (If Payment Shows Failed)
               </button>
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
               <button
                 onClick={async () => {
                   try {
                     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/test-success/${merchantTransactionId}`, {
                       method: 'POST'
                     })
                     if (res.ok) {
                       alert('Order manually marked as paid! Please refresh the page.')
                       window.location.reload()
                     }
                   } catch (err) {
                     alert('Failed to mark order as paid')
                   }
                 }}
                 className="btn btn-warning w-full text-sm"
               >
                 Manual Fix (If Payment Actually Succeeded)
               </button>
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