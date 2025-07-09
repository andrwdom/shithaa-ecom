import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ConfirmationPage() {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const router = useRouter()

  useEffect(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem('lastOrder')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (!orderId || parsed.id === orderId) {
        setOrder(parsed)
        setLoading(false)
        return
      }
    }
    // TODO: Optionally fetch from backend by orderId
    setError('Order not found. Please check your order history.')
    setLoading(false)
  }, [orderId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="loading loading-spinner loading-lg text-green-600"></div></div>
  }
  if (error || !order) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-4xl text-red-500 mb-4">❌</div>
      <div className="text-lg font-semibold mb-2">{error || 'Order not found.'}</div>
      <Link href="/checkout" className="btn btn-primary mt-4">Return to Checkout</Link>
    </div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-2 py-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full flex flex-col items-center animate-fadeIn">
        <div className="text-green-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="#e6f9ea" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l2 2l4-4" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-green-700">Thank you! Your order was placed successfully.</h1>
        <div className="text-gray-700 text-center mb-4">We’ve also sent the confirmation to your email 📩</div>
        <div className="w-full bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between text-sm mb-1"><span className="font-medium">Order ID:</span> <span>{order.id}</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="font-medium">Total Paid:</span> <span>₹{order.orderSummary?.total}</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="font-medium">Payment Method:</span> <span>{order.paymentMethod}</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="font-medium">Delivery:</span> <span>Expected in 4–6 days</span></div>
        </div>
        <div className="flex flex-col gap-3 w-full mt-2">
          <a href={`/api/orders/${order.id}/invoice`} className="btn btn-outline btn-success w-full">Download Invoice</a>
          <Link href="/account/orders" className="btn btn-primary w-full">Track Order / View Status</Link>
          <Link href="/" className="btn btn-ghost w-full">Back to Home</Link>
        </div>
      </div>
    </div>
  )
} 