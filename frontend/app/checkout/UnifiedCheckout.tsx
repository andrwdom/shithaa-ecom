"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { useCart } from "@/components/cart-context";
import { useBuyNow } from "@/components/buy-now-context";
import { useCheckoutSession, CheckoutItem } from "@/hooks/useCheckoutSession";
import { startCheckoutSession, stopCheckoutSession } from "@/lib/checkout-session-manager";
import { authenticatedFetchJson, fetchWithRetry } from "@/lib/api-utils";
import { calculateShippingCost } from "@/lib/shipping-calculator";

// Import existing components
import ShippingForm from "./ShippingForm";
import CouponInput from "./CouponInput";
import OrderSummary from "./OrderSummary";
import ValidationErrorSummary from "@/components/ValidationErrorSummary";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingCart, CreditCard, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ShippingInfo {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export default function UnifiedCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getIdToken } = useAuth();
  const { cartItems, cartTotal, offerDetails, clearCartAfterSuccessfulCheckout } = useCart();
  const { buyNowItem, clearBuyNowAfterSuccessfulCheckout } = useBuyNow();
  
  const {
    isLoading,
    error,
    currentSession,
    createCheckoutSession,
    reserveStock,
    clearSession
  } = useCheckoutSession();

  // Determine checkout mode from URL or context
  const checkoutMode = searchParams.get('mode') || (buyNowItem ? 'buynow' : 'cart');
  const isBuyNow = checkoutMode === 'buynow';
  const isCart = !isBuyNow;

  // State management
  const [step, setStep] = useState<'init' | 'checkout' | 'payment' | 'success' | 'error'>('init');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  // Shipping form state
  const [shipping, setShipping] = useState<ShippingInfo>({
    fullName: '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });

  const [shippingErrors, setShippingErrors] = useState<any>({});

  // Coupon state (kept local to checkout UI only)
  const [coupon, setCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);

  // Get items for checkout based on mode
  const getCheckoutItems = (): CheckoutItem[] => {
    if (isBuyNow && buyNowItem) {
      return [{
        productId: buyNowItem._id,
        name: buyNowItem.name,
        price: buyNowItem.price,
        quantity: buyNowItem.quantity,
        size: buyNowItem.size,
        image: buyNowItem.image,
        categorySlug: buyNowItem.categorySlug,
        category: buyNowItem.category
      }];
    } else {
      return cartItems.map(item => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        image: item.image,
        categorySlug: item.categorySlug,
        category: item.category
      }));
    }
  };

  // Calculate order summary
  const calculateOrderSummary = () => {
    const items = getCheckoutItems();
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Apply offers for cart mode only
    const offerDiscount = isCart && offerDetails?.offerApplied ? (offerDetails.offerDiscount || 0) : 0;
    const afterOfferSubtotal = Math.max(0, subtotal - offerDiscount);

    // Apply coupon discount percentage on amount after offers, before shipping
    const couponDiscount = coupon?.discountPercentage
      ? Math.floor((afterOfferSubtotal * coupon.discountPercentage) / 100)
      : 0;
    
    // Calculate shipping cost (items first, then shipping info)
    // Convert CheckoutItems to CartItems for shipping calculation
    const cartItemsForShipping = items.map(item => ({
      id: item.productId,
      _id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      image: item.image,
      categorySlug: item.categorySlug,
      category: item.category
    }));
    
    const shippingCalculation = calculateShippingCost(cartItemsForShipping, { 
      state: shipping.state,
      city: shipping.city,
      pincode: shipping.postalCode
    });
    
    const total = Math.max(0, afterOfferSubtotal - couponDiscount) + shippingCalculation.shippingCost;

    return {
      subtotal,
      offerDiscount,
      couponDiscount,
      shipping: shippingCalculation.shippingCost,
      shippingMessage: shippingCalculation.shippingMessage,
      isFreeShipping: shippingCalculation.isFreeShipping,
      total,
      itemCount: items.length
    };
  };

  // Initialize checkout
  useEffect(() => {
    if (!user) {
      const redirectUrl = isBuyNow ? '/checkout?mode=buynow' : '/checkout';
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // Pre-fill user email
    if (user.email && !shipping.email) {
      setShipping(prev => ({
        ...prev,
        email: user.email || '',
        phone: user.phoneNumber || ''
      }));
    }

    const sessionId = searchParams.get('sessionId');
    if (sessionId) {
      setStep('checkout');
      setCheckoutSessionId(sessionId);
    } else {
      setStep('init');
    }
  }, [user, searchParams, router, isBuyNow, shipping.email]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCheckoutSession();
    };
  }, []);

  // Validate shipping form
  const validateShipping = (): boolean => {
    const errors: any = {};
    const required = ['fullName', 'email', 'phone', 'addressLine1', 'city', 'state', 'postalCode'];
    
    required.forEach(field => {
      if (!shipping[field as keyof ShippingInfo]?.trim()) {
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
      }
    });

    // Email validation
    if (shipping.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (shipping.phone && !/^[0-9]{10}$/.test(shipping.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Postal code validation
    if (shipping.postalCode && !/^[0-9]{6}$/.test(shipping.postalCode)) {
      errors.postalCode = 'Please enter a valid 6-digit postal code';
    }

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create checkout session
  const handleCreateSession = async () => {
    if (!user || !validateShipping()) return;

    try {
      setCheckoutError(null);
      setProcessing(true);
      const token = await getIdToken();
      
      const items = getCheckoutItems();
      if (items.length === 0) {
        setCheckoutError('No items to checkout');
        return;
      }

      // Calculate order summary with offers
      const orderSummary = calculateOrderSummary();
      
      // Create checkout session
      const response = await createCheckoutSession({
        source: isBuyNow ? 'buynow' : 'cart',
        items,
        orderSummary
      }, token, shipping.email);

      if (response.success && response.data) {
        const sessionId = response.data.sessionId;
        setCheckoutSessionId(sessionId);
        
        // Start managing the checkout session for cleanup
        if (token) {
          startCheckoutSession(sessionId, token);
        }
        
        // Move to checkout step
        setStep('checkout');
        // Update URL to include session ID
        router.replace(`/checkout?sessionId=${sessionId}${isBuyNow ? '&mode=buynow' : ''}`);
      } else {
        setCheckoutError(response.message || 'Failed to create checkout session');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setProcessing(false);
    }
  };

  // Reserve stock and proceed to payment
  const handleProceedToPayment = async () => {
    if (!currentSession || !user) return;

    try {
      setCheckoutError(null);
      setProcessing(true);
      const token = await getIdToken();
      
      const success = await reserveStock(currentSession.sessionId, token);
      if (success) {
        setStep('payment');
      } else {
        setCheckoutError('Failed to reserve stock. Some items may be out of stock.');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setProcessing(false);
    }
  };

  // Handle payment initiation
  const handlePayment = async () => {
    if (!currentSession || !user) return;

    try {
      setCheckoutError(null);
      setProcessing(true);
      const token = await getIdToken();
      
      // Create PhonePe payment session with retry logic
      const response = await fetchWithRetry('/api/payment/phonepe/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({
          checkoutSessionId: currentSession.sessionId,
          shipping
        })
      }, {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        retryCondition: (error, response) => {
          // Retry on network errors or 5xx server errors
          if (error) return true;
          if (response) return response.status >= 500;
          return false;
        }
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to PhonePe
        window.location.href = data.redirectUrl;
      } else {
        setCheckoutError(data.message || 'Failed to create payment session');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Render checkout items
  const renderCheckoutItems = () => {
    const items = currentSession?.items || getCheckoutItems();
    
    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
            <img 
              src={item.image} 
              alt={item.name}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-gray-600">Size: {item.size}</p>
              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">₹{item.price * item.quantity}</p>
              <p className="text-sm text-gray-600">₹{item.price} each</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render order summary
  const renderOrderSummary = () => {
    const summary = calculateOrderSummary();
    const items = getCheckoutItems();

    return (
      <OrderSummary 
        summary={summary}
        cartItems={items}
        offerDetails={isCart ? offerDetails : null}
        mode={isBuyNow ? 'buy-now' : 'cart'}
        shippingInfo={shipping}
      />
    );
  };

  // Render error state
  if (step === 'error') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Checkout Error</h1>
        <p className="text-gray-600 mb-8">{checkoutError}</p>
        <div className="space-y-4">
          <Button onClick={() => {
            setStep('init');
            setCheckoutError(null);
          }}>
            Try Again
          </Button>
          <br />
          <Link href={isBuyNow ? '/' : '/cart'} prefetch={false}>
            <Button variant="outline">
              {isBuyNow ? 'Back to Shopping' : 'Back to Cart'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Render initial step - item review and shipping form
  if (step === 'init') {
    const items = getCheckoutItems();
    
    if (items.length === 0) {
      return (
        <div 
          className="container mx-auto px-4 py-8 max-w-2xl text-center"
          style={{
            // Enable pull-to-refresh on mobile
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'auto',
            touchAction: 'pan-y pinch-zoom'
          }}
        >
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">No Items to Checkout</h1>
          <p className="text-gray-600 mb-8">
            {isBuyNow ? 'No buy-now item found. Please try again.' : 'Your cart is empty.'}
          </p>
          <Link href={isBuyNow ? '/' : '/cart'} prefetch={false}>
            <Button>
              {isBuyNow ? 'Continue Shopping' : 'View Cart'}
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div 
        className="container mx-auto px-4 py-8 max-w-6xl"
        style={{
          // Enable pull-to-refresh on mobile
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'auto',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-y pinch-zoom'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {isBuyNow ? 'Buy Now Checkout' : 'Cart Checkout'}
          </h1>
          <p className="text-gray-600">
            {isBuyNow 
              ? 'Complete your purchase' 
              : `Review your cart (${items.length} items)`
            }
          </p>
        </div>

        {/* Error Alert */}
        {checkoutError && (
          <Alert className="mb-6 max-w-4xl mx-auto">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Items and Shipping */}
          <div className="lg:col-span-2 space-y-6">
            {/* Checkout Items */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isBuyNow ? 'Item to Purchase' : 'Items in Cart'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCheckoutItems()}
              </CardContent>
            </Card>

            {/* Shipping Form */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ShippingForm 
                  value={shipping}
                  onChange={setShipping}
                  errors={shippingErrors}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            {/* Coupon Input (summary column) */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Have a Coupon?</CardTitle>
              </CardHeader>
              <CardContent>
                <CouponInput value={coupon} onApply={setCoupon} />
              </CardContent>
            </Card>

            {renderOrderSummary()}
            
            {/* Validation Error Summary */}
            <ValidationErrorSummary 
              errors={shippingErrors} 
              className="mb-4"
            />
            
            <Button 
              onClick={handleCreateSession}
              disabled={processing || isLoading}
              className="w-full mt-4"
              size="lg"
            >
              {processing || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Continue to Payment
                </>
              )}
            </Button>

            {/* Back Links */}
            <div className="mt-4">
              <Link href={isBuyNow ? '/' : '/cart'} prefetch={false}>
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isBuyNow ? 'Back to Product' : 'Back to Cart'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render checkout session step
  if (step === 'checkout') {
    if (!currentSession) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading checkout session...</p>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Review Your Order</h1>
          <p className="text-gray-600">Session ID: {currentSession.sessionId}</p>
        </div>

        {checkoutError && (
          <Alert className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                {renderCheckoutItems()}
              </CardContent>
            </Card>
          </div>

          <div>
            {renderOrderSummary()}
            
            {/* Validation Error Summary */}
            <ValidationErrorSummary 
              errors={shippingErrors} 
              className="mb-4"
            />
            
            <Button 
              onClick={handleProceedToPayment}
              disabled={processing || isLoading}
              className="w-full mt-4"
              size="lg"
            >
              {processing || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reserving Stock...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Reserve & Continue to Payment
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setStep('init')}
              className="w-full mt-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render payment step
  if (step === 'payment') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Ready for Payment</h1>
        <p className="text-gray-600 mb-8">
          Stock has been reserved. Click below to proceed with PhonePe payment.
        </p>

        {checkoutError && (
          <Alert className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handlePayment}
          disabled={processing}
          size="lg"
          className="w-full mb-4"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay with PhonePe
            </>
          )}
        </Button>

        <Button 
          variant="outline" 
          onClick={() => setStep('checkout')}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Review
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
      <p>Loading...</p>
    </div>
  );
}
