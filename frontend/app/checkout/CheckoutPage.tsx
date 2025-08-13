'use client'
import { useState, useEffect } from 'react'
import ShippingForm from './ShippingForm'
import CouponInput from './CouponInput'
import OrderSummary from './OrderSummary'
import PlaceOrderButton from './PlaceOrderButton'
import { useCart } from '@/components/cart-context'
import { useBuyNow } from '@/components/buy-now-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageLoading from '@/components/page-loading';
import Script from 'next/script';
import { useAuth } from '@/components/auth/useAuth'
import { calculateShippingCost, ShippingInfo } from '@/lib/shipping-calculator'

function ProductPreviewSection({ items, onEdit }: any) {
  if (!items || items.length === 0) {
    return <div className="bg-white rounded-xl shadow p-4 mb-4 text-red-600">No products found. Please go back to shop.</div>
  }
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
      <h3 className="text-lg font-semibold mb-3">Product Preview</h3>
      <ul className="space-y-3">
        {items.map((item: any) => (
          <li key={item._id + item.size} className="flex items-center gap-4">
            <img src={item.image} alt={item.name} className="h-16 w-16 rounded object-cover border" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-sm text-gray-500">Size: {item.size} | Qty: {item.quantity}</p>
              <p className="text-sm font-semibold mt-1">Subtotal: ₹{item.price * item.quantity}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CheckoutPage() {
  // Centralized state for all forms and summary
  const [shipping, setShipping] = useState<any>({})
  const [coupon, setCoupon] = useState<any>(null)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [orderSummary, setOrderSummary] = useState<any>({ subtotal: 0, discount: 0, shipping: 0, total: 0 })
  const router = useRouter()
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { user } = useAuth();

  const { cartItems: contextCartItems, cartTotal, cartSubtotal, offerDetails, notifyCheckoutCartChanged } = useCart()
  const { buyNowItem, clearBuyNowItem } = useBuyNow()

  // Real-time sync between cart and buy-now states
  useEffect(() => {
    // Determine which items to show based on current state
    if (buyNowItem) {
      // Buy Now flow: show only the buy-now item
      setCartItems([buyNowItem])
      console.log('Checkout: Using Buy Now item:', buyNowItem)
    } else {
      // Cart flow: show cart items
      setCartItems(contextCartItems)
      console.log('Checkout: Using Cart items:', contextCartItems)
    }
  }, [buyNowItem, contextCartItems])

  // Clear buy-now when user navigates away or completes checkout
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (buyNowItem) {
        clearBuyNowItem()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [buyNowItem, clearBuyNowItem])

  useEffect(() => {
    // Subtotal should be the original sum before offers
    const rawSubtotal = (typeof cartSubtotal === 'number' && cartSubtotal > 0)
      ? cartSubtotal
      : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Offer discount from backend calculation
    const offerDiscount = offerDetails?.offerDiscount || 0;

    // Apply coupon on the amount after offer discount
    const amountAfterOffer = rawSubtotal - offerDiscount;
    const couponDiscount = coupon ? Math.round((amountAfterOffer * coupon.discountPercentage) / 100) : 0;

    // Calculate shipping using new shipping logic
    const shippingCalculation = calculateShippingCost(cartItems, shipping as ShippingInfo);
    const shippingCost = shippingCalculation.shippingCost;

    // Final total: use computed values to avoid drift
    const total = amountAfterOffer - couponDiscount + shippingCost;

    setOrderSummary({ 
      subtotal: rawSubtotal, 
      discount: couponDiscount, 
      shipping: shippingCost, 
      total,
      shippingMessage: shippingCalculation.shippingMessage,
      isFreeShipping: shippingCalculation.isFreeShipping
    });
  }, [cartItems, coupon, shipping, cartSubtotal, offerDetails]);

  // PhonePe payment handler
  async function handlePhonePePayment() {
    setProcessing(true);
    setPaymentError(null);
    try {
      // 1. Create PhonePe payment session on backend
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/payment/phonepe/create-session';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { token } : {})
        },
        body: JSON.stringify({
          amount: orderSummary.total,
          shipping,
          cartItems,
          coupon,
          userId: user?.mongoId,
          email: user?.email,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) throw new Error(data.message || 'Failed to create payment session');

      // 2. Redirect to PhonePe payment page
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed. Try again.');
      setProcessing(false);
    }
  }

  return (
    <PageLoading loadingMessage="Loading Checkout..." minLoadingTime={1500}>
      <div className="min-h-screen bg-gray-50 py-6 px-2 sm:px-4">
        {/* Stepper/Progress Indicator */}
        <div className="max-w-5xl mx-auto mb-8 px-4">
          <ol className="flex items-center w-full text-sm font-medium text-gray-500">
            <li className="flex-1 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(71,60,102)] text-white font-bold">1</span>
              <span className="hidden sm:inline">{buyNowItem ? 'Product' : 'Cart'}</span>
              <span className="flex-1 h-1 bg-[rgb(71,60,102)] mx-2 rounded sm:block hidden"></span>
            </li>
            <li className="flex-1 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(71,60,102)] text-white font-bold ring-2 ring-[rgb(71,60,102)]/40">2</span>
              <span className="text-[rgb(71,60,102)] font-semibold hidden sm:inline">Checkout</span>
              <span className="flex-1 h-1 bg-gray-200 mx-2 rounded sm:block hidden"></span>
            </li>
            <li className="flex-1 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold">3</span>
              <span className="hidden sm:inline">Payment</span>
              <span className="flex-1 h-1 bg-gray-200 mx-2 rounded sm:block hidden"></span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold">4</span>
              <span className="hidden sm:inline">Complete</span>
            </li>
          </ol>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-10 px-4">
          {/* Left Section: Product Preview + Shipping Form Only */}
          <div className="space-y-6">
            <ProductPreviewSection items={cartItems} />
            <ShippingForm value={shipping} onChange={setShipping} errors={errors.shipping} />
            {/* CouponInput: show only on mobile/tablet */}
            <div className="block md:hidden">
              <CouponInput value={coupon} onApply={setCoupon} />
            </div>
            {paymentError && (
              <div className="text-red-600 text-center font-semibold mb-2 flex flex-col items-center gap-2">
                <span>{paymentError}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline border-red-400 text-red-700 hover:bg-red-50 mt-2"
                  onClick={handlePhonePePayment}
                  disabled={processing}
                >
                  Retry PhonePe Payment
                </button>
              </div>
            )}
          </div>
          {/* Right Section: Order Summary + Confirm Button */}
          <div className="space-y-4">
            {/* CouponInput: show only on desktop */}
            <div className="hidden md:block">
              <CouponInput value={coupon} onApply={setCoupon} />
            </div>
            <OrderSummary cartItems={cartItems} coupon={coupon} summary={orderSummary} offerDetails={offerDetails} />
            {/* Payment Buttons */}
            <button
              type="button"
              className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white text-lg font-semibold rounded-xl py-3 mt-4 transition disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handlePhonePePayment}
              disabled={processing}
            >
              {processing ? <span className="loading loading-spinner loading-md"></span> : 'Confirm Order'}
            </button>
          </div>
        </div>
      </div>
    </PageLoading>
  )
} 