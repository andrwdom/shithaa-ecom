'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Package, MapPin, CreditCard, User, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function OrderSummaryPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="loading loading-spinner loading-lg text-green-600"></div>
      </div>
    }>
      <OrderSummaryContent />
    </Suspense>
  )
}

function OrderSummaryContent() {
  const params = useSearchParams()
  const router = useRouter()
  const orderId = params.get('orderId')
  const transactionId = params.get('transactionId')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // If neither orderId nor transactionId is provided, redirect to account page
    if (!orderId && !transactionId) {
      console.log("No order ID or transaction ID provided, redirecting to account page")
      router.push('/account')
      return
    }

    async function fetchOrder() {
      setLoading(true)
      setError("")
      try {
        let apiUrl: string
        let token: string | null = null
        
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('token')
        }

        if (orderId) {
          // Fetch order by order ID
          apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/orders/${orderId}`
          const res = await fetch(apiUrl, {
            headers: token ? { token } : {},
            credentials: 'include',
          })
          const data = await res.json()
          if (res.ok && data.data) {
            setOrder(data.data)
            return
          } else {
            setError(data.message || "Order not found.")
            return
          }
                 } else if (transactionId) {
           // Fetch order by PhonePe transaction ID using the new transaction endpoint
           apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/orders/transaction/${transactionId}`
        const res = await fetch(apiUrl, {
          headers: token ? { token } : {},
          credentials: 'include',
        })
        const data = await res.json()
           if (res.ok && data.success && data.data) {
             // Use the order data directly from the new endpoint
             setOrder(data.data)
             return
           } else {
             setError(data.message || "Order not found for this transaction.")
             return
           }
         }
      } catch (err) {
        console.error("Error fetching order:", err)
        setError("Could not fetch order. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId, transactionId, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="loading loading-spinner loading-lg text-green-600 mb-4"></div>
        <div className="text-lg font-semibold text-gray-700">Loading your order summary...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <div className="text-4xl text-red-500 mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="mb-6 text-gray-600">{error}</p>
        <Link href="/" className="btn btn-primary">Back to Home</Link>
      </div>
    )
  }

  const isPaid = order.paymentStatus === 'paid' || order.status === 'Paid'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">Thank you for your purchase. Your order has been successfully placed.</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Order Summary
            </h2>
          </div>
          
          <div className="p-6">
            {/* Order Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Order Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Order ID:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{order.orderId || order._id}</span>
                </div>
                {order.phonepeTransactionId && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-semibold">Transaction ID:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{order.phonepeTransactionId}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Order Date:</span>
                  <span>{new Date(order.createdAt || order.date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Payment Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Payment Method:</span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {order.paymentMethod || 'PhonePe'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">₹{order.totalAmount || order.amount || order.totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="border-t pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Shipping Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{order.shippingInfo?.fullName || order.userInfo?.name}</p>
                    <p className="text-gray-600">{order.shippingInfo?.email || order.email}</p>
                    <p className="text-gray-600">{order.shippingInfo?.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{order.shippingInfo?.addressLine1}</p>
                    {order.shippingInfo?.addressLine2 && (
                      <p className="text-gray-600">{order.shippingInfo.addressLine2}</p>
                    )}
                    <p className="text-gray-600">
                      {order.shippingInfo?.city}, {order.shippingInfo?.state} {order.shippingInfo?.postalCode}
                    </p>
                    <p className="text-gray-600">{order.shippingInfo?.country}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-600">Size: {item.size}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{item.price * item.quantity}</p>
                      <p className="text-sm text-gray-600">₹{item.price} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href={`/account?tab=orders`}
            className="inline-flex items-center justify-center px-6 py-3 bg-[#473C66] text-white font-semibold rounded-lg hover:bg-[#3a3054] transition-colors shadow-md"
          >
            <User className="h-5 w-5 mr-2" />
            View My Orders
          </Link>
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>A confirmation email has been sent to {order.shippingInfo?.email || order.email}</p>
          <p className="mt-1">Order updates will be sent to your registered phone number</p>
        </div>
      </div>
    </div>
  )
} 