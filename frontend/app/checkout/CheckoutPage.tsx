'use client'
import { useState, useEffect, useCallback } from 'react'
import ShippingForm from './ShippingForm'
import CouponInput from './CouponInput'
import OrderSummary from './OrderSummary'
import { useCart } from '@/components/cart-context'
import { useCheckoutFlow } from '@/components/checkout-flow-manager'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageLoading from '@/components/page-loading';
import { useAuth } from '@/components/auth/useAuth'
import { calculateShippingCost, ShippingInfo } from '@/lib/shipping-calculator'
import { authenticatedFetch, authenticatedFetchJson } from '@/lib/api-utils';
import { validateStockAvailability } from '@/lib/stock-validator';
import { startCheckoutSession, stopCheckoutSession } from '@/lib/checkout-session-manager';

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
  const [checkoutOfferDetails, setCheckoutOfferDetails] = useState<any>(null)
  const router = useRouter()
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { user, logout } = useAuth(); // Get logout function from useAuth
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  // Use the centralized checkout flow manager instead of individual contexts
  const { 
    currentFlow, 
    isBuyNowMode, 
    isCartMode, 
    checkoutItems, 
    isLoading: checkoutFlowLoading,
    retryRestoreCart 
  } = useCheckoutFlow();

  const { cartItems: originalCartItems, cartTotal, cartSubtotal, offerDetails, notifyCheckoutCartChanged, openCartSidebar, isLoadingOffer } = useCart()
  
  // 🔧 CRITICAL FIX: Trigger cart calculation when checkout page loads
  useEffect(() => {
    if (isCartMode && originalCartItems.length > 0) {
      console.log('[CheckoutPage] 🔧 Triggering cart calculation for checkout...');
      notifyCheckoutCartChanged();
    }
  }, [isCartMode, originalCartItems.length, notifyCheckoutCartChanged]);

  // Use checkoutItems from the flow manager for buy-now mode, original cart items for cart mode
  const cartItems = isBuyNowMode ? (checkoutItems || []) : (originalCartItems || []);

  // Check if we have items to checkout
  const hasItems = cartItems && cartItems.length > 0;

  // 🔑 FIXED: Ensure strict data separation based on checkout mode
  // For cart mode, use originalCartItems to preserve offer details; for buy-now, use checkoutItems
  const displayItems = isBuyNowMode ? checkoutItems : originalCartItems;
  const displayMode = isBuyNowMode ? 'buynow' : 'cart';

  // 🔑 FIXED: Recalculate orderSummary when displayItems change to prevent data contamination
  useEffect(() => {
    console.log('[CheckoutPage] 🔄 orderSummary calculation triggered:', {
      displayItems: displayItems?.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
      displayMode,
      hasOfferDetails: !!offerDetails,
      hasCoupon: !!coupon,
      hasShipping: !!shipping,
      isLoadingOffer
    });
    
    // 🔧 CRITICAL FIX: Wait for offer calculation to complete in cart mode
    if (isCartMode && isLoadingOffer) {
      console.log('[CheckoutPage] 🔧 Waiting for offer calculation to complete...');
      return;
    }
    
    if (displayItems && displayItems.length > 0) {
      const rawSubtotal = displayItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      
      // 🔧 CRITICAL FIX: Calculate offer for checkout items if not in cart mode
      let offerDiscount = 0;
      let calculatedOfferDetails = null;
      
      // Calculate loungewear items count first
      console.log('[CheckoutPage] 🔧 Display items for offer calculation:', displayItems.map(item => ({
        name: item.name,
        categorySlug: item.categorySlug,
        category: item.category,
        price: item.price,
        quantity: item.quantity
      })));
      
      // 🔧 CRITICAL FIX: Force offer calculation based on item names if categorySlug is missing
      const loungewearItems = displayItems.filter((item: any) => {
        const hasCategorySlug = item.categorySlug === 'zipless-feeding-lounge-wear' || item.categorySlug === 'non-feeding-lounge-wear';
        const hasLoungewearName = item.name && (
          item.name.toLowerCase().includes('lounge') || 
          item.name.toLowerCase().includes('loungewear')
        );
        return hasCategorySlug || hasLoungewearName;
      });
      
      const totalLoungewearQuantity = loungewearItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      console.log('[CheckoutPage] 🔧 Loungewear items found:', {
        loungewearItemsCount: loungewearItems.length,
        totalLoungewearQuantity,
        loungewearItems: loungewearItems.map(item => ({
          name: item.name,
          categorySlug: item.categorySlug,
          quantity: item.quantity
        }))
      });
      
      if (isBuyNowMode) {
        // For buy-now mode, calculate offer directly
        
        if (totalLoungewearQuantity >= 3) {
          // Calculate offer: 3 for ₹1299, remaining at ₹450 each
          const completeSets = Math.floor(totalLoungewearQuantity / 3);
          const remainingItems = totalLoungewearQuantity % 3;
          const loungewearSubtotal = loungewearItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
          const offerTotal = (completeSets * 1299) + (remainingItems * 450);
          
          if (offerTotal < loungewearSubtotal) {
            offerDiscount = loungewearSubtotal - offerTotal;
            calculatedOfferDetails = {
              offerApplied: true,
              offerDiscount: offerDiscount,
              offerDetails: {
                completeSets,
                remainingItems,
                offerPrice: offerTotal,
                originalPrice: loungewearSubtotal,
                savings: offerDiscount
              }
            };
            console.log('[CheckoutPage] 🔧 Calculated offer for checkout items:', calculatedOfferDetails);
          }
        }
      } else {
        // For cart mode, ALWAYS calculate offer directly to ensure it works
        console.log('[CheckoutPage] 🔧 Cart mode - forcing direct offer calculation');
        
        if (totalLoungewearQuantity >= 3) {
          const completeSets = Math.floor(totalLoungewearQuantity / 3);
          const remainingItems = totalLoungewearQuantity % 3;
          const loungewearSubtotal = loungewearItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
          const offerTotal = (completeSets * 1299) + (remainingItems * 450);
          
          if (offerTotal < loungewearSubtotal) {
            offerDiscount = loungewearSubtotal - offerTotal;
            calculatedOfferDetails = {
              offerApplied: true,
              offerDiscount: offerDiscount,
              offerDetails: {
                completeSets,
                remainingItems,
                offerPrice: offerTotal,
                originalPrice: loungewearSubtotal,
                savings: offerDiscount
              }
            };
            console.log('[CheckoutPage] 🔧 CRITICAL: Forced offer calculation for cart items:', calculatedOfferDetails);
          }
        } else {
          console.log('[CheckoutPage] 🔧 Not enough loungewear items for offer:', totalLoungewearQuantity);
        }
      }
      
      // Set the checkout offer details state
      setCheckoutOfferDetails(calculatedOfferDetails);

      // 🔧 CRITICAL FIX: Check loungewear items count and force zero discount for < 3 items
      
      console.log('[CheckoutPage] 🔧 Offer calculation debug:', {
        isBuyNowMode,
        hasOfferDetails: !!offerDetails,
        offerDetails,
        calculatedOfferDetails,
        offerDiscount,
        totalLoungewearQuantity,
        displayItemsCount: displayItems.length,
        cartItemsCount: originalCartItems.length,
        checkoutItemsCount: checkoutItems.length
      });
      
      // 🔧 CRITICAL FIX: Force zero discount if less than 3 loungewear items
      let finalOfferDiscount = offerDiscount;
      if (totalLoungewearQuantity < 3) {
        console.log(`🔧 CRITICAL: Forcing zero discount for ${totalLoungewearQuantity} loungewear items (need 3+)`);
        finalOfferDiscount = 0;
        calculatedOfferDetails = null;
        setCheckoutOfferDetails(null);
      }

      // 🔧 FIX: Safety check - ensure offer discount is never negative or exceeds subtotal
      const safeOfferDiscount = Math.max(0, Math.min(finalOfferDiscount, rawSubtotal));
      if (offerDiscount !== safeOfferDiscount) {
        console.log(`🔧 Frontend safety fix: Adjusted offer discount from ₹${offerDiscount} to ₹${safeOfferDiscount}`);
      }

      // Apply coupon on the amount after offer discount
      const amountAfterOffer = rawSubtotal - safeOfferDiscount;
      const couponDiscount = coupon ? Math.round((amountAfterOffer * coupon.discountPercentage) / 100) : 0;

      // Calculate shipping using new shipping logic
      // Only calculate shipping if we have valid shipping information
      let shippingCalculation;
      let shippingCost = 0;
      
      if (shipping && shipping.state && shipping.state.trim()) {
        shippingCalculation = calculateShippingCost(displayItems, shipping as ShippingInfo);
        shippingCost = shippingCalculation.shippingCost;
      } else {
        // No shipping info available yet
        shippingCalculation = {
          shippingCost: 0,
          isFreeShipping: false,
          shippingMessage: "Shipping location not set"
        };
      }

      // Final total: use computed values to avoid drift
      let total = amountAfterOffer - couponDiscount + shippingCost;

      // 🔧 FIX: Final safety check - ensure total is never negative
      if (total < 0) {
        console.log(`🔧 CRITICAL: Frontend negative total detected: ₹${total}, setting to 0`);
        total = 0;
      }

      const newOrderSummary = { 
        subtotal: rawSubtotal,
        offerDiscount: safeOfferDiscount, // Use the safe offer discount
        couponDiscount,
        shipping: shippingCost, 
        total,
        shippingMessage: shippingCalculation.shippingMessage,
        isFreeShipping: shippingCalculation.isFreeShipping
      };

      setOrderSummary(newOrderSummary);
      
      console.log('[CheckoutPage] ✅ Recalculated orderSummary from displayItems:', {
        displayMode,
        displayItemsCount: displayItems.length,
        rawSubtotal,
        offerDiscount: safeOfferDiscount,
        amountAfterOffer,
        couponDiscount,
        shippingCost,
        total,
        newOrderSummary,
        calculatedOfferDetails,
        checkoutOfferDetails
      });
    } else {
      console.log('[CheckoutPage] ⚠️ No displayItems available for orderSummary calculation');
    }
  }, [displayItems, coupon, shipping, offerDetails, displayMode, checkoutOfferDetails, isLoadingOffer, isCartMode]);
  
  // 🔑 DEBUG: Additional logging to see raw data sources
  useEffect(() => {
    console.log('[CheckoutPage] 🔍 DEBUG: Raw Data Sources:', {
      checkoutItemsRaw: checkoutItems,
      cartItemsRaw: cartItems,
      displayItemsRaw: displayItems,
      isBuyNowMode,
      displayMode,
      checkoutItemsTotal: checkoutItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      cartItemsTotal: cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      displayItemsTotal: displayItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
    });
  }, [checkoutItems, cartItems, displayItems, isBuyNowMode, displayMode]);

  // 🔑 DEBUG: Log shipping state changes
  useEffect(() => {
    console.log('[CheckoutPage] 🚚 Shipping State Changed:', {
      shipping,
      hasState: !!shipping?.state,
      stateValue: shipping?.state,
      shippingKeys: Object.keys(shipping || {}),
      shippingCalculation: shipping?.state ? calculateShippingCost(displayItems, shipping as ShippingInfo) : null
    });
  }, [shipping, displayItems]);

  // Debug logging
  useEffect(() => {
    console.log("Checkout Debug:", {
      currentFlow: !!currentFlow,
      isBuyNowMode,
      isCartMode,
      checkoutItems: checkoutItems?.length || 0,
      cartItems: cartItems.length,
      displayItems: displayItems?.length || 0,
      displayMode,
      hasItems,
      checkoutFlowLoading,
      localStorage: localStorage.getItem("cartItems") ? "has data" : "empty",
      sessionStorage: sessionStorage.getItem("buyNowItem") ? "has data" : "empty"
    });
  }, [currentFlow, isBuyNowMode, isCartMode, checkoutItems, cartItems, displayItems, displayMode, hasItems, checkoutFlowLoading]);

  // Handle cart loading state with checkout flow manager
  useEffect(() => {
    // The checkout flow manager handles all loading states
    // We just need to wait for it to complete
    if (checkoutFlowLoading) {
      console.log("Checkout: Checkout flow still loading, waiting...");
    } else {
      console.log("Checkout: Checkout flow loaded, items count:", checkoutItems?.length || 0);
    }
  }, [checkoutFlowLoading, checkoutItems]);

  // Enhanced fallback: Direct localStorage check and force cart restoration
  useEffect(() => {
    if (!hasItems && !checkoutFlowLoading) {
      // Double-check localStorage directly as a fallback
      const checkLocalStorage = () => {
        const storedCart = localStorage.getItem("cartItems");
        const storedBuyNow = sessionStorage.getItem("buyNowItem") || localStorage.getItem("buyNowItem");
        
        if (storedCart) {
          try {
            const parsed = JSON.parse(storedCart);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log("Checkout: Fallback - Found items in localStorage:", parsed);
              // Force a re-render by updating the cart context
              notifyCheckoutCartChanged();
              
              // Also try to manually restore the cart if context is still empty
              if (checkoutItems?.length === 0) {
                console.log("Checkout: Manually restoring cart from localStorage");
                // This will trigger the cart context to reload
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'cartItems',
                  newValue: storedCart
                }));
              }
            }
          } catch (error) {
            console.error("Checkout: Error parsing localStorage cart:", error);
          }
        }
        
        if (storedBuyNow) {
          try {
            const parsed = JSON.parse(storedBuyNow);
            if (parsed && parsed._id && parsed.name) {
              console.log("Checkout: Fallback - Found buy-now item in storage:", parsed);
              // Force a re-render by dispatching a storage event
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'buyNowItem',
                newValue: storedBuyNow
              }));
            }
          } catch (error) {
            console.error("Checkout: Error parsing stored buy-now:", error);
          }
        }
      };

      // Check after a short delay to allow contexts to load
      const timer = setTimeout(checkLocalStorage, 200);
      return () => clearTimeout(timer);
    }
  }, [hasItems, checkoutFlowLoading, notifyCheckoutCartChanged, checkoutItems?.length]);

  // Additional cart restoration attempt with longer delay
  useEffect(() => {
    if (!hasItems) {
      const delayedRestoration = () => {
        const storedCart = localStorage.getItem("cartItems");
        if (storedCart) {
          try {
            const parsed = JSON.parse(storedCart);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log("Checkout: Delayed restoration attempt - Found items:", parsed);
              // Force cart context refresh
              notifyCheckoutCartChanged();
            }
          } catch (error) {
            console.error("Checkout: Error in delayed restoration:", error);
          }
        }
      };

      // Try again after 1 second
      const timer = setTimeout(delayedRestoration, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasItems, notifyCheckoutCartChanged]);

  // Clear buy-now when user navigates away or completes checkout
  useEffect(() => {
    const handleBeforeUnload = () => {
      // The checkout flow manager will handle cleanup
      console.log("Checkout: Page unload, checkout flow manager will handle cleanup");
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // 🚀 NEW: Instant stock release on page exit/cancel
  useEffect(() => {
    const handlePageExit = async () => {
      if (checkoutSessionId && user?.mongoId) {
        try {
          console.log('🚀 Releasing stock instantly on page exit...');
          await fetch(`/api/checkout/session/${checkoutSessionId}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`,
            }
          });
          console.log('✅ Stock released successfully');
        } catch (error) {
          console.log('⚠️ Failed to release stock on exit:', error);
        }
      }
    };

    const handleBeforeUnload = () => {
      handlePageExit();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePageExit();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Stop managing the checkout session
      stopCheckoutSession();
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkoutSessionId, user?.mongoId, user?.token]);

  // We now create the checkout session in handlePhonePePayment when we have all the data

  // PhonePe payment handler with debounce
  const handlePhonePePayment = useCallback(async () => {
    if (processing) {
      console.log('[CheckoutPage] ⚠️ Payment already in progress, skipping...');
      return;
    }

    console.log('[CheckoutPage] 🚀 Starting PhonePe payment process...');
    console.log('[CheckoutPage] 📊 Payment data:', {
      orderSummary,
      displayItems,
      displayMode,
      shipping,
      coupon,
      user: user?.mongoId ? 'authenticated' : 'guest'
    });
    
    setProcessing(true);
    setPaymentError(null);
    
    try {
      // Proactively refresh token before payment to prevent session expiration
      if (user?.mongoId) {
        console.log('[CheckoutPage] 🔄 Proactively refreshing token before payment...');
        try {
          const refreshRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/user/refresh-token`,
            {
              method: 'POST',
              credentials: 'include',
            }
          );
          
          if (refreshRes.ok) {
            console.log('[CheckoutPage] ✅ Token proactively refreshed before payment');
          } else {
            console.log('[CheckoutPage] ⚠️ Proactive token refresh failed, proceeding with current token');
          }
        } catch (error) {
          console.log('[CheckoutPage] ⚠️ Proactive token refresh error, proceeding with current token:', error);
        }
      }
      
      // Validate required data
      if (!orderSummary || !orderSummary.total || orderSummary.total <= 0) {
        throw new Error('Invalid order total. Please check your order summary.');
      }
      
      if (!displayItems || displayItems.length === 0) {
        throw new Error('No items found for checkout. Please refresh the page.');
      }
      
      if (!shipping || !shipping.fullName || !shipping.email || !shipping.phone) {
        throw new Error('Please complete your shipping information before proceeding.');
      }

      // 🚀 NEW: Validate stock availability before creating session
      console.log('[CheckoutPage] 🔍 Validating stock availability...');
      
      // Safety check for displayItems
      if (!displayItems || !Array.isArray(displayItems) || displayItems.length === 0) {
        throw new Error('No items found for checkout. Please refresh the page.');
      }
      
      const stockValidationItems = displayItems.map(item => ({
        productId: item._id || item.id,
        size: item.size,
        quantity: item.quantity,
        name: item.name
      }));
      
      const stockValidation = await validateStockAvailability(stockValidationItems, user?.token);
      
      if (!stockValidation.isValid) {
        const unavailableItems = stockValidation.unavailableItems && Array.isArray(stockValidation.unavailableItems) && stockValidation.unavailableItems.length > 0
          ? stockValidation.unavailableItems.map(item => 
              `${item.name} (${item.size}) - Only ${item.availableQuantity} available, ${item.requestedQuantity} requested`
            ).join(', ')
          : 'Some items are not available';
        
        throw new Error(`❌ Stock unavailable: ${unavailableItems}. Please refresh and try again.`);
      }
      
      console.log('[CheckoutPage] ✅ Stock validation passed');

      // 🔑 CRITICAL FIX: Create checkout session with complete data
      console.log('[CheckoutPage] 🔄 Creating checkout session with complete data...');
      const sessionData = {
        source: displayMode,
        items: displayItems,
        userId: user?.mongoId,
        userEmail: user?.email || shipping?.email,
        shipping, // Include shipping info
        orderSummary, // Include order summary
        coupon // Include coupon if any
      };

      const sessionResponse = await authenticatedFetchJson('/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      if (!sessionResponse.success || !sessionResponse.data?.sessionId) {
        // 🚀 NEW: Better error handling for stock issues
        if (sessionResponse.message?.includes('stock') || sessionResponse.message?.includes('available')) {
          throw new Error('❌ Sorry! Some items in your cart are no longer available. Please refresh and try again.');
        }
        throw new Error(sessionResponse.message || 'Failed to create checkout session');
      }

      const checkoutSessionId = sessionResponse.data.sessionId;
      console.log('[CheckoutPage] ✅ Checkout session created:', checkoutSessionId);
      
      // Start managing the checkout session for cleanup
      if (user?.token) {
        startCheckoutSession(checkoutSessionId, user.token);
      }
      
      // 🔑 CRITICAL: Reserve stock before creating payment session
      console.log('[CheckoutPage] 🔄 Reserving stock for checkout session...');
      const stockReservationResponse = await authenticatedFetchJson(`/api/checkout/session/${checkoutSessionId}/reserve-stock`, {
        method: 'POST',
      });

      if (!stockReservationResponse.success) {
        throw new Error(stockReservationResponse.message || 'Failed to reserve stock');
      }
      
      console.log('[CheckoutPage] ✅ Stock reserved successfully');
      
      // 1. Create PhonePe payment session on backend
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/payment/phonepe/create-session';
      
      // Ensure each item has _id for stock validation
      const cartItems = displayItems.map(item => ({
        ...item,
        _id: item._id || item.id, // Use _id if available, fallback to id
        productId: item._id || item.id // Also include productId for compatibility
      }));

      const paymentData = {
        checkoutSessionId,
        shipping,
        cartItems,
        orderSummary,
        userId: user?.mongoId,
        email: user?.email || shipping.email,
        checkoutMode: displayMode
      };
      
      console.log('[CheckoutPage] 📤 Sending payment data to backend:', paymentData);
      
      // 🔑 FIX: Store optimistic order details in sessionStorage for instant UI on success page
      const optimisticOrderDetails = {
        items: cartItems,
        total: orderSummary.total,
        shippingInfo: shipping,
        paymentMethod: 'PhonePe',
        status: 'Paid', // Assume success for optimistic UI
        orderId: 'Processing...' // Placeholder until the real one is fetched
      };
      sessionStorage.setItem('optimisticOrderDetails', JSON.stringify(optimisticOrderDetails));

      const res = await authenticatedFetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      
      const data = await res.json();
      console.log('[CheckoutPage] 📥 Backend response:', data);
      
      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.message || 'Failed to create payment session');
      }

      console.log('[CheckoutPage] ✅ Payment session created, redirecting to PhonePe...');
      
      // Store success/failure URLs in localStorage for redirection after payment
      if (data.successUrl) localStorage.setItem('payment_success_url', data.successUrl);
      if (data.failureUrl) localStorage.setItem('payment_failure_url', data.failureUrl);
      
      // 2. Redirect to PhonePe payment page
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      console.error('[CheckoutPage] ❌ Payment error:', err);
      setPaymentError(err.message || 'Payment failed. Try again.');
      setProcessing(false);
    }
  }, [processing, orderSummary, displayItems, displayMode, shipping, coupon, user?.mongoId, user?.email]);
  return (
    <PageLoading loadingMessage="Loading Checkout..." minLoadingTime={1500}>
      <div className="min-h-screen bg-gray-50 py-6 px-2 sm:px-4 checkout-container">
        {/* Stepper/Progress Indicator */}
        <div className="max-w-5xl mx-auto mb-8 px-4 container-responsive">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-8">
              {/* Step 1: Cart/Product */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#473C66] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl ring-4 ring-[#473C66]/20">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <span className="mt-2 text-xs sm:text-sm font-medium text-[#473C66] hidden sm:block transition-colors duration-300">
                  {isBuyNowMode ? 'Product' : 'Cart'}
                </span>
              </div>

              {/* Connector Line */}
              <div className="w-8 sm:w-12 md:w-16 h-1 bg-[#473C66] rounded-full transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#473C66] to-[#473C66] rounded-full animate-pulse"></div>
              </div>

              {/* Step 2: Checkout */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#473C66] flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl ring-4 ring-[#473C66]/20 animate-pulse">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="mt-2 text-xs sm:text-sm font-medium text-[#473C66] hidden sm:block transition-colors duration-300">Checkout</span>
              </div>

              {/* Connector Line */}
              <div className="w-8 sm:w-12 md:w-16 h-1 bg-gray-200 rounded-full transition-all duration-500"></div>

              {/* Step 3: Payment */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="mt-2 text-xs sm:text-sm font-medium text-gray-400 hidden sm:block transition-colors duration-300">Payment</span>
              </div>

              {/* Connector Line */}
              <div className="w-8 sm:w-12 md:w-16 h-1 bg-gray-200 rounded-full transition-all duration-500"></div>

              {/* Step 4: Complete */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="mt-2 text-xs sm:text-sm font-medium text-gray-400 hidden sm:block transition-colors duration-300">Complete</span>
              </div>
            </div>
          </div>
          
          {/* Current Step Indicator */}
          <div className="text-center mt-4">
            <span className="inline-block px-4 py-2 bg-[#473C66] text-white text-sm font-medium rounded-full shadow-lg">
              Step 2 of 4: Checkout
            </span>
          </div>
        </div>

        {/* Show loading state while checkout flow is being restored */}
        {checkoutFlowLoading && (
          <div className="max-w-5xl mx-auto px-4 container-responsive">
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(71,60,102)] mx-auto mb-4"></div>
              <p className="text-gray-600">Restoring your checkout items...</p>
            </div>
          </div>
        )}

        {/* Show error state if no items found after loading */}
        {!checkoutFlowLoading && !hasItems && (
          <div className="max-w-5xl mx-auto px-4 container-responsive">
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
                <button 
                  onClick={() => {
                    console.log("Checkout: Manual retry - calling checkout flow retry function");
                    retryRestoreCart();
                  }}
                  className="inline-block bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Retry Restore Cart
                </button>
                <br />
                <Link 
                  href="/" 
                  className="inline-block bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Continue Shopping
                </Link>
                <br />
                <button 
                  onClick={() => {
                    // Open cart sidebar to show current state
                    openCartSidebar();
                  }}
                  className="inline-block border border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  View Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show checkout form only when we have items */}
        {!checkoutFlowLoading && hasItems && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-10 px-4 container-responsive">
            {/* Left Section: Product Preview + Shipping Form Only */}
            <div className="space-y-6">
              {/* 🔑 DEBUG: Log data being passed to ProductPreviewSection to ensure consistency */}
              {(() => {
                console.log('[CheckoutPage] 🔍 DEBUG: Data being passed to ProductPreviewSection:', {
                  displayItems: displayItems?.map(item => ({ 
                    name: item.name, 
                    price: item.price, 
                    quantity: item.quantity, 
                    subtotal: item.price * item.quantity 
                  })),
                  displayMode,
                  displayItemsTotal: displayItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
                  displayItemsSource: isBuyNowMode ? 'checkoutItems (buy-now)' : 'cartItems (cart)'
                });
                return null;
              })()}
              
              <ProductPreviewSection items={displayItems || []} />
              <ShippingForm value={shipping} onChange={setShipping} errors={errors.shipping} />
              {/* CouponInput: show only on mobile/tablet */}
              <div className="block md:hidden">
                <CouponInput value={coupon} onApply={setCoupon} />
              </div>
              {paymentError && (
                <div className="text-red-600 text-center font-semibold mb-2 flex flex-col items-center gap-2">
                  <span>{paymentError}</span>
                  {/* Only show retry button for non-authentication errors */}
                  {!paymentError.includes('session has expired') && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline border-red-400 text-red-700 hover:bg-red-50 mt-2"
                      onClick={handlePhonePePayment}
                      disabled={processing}
                    >
                      Retry PhonePe Payment
                    </button>
                  )}
                  {/* Show login redirect message for authentication errors */}
                  {paymentError.includes('session has expired') && (
                    <div className="text-sm text-gray-600 mt-2">
                      Redirecting to login page...
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Right Section: Order Summary + Confirm Button */}
            <div className="space-y-4">
              {/* CouponInput: show only on desktop */}
              <div className="hidden md:block">
                <CouponInput value={coupon} onApply={setCoupon} />
              </div>
              
              {/* 🔑 DEBUG: Log data being passed to OrderSummary to ensure consistency */}
              {(() => {
                console.log('[CheckoutPage] 🔍 DEBUG: Data being passed to OrderSummary:', {
                  displayItems: displayItems && Array.isArray(displayItems) ? displayItems.map(item => ({ 
                    name: item.name, 
                    price: item.price, 
                    quantity: item.quantity, 
                    subtotal: item.price * item.quantity 
                  })) : [],
                  displayMode,
                  displayItemsTotal: displayItems && Array.isArray(displayItems) ? displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0,
                  displayItemsSource: isBuyNowMode ? 'checkoutItems (buy-now)' : 'cartItems (cart)'
                });
                return null;
              })()}
              
              {/* 🔑 DEBUG: Log specific data being passed to OrderSummary */}
              {(() => {
                console.log("[CheckoutPage] DEBUG passing to OrderSummary:", {
                  mode: displayMode,
                  displayItems: displayItems && Array.isArray(displayItems) ? displayItems : [],
                  displayItemsTotal: displayItems && Array.isArray(displayItems) ? displayItems.reduce((s, i) => s + i.price * i.quantity, 0) : 0,
                  displayItemsSource: isBuyNowMode ? 'checkoutItems (buy-now)' : 'cartItems (cart)',
                  checkoutItemsCount: checkoutItems?.length || 0,
                  cartItemsCount: cartItems?.length || 0
                });
                return null;
              })()}
              
              <OrderSummary 
                key={`${displayMode}-${displayItems?.length || 0}-${displayItems?.[0]?.id || "none"}`}
                summary={orderSummary}
                cartItems={displayItems || []} 
                coupon={coupon} 
                offerDetails={checkoutOfferDetails || offerDetails}
                mode={displayMode}
                shippingInfo={shipping}
              />
              {/* Payment Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white text-lg font-semibold rounded-xl py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handlePhonePePayment}
                  disabled={
                    processing || 
                    !orderSummary?.total || 
                    orderSummary.total <= 0 || 
                    !shipping?.fullName || 
                    !shipping?.email || 
                    !shipping?.phone
                  }
                >
                  {processing ? (
                    <span className="loading loading-spinner loading-md"></span>
                  ) : !orderSummary?.total || orderSummary.total <= 0 ? (
                    'Complete Order Details'
                  ) : !shipping?.fullName || !shipping?.email || !shipping?.phone ? (
                    'Complete Shipping Info'
                  ) : (
                    'Confirm Order'
                  )}
                </button>
                
                {/* 🚀 NEW: Cancel Checkout Button */}
                {checkoutSessionId && (
                  <button
                    type="button"
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-xl py-2 transition"
                    onClick={async () => {
                      if (checkoutSessionId && user?.mongoId) {
                        try {
                          console.log('🚀 User manually cancelling checkout...');
                          await fetch(`/api/checkout/session/${checkoutSessionId}/cancel`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${user.token}`,
                            }
                          });
                          console.log('✅ Checkout cancelled, stock released');
                          // Stop managing the session
                          stopCheckoutSession();
                          router.push('/');
                        } catch (error) {
                          console.log('⚠️ Failed to cancel checkout:', error);
                          router.push('/');
                        }
                      } else {
                        router.push('/');
                      }
                    }}
                    disabled={processing}
                  >
                    Cancel Checkout
                  </button>
                )}
              </div>
              
              {/* Help text when button is disabled */}
              {(!orderSummary?.total || orderSummary.total <= 0) && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Please wait for order details to load...
                </p>
              )}
              {(!isSessionLoading && orderSummary?.total > 0 && (!shipping?.fullName || !shipping?.email || !shipping?.phone)) && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Please complete your shipping information above
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLoading>
  )
} 