'use client'
import { useState, useEffect } from 'react'
import ShippingForm from './ShippingForm'
import CouponInput from './CouponInput'
import OrderSummary from './OrderSummary'
import PlaceOrderButton from './PlaceOrderButton'
import { useCart } from '@/components/cart-context'
import { useBuyNow, CheckoutMode } from '@/components/buy-now-context'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [checkoutItems, setCheckoutItems] = useState<any[]>([])
  const [errors, setErrors] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [orderSummary, setOrderSummary] = useState<any>({ subtotal: 0, discount: 0, shipping: 0, total: 0 })
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { user } = useAuth();

  const { cartItems: contextCartItems, cartTotal, cartSubtotal, offerDetails, refreshCartData } = useCart()
  const { buyNowItem, checkoutMode, setCheckoutMode, resetCheckoutMode } = useBuyNow()

  // CRITICAL FIX: Always fetch fresh data and determine checkout mode on mount
  useEffect(() => {
    const initializeCheckout = async () => {
      setIsLoadingData(true);
      try {
        // Check URL params for explicit mode
        const urlMode = searchParams.get('mode');
        
        if (urlMode === 'buynow' && buyNowItem) {
          // Buy Now mode - ensure we're in buy now mode
          setCheckoutMode('buyNow');
          setCheckoutItems([buyNowItem]);
          console.log('Checkout initialized in Buy Now mode with:', buyNowItem);
        } else if (buyNowItem && checkoutMode === 'buyNow') {
          // Buy Now mode from context
          setCheckoutItems([buyNowItem]);
          console.log('Checkout initialized in Buy Now mode from context with:', buyNowItem);
        } else {
          // Cart mode - always fetch fresh cart data
          setCheckoutMode('cart');
          await refreshCartData();
          setCheckoutItems(contextCartItems);
          console.log('Checkout initialized in Cart mode with fresh data');
        }
      } catch (error) {
        console.error("Error initializing checkout:", error);
        // Fallback to cart mode
        setCheckoutMode('cart');
        setCheckoutItems(contextCartItems);
      } finally {
        setIsLoadingData(false);
      }
    };

    initializeCheckout();
  }, []); // Only run on mount

  // Update checkout items when context data changes
  useEffect(() => {
    if (checkoutMode === 'buyNow' && buyNowItem) {
      setCheckoutItems([buyNowItem]);
    } else if (checkoutMode === 'cart') {
      setCheckoutItems(contextCartItems);
    }
  }, [checkoutMode, buyNowItem, contextCartItems]);

  // Clear checkout mode when leaving checkout page
  useEffect(() => {
    return () => {
      // Reset checkout mode when component unmounts
      resetCheckoutMode();
    };
  }, [resetCheckoutMode]);

  // Additional safeguard: Check if we have valid items after initialization
  useEffect(() => {
    if (!isLoadingData && checkoutItems.length === 0) {
      // No valid items found, redirect back to home
      console.log("No valid items found in checkout, redirecting to home");
      router.push("/");
    }
  }, [checkoutItems, isLoadingData, router]);

  useEffect(() => {
    // Subtotal should be the original sum before offers
    const rawSubtotal = (typeof cartSubtotal === 'number' && cartSubtotal > 0 && checkoutMode === 'cart')
      ? cartSubtotal
      : checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Offer discount from backend calculation (only for cart mode)
    const offerDiscount = (checkoutMode === 'cart' && offerDetails?.offerDiscount) ? offerDetails.offerDiscount : 0;

    // Apply coupon on the amount after offer discount
    const amountAfterOffer = rawSubtotal - offerDiscount;
    const couponDiscount = coupon ? Math.round((amountAfterOffer * coupon.discountPercentage) / 100) : 0;

    // Calculate shipping using new shipping logic
    const shippingCalculation = calculateShippingCost(checkoutItems, shipping as ShippingInfo);
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
  }, [checkoutItems, coupon, shipping, cartSubtotal, offerDetails, checkoutMode]);

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
          cartItems: checkoutItems,
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
          items: checkoutItems,
          couponUsed: coupon ? { code: coupon.code, discount: coupon.discountPercentage || 0 } : null,
          totalAmount: orderSummary.total,
          paymentStatus: 'test-paid',
          createdAt: new Date().toISOString(),
        })
      });
      const orderData = await orderRes.json();
      if (orderRes.ok && orderData.order && orderData.order.orderId) {
        router.push(`/order-success?orderId=${orderData.order.orderId}`);
      } else {
        throw new Error('Failed to create order');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Order creation failed. Try again.');
      setProcessing(false);
    }
  }

  if (isLoadingData) {
    return <PageLoading loadingMessage="Loading Checkout...">
      <div>Initializing checkout...</div>
    </PageLoading>
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Items to Checkout</h1>
          <p className="text-gray-600 mb-6">Your cart is empty or the buy now item is no longer available.</p>
          <div className="space-x-4">
            <Link href="/" className="inline-block bg-[#473C66] text-white px-6 py-3 rounded-full hover:bg-[#3a3054] transition">
              Continue Shopping
            </Link>
            {checkoutMode === 'buyNow' && (
              <button 
                onClick={() => router.push("/")} 
                className="inline-block border border-[#473C66] text-[#473C66] px-6 py-3 rounded-full hover:bg-[#473C66] hover:text-white transition"
              >
                Clear Buy Now
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="beforeInteractive"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {checkoutMode === 'buyNow' ? 'Buy Now Checkout' : 'Cart Checkout'}
          </h1>
          <p className="text-gray-600">
            {checkoutMode === 'buyNow' 
              ? 'Complete your purchase for this item' 
              : 'Review your cart and complete your order'
            }
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            <ProductPreviewSection 
              items={checkoutItems} 
              onEdit={() => router.push("/")}
            />
            
            <ShippingForm 
              shipping={shipping} 
              setShipping={setShipping} 
              errors={errors} 
              setErrors={setErrors}
            />
            
            <CouponInput 
              coupon={coupon} 
              setCoupon={setCoupon}
            />
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary 
              cartItems={checkoutItems}
              coupon={coupon}
              summary={orderSummary}
              offerDetails={checkoutMode === 'cart' ? offerDetails : null}
            />
            
            <PlaceOrderButton 
              onPhonePePayment={handlePhonePePayment}
              onDummyPayment={handleDummyPayment}
              processing={processing}
              paymentError={paymentError}
              disabled={checkoutItems.length === 0}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 