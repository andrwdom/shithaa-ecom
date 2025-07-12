'use client'
import { useState, useEffect } from 'react'
import ShippingForm from './ShippingForm'
import BillingForm from './BillingForm'
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

function ProductPreviewSection({ items, onEdit }: any) {
  if (!items || items.length === 0) {
    return <div className="bg-white rounded-xl shadow p-4 mb-4 text-red-600">No products found. Please go back to shop.</div>
  }
  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-[rgb(71,60,102)]">Product Preview</h2>
        {/* Removed Edit Cart button */}
      </div>
      <ul className="divide-y">
        {items.map((item: any) => (
          <li key={item._id + item.size} className="flex items-center gap-4 py-3">
            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs text-gray-500">Size: {item.size}</div>
              <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[rgb(71,60,102)]">₹{item.price}</div>
              <div className="text-xs text-gray-500">Subtotal: ₹{item.price * item.quantity}</div>
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
  const [billing, setBilling] = useState<any>({})
  const [billingSame, setBillingSame] = useState(true)
  const [coupon, setCoupon] = useState<any>(null)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [orderSummary, setOrderSummary] = useState<any>({ subtotal: 0, discount: 0, shipping: 0, total: 0 })
  const router = useRouter()
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { user } = useAuth();

  const { cartItems: contextCartItems } = useCart()
  const { buyNowItem } = useBuyNow()

  useEffect(() => {
    // Detect buy-now or cart
    if (buyNowItem) {
      setCartItems([buyNowItem])
    } else {
      setCartItems(contextCartItems)
    }
  }, [buyNowItem, contextCartItems])

  useEffect(() => {
    // Calculate subtotal
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Calculate discount
    const discount = coupon ? Math.round((subtotal * coupon.discountPercentage) / 100) : 0;
    // Shipping: free if shipping.state is 'tamil nadu', else 49 if subtotal > 0
    let shipping = 0;
    if (subtotal > 0) {
      if (!shipping?.state || typeof shipping.state !== 'string' || shipping.state.trim().toLowerCase() !== 'tamil nadu') {
        shipping = 49;
      }
    }
    // Calculate total
    const total = subtotal - discount + shipping;
    setOrderSummary({ subtotal, discount, shipping, total });
  }, [cartItems, coupon, shipping]);

  // Razorpay handler
  async function handleRazorpayPayment() {
    setProcessing(true);
    setPaymentError(null);
    try {
      // 1. Create Razorpay order/session on backend
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/payment/razorpay/create-session';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: orderSummary.total,
          shipping,
          billing,
          cartItems,
          coupon,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.razorpayOrderId) throw new Error(data.message || 'Failed to create payment session');

      // 2. Load Razorpay SDK if not already loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // 3. Open Razorpay popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxx',
        amount: orderSummary.total * 100,
        currency: 'INR',
        name: 'Shitha Clothing',
        description: 'Order Payment',
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          // 4. On payment success, save order to backend
          const orderRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shipping,
              billing,
              cartItems,
              coupon,
              paymentStatus: 'paid',
              paymentMethod: 'razorpay',
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              userId: user?.mongoId,
              email: user?.email,
            })
          });
          const orderData = await orderRes.json();
          if (orderRes.ok && orderData.order && orderData.order._id) {
            router.push(`/order-success?orderId=${orderData.order._id}`);
          } else {
            setPaymentError(orderData.message || 'Order save failed');
          }
          setProcessing(false);
        },
        prefill: {
          name: shipping.fullName,
          email: shipping.email,
          contact: shipping.phone,
        },
        theme: { color: '#6C6385' },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed. Try again.');
      setProcessing(false);
    }
  }

  // Dummy payment handler
  async function handleDummyPayment() {
    setProcessing(true);
    setPaymentError(null);
    try {
      await new Promise(res => setTimeout(res, 1500));
      const orderRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInfo: {
            userId: user?.mongoId,
            name: user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : 'User'),
            email: user?.email || '',
          },
          shippingInfo: shipping,
          items: cartItems,
          couponUsed: coupon ? { code: coupon.code, discount: coupon.discountPercentage || 0 } : null,
          totalAmount: orderSummary.total,
          paymentStatus: 'test-paid',
          createdAt: new Date().toISOString(),
        })
      });
      const orderData = await orderRes.json();
      if (orderRes.ok && orderData.order && orderData.order._id) {
        router.push(`/order-success?orderId=${orderData.order._id}`);
      } else {
        setPaymentError(orderData.message || 'Order save failed');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Test payment failed.');
    } finally {
      setProcessing(false);
    }
  }

  // TODO: Load cartItems from context or props

  return (
    <PageLoading loadingMessage="Loading Checkout..." minLoadingTime={1500}>
      <div className="min-h-screen bg-gray-50 py-6 px-2 sm:px-4">
        <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-5 gap-8 flex flex-col">
          {/* Left: Forms */}
          <form className="lg:col-span-3 flex flex-col gap-6">
            <ProductPreviewSection items={cartItems} />
            <ShippingForm value={shipping} onChange={setShipping} errors={errors.shipping} />
            <BillingForm value={billing} onChange={setBilling} sameAsShipping={billingSame} onToggleSame={setBillingSame} errors={errors.billing} shipping={shipping} />
            {/* CouponInput: show only on mobile/tablet */}
            <div className="block lg:hidden">
              <CouponInput value={coupon} onApply={setCoupon} />
            </div>
            {paymentError && <div className="text-red-600 text-center font-semibold mb-2">{paymentError}</div>}
          </form>
          {/* Right: Order Summary and CouponInput for desktop */}
          <div className="lg:col-span-2 mt-8 lg:mt-0 flex flex-col gap-6">
            {/* CouponInput: show only on desktop */}
            <div className="hidden lg:block">
              <CouponInput value={coupon} onApply={setCoupon} />
            </div>
            <div className="lg:sticky top-8 flex flex-col gap-4">
              <OrderSummary cartItems={cartItems} coupon={coupon} summary={orderSummary} />
              {/* Payment Buttons */}
              <button
                type="button"
                className="w-full h-14 text-lg font-bold rounded-xl shadow bg-[#6C6385] text-white transition-all duration-200 hover:bg-[#574e6b] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#bcb6d6] disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleRazorpayPayment}
                disabled={processing}
              >
                {processing ? <span className="loading loading-spinner loading-md"></span> : 'Confirm Order (Razorpay)'}
              </button>
              <button
                type="button"
                className="w-full h-14 text-lg font-bold rounded-xl shadow bg-gray-300 text-[#6C6385] transition-all duration-200 hover:bg-gray-400 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#bcb6d6] disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleDummyPayment}
                disabled={processing}
              >
                {processing ? <span className="loading loading-spinner loading-md"></span> : 'Dummy Payment (Test)'}
              </button>
              {paymentError && <div className="text-red-600 text-center font-semibold mt-2">{paymentError}</div>}
              {/* PlaceOrderButton removed, replaced by above */}
            </div>
          </div>
        </div>
      </div>
    </PageLoading>
  )
} 