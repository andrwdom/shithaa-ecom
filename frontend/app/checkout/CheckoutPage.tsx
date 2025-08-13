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
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [orderSummary, setOrderSummary] = useState<any>({ subtotal: 0, discount: 0, shipping: 0, total: 0 })
  const router = useRouter()
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const { user } = useAuth();

  const { cartItems: contextCartItems, cartTotal, cartSubtotal, offerDetails, notifyCheckoutCartChanged } = useCart()
  const { buyNowItem, clearBuyNowItem } = useBuyNow()

  // Determine which items to show based on current state
  const cartItems = buyNowItem ? [{
    ...buyNowItem,
    id: buyNowItem.id.toString(), // Convert id to string to match CartItem type
    categorySlug: undefined, // BuyNowItem doesn't have categorySlug
    category: undefined // BuyNowItem doesn't have category
  }] : contextCartItems;

  // Check if we have items to checkout
  const hasItems = cartItems && cartItems.length > 0;

  // Handle cart loading state
  useEffect(() => {
    // If we have cart items or buy now item, mark as loaded
    if (hasItems) {
      setIsCartLoaded(true);
    } else {
      // Check if we're still loading from localStorage
      const storedCart = localStorage.getItem("cartItems");
      const storedBuyNow = sessionStorage.getItem("buyNowItem");
      
      if (storedCart || storedBuyNow) {
        // Still loading, wait a bit more
        const timer = setTimeout(() => {
          setIsCartLoaded(true);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        // No items found, mark as loaded
        setIsCartLoaded(true);
      }
    }
  }, [hasItems, contextCartItems, buyNowItem]);

  // Fallback: Direct localStorage check if context hasn't loaded yet
  useEffect(() => {
    if (!hasItems && isCartLoaded) {
      // Double-check localStorage directly as a fallback
      const checkLocalStorage = () => {
        const storedCart = localStorage.getItem("cartItems");
        const storedBuyNow = sessionStorage.getItem("buyNowItem");
        
        if (storedCart) {
          try {
            const parsed = JSON.parse(storedCart);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log("Checkout: Fallback - Found items in localStorage:", parsed);
              // Force a re-render by updating the cart context
              notifyCheckoutCartChanged();
            }
          } catch (error) {
            console.error("Checkout: Error parsing localStorage cart:", error);
          }
        }
        
        if (storedBuyNow) {
          try {
            const parsed = JSON.parse(storedBuyNow);
            if (parsed && parsed._id && parsed.name) {
              console.log("Checkout: Fallback - Found buy-now item in sessionStorage:", parsed);
              // The buy-now context should pick this up
            }
          } catch (error) {
            console.error("Checkout: Error parsing sessionStorage buy-now:", error);
          }
        }
      };

      // Check after a short delay to allow contexts to load
      const timer = setTimeout(checkLocalStorage, 200);
      return () => clearTimeout(timer);
    }
  }, [hasItems, isCartLoaded, notifyCheckoutCartChanged]);

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
            <li className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold">3</span>
              <span className="hidden sm:inline">Payment</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold">4</span>
              <span className="hidden sm:inline">Complete</span>
            </li>
          </ol>
        </div>

        {/* Show loading state while cart is being restored */}
        {!isCartLoaded && (
          <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(71,60,102)] mx-auto mb-4"></div>
              <p className="text-gray-600">Restoring your checkout items...</p>
            </div>
          </div>
        )}

        {/* Show error state if no items found after loading */}
        {isCartLoaded && !hasItems && (
          <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No Items Found</h2>
              <p className="text-gray-600 mb-6">
                It looks like your cart is empty or the items couldn't be restored. 
                This might happen if you refreshed the page or cleared your browser data.
              </p>
              <div className="space-y-3">
                <Link 
                  href="/" 
                  className="inline-block bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Continue Shopping
                </Link>
                <br />
                <Link 
                  href="/cart" 
                  className="inline-block border border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  View Cart
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Show checkout form only when we have items */}
        {isCartLoaded && hasItems && (
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
        )}
      </div>
    </PageLoading>
  )
} 