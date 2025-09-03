"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { useCart } from "@/components/cart-context";
import { useBuyNow } from "@/components/buy-now-context";
import { useCheckoutSession, CheckoutItem } from "@/hooks/useCheckoutSession";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingCart, CreditCard, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutPageV2Client() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getIdToken } = useAuth();
  const { cartItems, cartTotal, offerDetails } = useCart();
  const { buyNowItem } = useBuyNow();
  
  const {
    isLoading,
    error,
    currentSession,
    createCheckoutSession,
    reserveStock,
    clearSession
  } = useCheckoutSession();

  const [step, setStep] = useState<'init' | 'checkout' | 'payment' | 'success' | 'error'>('init');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Determine checkout mode from URL or context
  const checkoutMode = searchParams.get('mode') || (buyNowItem ? 'buynow' : 'cart');
  const sessionId = searchParams.get('sessionId');

  // Get items for checkout
  const getCheckoutItems = (): CheckoutItem[] => {
    if (checkoutMode === 'buynow' && buyNowItem) {
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

  // Initialize checkout
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/checkout-v2');
      return;
    }

    if (sessionId) {
      // Load existing session
      setStep('checkout');
    } else {
      // Create new session
      setStep('init');
    }
  }, [user, sessionId, router]);

  // Create checkout session
  const handleCreateSession = async () => {
    if (!user) return;

    try {
      setCheckoutError(null);
      const token = await getIdToken();
      
      const items = getCheckoutItems();
      if (items.length === 0) {
        setCheckoutError('No items to checkout');
        return;
      }

      const response = await createCheckoutSession({
        source: checkoutMode as 'cart' | 'buynow',
        items
      }, token);

      if (response.success && response.data) {
        // Redirect to checkout with session ID
        router.push(`/checkout-v2?sessionId=${response.data.sessionId}`);
      } else {
        setCheckoutError(response.message || 'Failed to create checkout session');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  // Reserve stock and proceed to payment
  const handleProceedToPayment = async () => {
    if (!currentSession || !user) return;

    try {
      setCheckoutError(null);
      const token = await getIdToken();
      
      const success = await reserveStock(currentSession.sessionId, token);
      if (success) {
        setStep('payment');
      } else {
        setCheckoutError('Failed to reserve stock');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  // Handle payment initiation
  const handlePayment = async () => {
    if (!currentSession || !user) return;

    try {
      setCheckoutError(null);
      const token = await getIdToken();
      
      // Create PhonePe payment session
      const response = await fetch('/api/payment/phonepe/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({
          checkoutSessionId: currentSession.sessionId,
          shipping: {
            fullName: user.displayName || 'Guest User',
            email: user.email || '',
            phone: user.phoneNumber || '',
            addressLine1: 'Address Line 1',
            addressLine2: '',
            city: 'City',
            state: 'State',
            postalCode: '123456',
            country: 'India'
          }
        })
      });

      const data = await response.json();
      
      if (data.success && data.redirectUrl) {
        // Redirect to PhonePe
        window.location.href = data.redirectUrl;
      } else {
        setCheckoutError(data.message || 'Failed to create payment session');
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unknown error occurred');
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

  // Render checkout summary
  const renderCheckoutSummary = () => {
    const items = currentSession?.items || getCheckoutItems();
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const offerDiscount = offerDetails?.offerApplied ? (offerDetails.offerDiscount || 0) : 0;
    const total = subtotal - offerDiscount;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Subtotal ({items.length} items)</span>
            <span>₹{subtotal}</span>
          </div>
          {offerDetails?.offerApplied && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-₹{offerDetails.offerDiscount}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render different steps
  if (step === 'init') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {checkoutMode === 'buynow' ? 'Buy Now Checkout' : 'Cart Checkout'}
          </h1>
          <p className="text-gray-600">
            {checkoutMode === 'buynow' 
              ? 'Complete your purchase' 
              : `Review your cart (${cartItems.length} items)`
            }
          </p>
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
                <CardTitle>Checkout Items</CardTitle>
              </CardHeader>
              <CardContent>
                {renderCheckoutItems()}
              </CardContent>
            </Card>
          </div>

          <div>
            {renderCheckoutSummary()}
            
            <Button 
              onClick={handleCreateSession}
              disabled={isLoading}
              className="w-full mt-4"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold mb-4">Checkout Session</h1>
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
            {renderCheckoutSummary()}
            
            <Button 
              onClick={handleProceedToPayment}
              disabled={isLoading}
              className="w-full mt-4"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reserving Stock...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          disabled={isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? (
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

        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => setStep('checkout')}
            className="w-full"
          >
            Back to Checkout
          </Button>
        </div>
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
