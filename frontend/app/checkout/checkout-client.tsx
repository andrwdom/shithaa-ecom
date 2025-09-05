"use client";
import { useState, useEffect } from "react";
import { useCart } from "@/components/cart-context";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/useAuth";
import LoginModal from "@/components/auth/LoginModal";
import { useBuyNow } from "@/components/buy-now-context";
import { useCheckoutFlow } from "@/components/checkout-flow-manager";
import { getCheckoutMode } from "@/components/checkout-flow-manager";
import { getIdToken } from "firebase/auth";
import { Gift } from "lucide-react";
import Link from "next/link";
import { setCheckoutSessionId } from "@/lib/checkoutSession";
import { getSourceValue } from "@/lib/checkoutUtils";

export default function CheckoutClient() {
  const { cartItems, clearCartAfterSuccessfulCheckout, cartTotal, offerDetails, openCartSidebar } = useCart();
  const { buyNowItem, clearBuyNowAfterSuccessfulCheckout } = useBuyNow();
  const { checkoutItems, isLoading, retryRestoreCart, isBuyNowMode, isCartMode } = useCheckoutFlow();
  
  // Debug logging
  useEffect(() => {
    console.log('CheckoutClient: Debug info:', {
      cartItems: cartItems.length,
      buyNowItem: buyNowItem ? 'exists' : 'null',
      checkoutItems: checkoutItems.length,
      isLoading,
      isBuyNowMode,
      isCartMode,
      offerDetails,
      url: window.location.href
    });
  }, [cartItems, buyNowItem, checkoutItems, isLoading, isBuyNowMode, isCartMode, offerDetails]);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    paymentMethod: 'Online'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Calculate total from checkout items
  const total = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // ⚡ GUARD RAILS: Validate checkout items before payment
  const currentMode = getCheckoutMode();
  if (currentMode === 'buynow' && (!buyNowItem || checkoutItems.length === 0)) {
    throw new Error("No buy-now item in session. Please try again.");
  }
  if (currentMode === 'cart' && cartItems.length === 0) {
    throw new Error("No cart items in session. Please try again.");
  }
  if (checkoutItems.length === 0) {
    throw new Error("No checkout items found. Please refresh and try again.");
  }

  // 🚨 STOCK VALIDATION: Check for out-of-stock items before allowing checkout
  const [outOfStockItems, setOutOfStockItems] = useState<any[]>([]);
  const [isCheckingStock, setIsCheckingStock] = useState(true);
  const [assetLoadError, setAssetLoadError] = useState(false);
  
  // Check for asset loading errors
  useEffect(() => {
    const checkAssetErrors = () => {
      // Check if CSS and JS files loaded properly
      const styleSheets = Array.from(document.styleSheets);
      const hasErrors = styleSheets.some(sheet => {
        try {
          return sheet.href && sheet.href.includes('_next/static') && sheet.cssRules.length === 0;
        } catch {
          return true; // CORS error or other issue
        }
      });
      
      if (hasErrors) {
        console.warn('Asset loading issues detected, attempting recovery...');
        setAssetLoadError(true);
        
        // Attempt to reload the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };
    
    // Check after a short delay to allow assets to load
    const timer = setTimeout(checkAssetErrors, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkStock = async () => {
      try {
        // Map checkoutItems to match the expected format for the checkout endpoint
        const itemsForValidation = checkoutItems.map(item => ({
          productId: item._id || item.id,
          name: item.name,
          size: item.size,
          quantity: item.quantity
        }));
        
        const response = await fetch(`/api/checkout/validate-stock?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsForValidation })
        });
        
        if (response.ok) {
          const data = await response.json();
          setOutOfStockItems(data.unavailableItems || []);
        }
      } catch (error) {
        console.error('Error checking stock:', error);
      } finally {
        setIsCheckingStock(false);
      }
    };
    
    if (checkoutItems.length > 0) {
      checkStock();
    }
  }, [checkoutItems]);

  // Block checkout if there are out-of-stock items
  if (isCheckingStock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking stock availability...</p>
        </div>
      </div>
    );
  }

  if (outOfStockItems.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              ⚠️ Out of Stock Items Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {outOfStockItems.map((item, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Size: {item.size}</p>
                  <p className="text-xs text-red-600 mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please remove out-of-stock items from your cart before proceeding to checkout.
            </p>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button 
              onClick={() => openCartSidebar()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Open Cart
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Validate all items have valid MongoDB ObjectIds
  const validHex24 = /^[0-9a-fA-F]{24}$/;
  const itemsWithId = checkoutItems
    .map(item => ({
      ...item,
      _id: item._id || item.id
    }))
    .filter(item => item._id && validHex24.test(item._id));
  if (itemsWithId.length !== checkoutItems.length) {
    setError("Some items in your cart are invalid. Please remove and re-add them.");
    setLoading(false);
    return;
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token) {
      setToken(token);
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        
        // Pre-fill form with user data
        setForm(prev => ({
          ...prev,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email || ''
        }));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Show loading state while checkout flow is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#473C66] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Show error state when no items are found
  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Checkout Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Cart</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#473C66] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="ml-2 text-sm font-medium text-[#473C66]">Checkout</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-400">Payment</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-400">Complete</span>
              </div>
            </div>
            <div className="text-center">
              <button className="bg-[#473C66] text-white px-6 py-2 rounded-lg font-semibold">
                Step 2 of 4: Checkout
              </button>
            </div>
          </div>

          {/* No Items Found */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">No Items Found</h1>
              <p className="text-gray-600 mb-6">
                It looks like your cart is empty or the items couldn't be restored. This might happen if you refreshed the page or cleared your browser data.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={retryRestoreCart}
                  className="w-full bg-[#473C66] hover:bg-[#473C66]/90 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Restore Cart
                </button>
                
                <Link
                  href="/"
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Continue Shopping
                </Link>
                
                <button
                  onClick={openCartSidebar}
                  className="w-full bg-white border-2 border-[#473C66] text-[#473C66] hover:bg-[#473C66] hover:text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  View Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const [showLogin, setShowLogin] = useState(false);
  const [coupon, setCoupon] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // Load applied coupon from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("appliedCoupon");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.code && typeof parsed.discountPercentage === "number") {
          setAppliedCoupon(parsed);
        }
      } catch {}
    }
  }, []);

  // Save applied coupon to localStorage
  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem("appliedCoupon", JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem("appliedCoupon");
    }
  }, [appliedCoupon]);

  // Autofill form with user info if logged in
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || (user.displayName ? user.displayName.split(" ")[0] : ""),
        lastName: prev.lastName || (user.displayName ? user.displayName.split(" ").slice(1).join(" ") : ""),
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Clear buy-now when user navigates away or completes checkout
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't clear buy-now item on page unload - let it persist
      // Only clear it after successful order completion
      console.log("Checkout: Page unloading, preserving buy-now item")
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [buyNowItem, clearBuyNowAfterSuccessfulCheckout]);

  // Calculate totals properly - use raw subtotal for display, apply offer discount separately
  // 🔧 CRITICAL FIX: Use cartItems for offer calculation, checkoutItems for display
  const displayItems = isCartMode ? cartItems : checkoutItems;
  const rawSubtotal = displayItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // 🔧 CRITICAL FIX: ALWAYS calculate offer discount directly to ensure it works
  let offerDiscount = 0;
  
  // Force offer calculation based on item names if categorySlug is missing
  const loungewearItems = displayItems.filter((item: any) => {
    const hasCategorySlug = item.categorySlug === 'zipless-feeding-lounge-wear' || item.categorySlug === 'non-feeding-lounge-wear';
    const hasLoungewearName = item.name && (
      item.name.toLowerCase().includes('lounge') || 
      item.name.toLowerCase().includes('loungewear')
    );
    return hasCategorySlug || hasLoungewearName;
  });
  
  const totalLoungewearQuantity = loungewearItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  if (totalLoungewearQuantity >= 3) {
    const completeSets = Math.floor(totalLoungewearQuantity / 3);
    const remainingItems = totalLoungewearQuantity % 3;
    const loungewearSubtotal = loungewearItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const offerTotal = (completeSets * 1299) + (remainingItems * 450);
    
    if (offerTotal < loungewearSubtotal) {
      offerDiscount = loungewearSubtotal - offerTotal;
      console.log('[Checkout] 🔧 CRITICAL: Forced offer calculation:', {
        totalLoungewearQuantity,
        completeSets,
        remainingItems,
        loungewearSubtotal,
        offerTotal,
        offerDiscount
      });
    }
  }
  
  const subtotalAfterOffer = rawSubtotal - offerDiscount;
  const couponDiscount = appliedCoupon ? Math.round((subtotalAfterOffer * appliedCoupon.discountPercentage) / 100) : 0;
  const finalTotal = subtotalAfterOffer - couponDiscount;
  
  // Debug logging to track total calculation
  console.log('[Checkout] Total calculation:', {
    isCartMode,
    displayItemsCount: displayItems.length,
    cartItemsCount: cartItems.length,
    checkoutItemsCount: checkoutItems.length,
    rawSubtotal,
    offerDiscount,
    subtotalAfterOffer,
    couponDiscount,
    finalTotal,
    offerDetails
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function ensureBackendToken() {
    console.log("🔍 DEBUG: ensureBackendToken called");
    const token = localStorage.getItem("token");
    console.log("🔍 DEBUG: Token from localStorage:", !!token);

    if (token) {
      console.log("✅ DEBUG: Using existing token from localStorage");
      return token;
    }

    if (!user) {
      console.log("❌ DEBUG: No user found, cannot get backend token");
      setError("Please log in to continue with your order.");
      setShowLogin(true);
      return null;
    }

    try {
      console.log("🔍 DEBUG: Getting Firebase ID token...");
      const idToken = await getIdToken(user, true); // force refresh
      console.log("✅ DEBUG: Got Firebase ID token, exchanging for backend token...");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      console.log("🔍 DEBUG: Firebase login response status:", res.status);

      if (res.status === 401) {
        console.log("❌ DEBUG: Firebase login returned 401");
        setError("Session expired or invalid. Please log in again.");
        setShowLogin(true);
        return null;
      }

      if (res.status === 500) {
        console.log("❌ DEBUG: Firebase login returned 500");
        setError("Server error during authentication. Please try again or contact support.");
        setShowLogin(true);
        return null;
      }

      const data = await res.json();
      console.log("🔍 DEBUG: Firebase login response data:", data);

      if (data.success && data.data.token) {
        console.log("✅ DEBUG: Successfully got backend token, storing in localStorage");
        localStorage.setItem("token", data.data.token);
        return data.data.token;
      } else {
        console.log("❌ DEBUG: Authentication failed:", data.message);
        setError(data.message || "Authentication failed. Please log in again.");
        setShowLogin(true);
        return null;
      }
    } catch (err) {
      setError("Network or server error during authentication. Please try again.");
      setShowLogin(true);
      return null;
    }
  }

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");
    setCouponLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({ code: coupon.toUpperCase(), discountPercentage: data.discountPercentage });
        setCouponSuccess("Coupon applied successfully");
        setCouponError("");
      } else {
        setCouponError(data.message || "Invalid or expired coupon");
        setCouponSuccess("");
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError("Network error. Please try again.");
      setCouponSuccess("");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCoupon("");
    setCouponError("");
    setCouponSuccess("");
  }

  // Block checkout if not authenticated
  function handleProtectedSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!user) {
      e.preventDefault();
      setShowLogin(true);
      return;
    }
    handleSubmit(e);
  }

  // On login success, restore form/cart state
  function handleLoginSuccess() {
    setShowLogin(false);
    if (user) {
      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || (user.displayName ? user.displayName.split(" ")[0] : ""),
        lastName: prev.lastName || (user.displayName ? user.displayName.split(" ").slice(1).join(" ") : ""),
        email: user.email || prev.email,
      }));
    }
  }

  // Update order payload to new structure
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!user) {
      setShowLogin(true);
      return;
    }
    // Updated validation: require email (from form or user)
    if (
      !form.firstName ||
      !form.lastName ||
      !form.phone ||
      !form.address1 ||
      !form.city ||
      !form.state ||
      !form.country ||
      !form.pincode ||
      !(form.email || user?.email)
    ) {
      setError("Please fill all required fields, including email.");
      return;
    }
    if (checkoutItems.length === 0) {
      setError(isBuyNowMode ? "No Buy Now item found." : "Your cart is empty.");
      return;
    }
    setLoading(true);
    console.log("🔍 DEBUG: Starting checkout process...");
    const token = await ensureBackendToken();
    console.log("🔍 DEBUG: Token obtained:", !!token);

    if (!token) {
      console.log("❌ DEBUG: No token available, stopping checkout");
      setLoading(false);
      return;
    }

    console.log("✅ DEBUG: Token available, proceeding with checkout");
    try {
      // Map checkoutItems to ensure each item has _id (string)
      const validHex24 = /^[a-fA-F0-9]{24}$/;
      const itemsWithId = checkoutItems
        .map(item => ({
          ...item,
          _id: typeof item._id === 'string' ? item._id : String(item._id),
        }))
        .filter(item => item._id && validHex24.test(item._id));
      if (itemsWithId.length !== checkoutItems.length) {
        setError("Some items in your cart are invalid. Please remove and re-add them.");
        setLoading(false);
        return;
      }

      // Prepare order data for payment processing
      const orderData = {
        amount: finalTotal,
        shipping: {
          fullName: `${form.firstName} ${form.lastName}`,
          email: form.email || user.email,
          phone: form.phone,
          addressLine1: form.address1 || "",
          addressLine2: form.address2 || "",
          city: form.city,
          state: form.state,
          postalCode: form.pincode || "",
          country: form.country || "India"
        },
        cartItems: itemsWithId,
        userId: user.mongoId || user.uid,
        email: form.email || user.email,
        source: getSourceValue(isBuyNowMode)
      };

      // Store order data in sessionStorage for fallback order creation
      const orderDataWithFlags = {
        ...orderData,
        isBuyNow: isBuyNowMode,
        timestamp: Date.now(), // Add timestamp for debugging
        redirectUrl: window.location.href // Add current URL for debugging
      };
      
      // Store in multiple locations for maximum persistence
      sessionStorage.setItem('pendingOrderData', JSON.stringify(orderDataWithFlags));
      localStorage.setItem('pendingOrderData', JSON.stringify(orderDataWithFlags));
      
      // Also store a backup with a different key
      localStorage.setItem('phonepeOrderData', JSON.stringify(orderDataWithFlags));
      
      // Store cart/buy-now items separately as backup with flow-specific keys
      if (isBuyNowMode) {
        localStorage.setItem('phonepeBuyNowItem', JSON.stringify(checkoutItems[0]));
        // Store buy-now specific order data
        localStorage.setItem('buyNowOrderData', JSON.stringify(orderDataWithFlags));
        // Also store in buy-now flow storage
        sessionStorage.setItem('buyNowOrderData', JSON.stringify(orderDataWithFlags));
      } else {
        localStorage.setItem('phonepeCartItems', JSON.stringify(checkoutItems));
        // Store cart specific order data
        localStorage.setItem('cartOrderData', JSON.stringify(orderDataWithFlags));
        // Also store in cart flow storage
        sessionStorage.setItem('cartOrderData', JSON.stringify(orderDataWithFlags));
      }
      
      // 🔧 FIX: Create checkout session first before payment
      const sourceValue = getSourceValue(isBuyNowMode);
      const checkoutSessionData = {
        source: sourceValue,
        items: checkoutItems.map(item => ({
          productId: item._id || item.id, // Backend expects 'productId'
          size: item.size,
          quantity: item.quantity
        })),
        email: form.email || user.email
      };

      console.log('🔍 DEBUG: Source value being sent:', sourceValue);
      console.log('🔍 DEBUG: Source value type:', typeof sourceValue);
      console.log('🔍 DEBUG: Source value length:', sourceValue.length);
      console.log('🔍 DEBUG: Source value === "buynow":', sourceValue === 'buynow');
      console.log('🔍 DEBUG: Source value === "cart":', sourceValue === 'cart');
      console.log('🔍 DEBUG: Token exists:', !!token);
      console.log('🔍 DEBUG: Token preview:', token ? `${token.substring(0, 20)}...` : 'NONE');
      console.log('🔍 DEBUG: API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
      console.log('🔍 DEBUG: Checkout items:', checkoutItems);
      console.log('🔍 DEBUG: Checkout items length:', checkoutItems.length);
      console.log('🔍 DEBUG: Checkout items structure:', checkoutItems.map(item => ({
        _id: item._id,
        id: item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity
      })));
      console.log('🔍 DEBUG: User data:', { 
        mongoId: user.mongoId, 
        uid: user.uid, 
        email: user.email,
        displayName: user.displayName 
      });
      console.log('🔍 DEBUG: isBuyNowMode:', isBuyNowMode);
      console.log('🔍 DEBUG: Final checkout session data being sent:', JSON.stringify(checkoutSessionData, null, 2));

      // 🔧 TEST: Check if backend is reachable first
      try {
        const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/health`);
        console.log('🔍 DEBUG: Backend health check status:', healthCheck.status);
        if (!healthCheck.ok) {
          const healthData = await healthCheck.json();
          console.error('🔍 DEBUG: Backend health check failed:', healthData);
        } else {
          const healthData = await healthCheck.json();
          console.log('🔍 DEBUG: Backend health check success:', healthData);
        }
      } catch (healthError) {
        console.error('🔍 DEBUG: Backend health check failed:', healthError);
        throw new Error('Backend server is not reachable. Please check your connection.');
      }

      // 🔧 TEST: Check if checkout endpoint is accessible with minimal data
      try {
        const testData = {
          source: 'cart',
          items: [],
          email: 'test@test.com'
        };
        console.log('🔍 DEBUG: Testing checkout endpoint with data:', testData);
        
        const checkoutTest = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/checkout/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
          body: JSON.stringify(testData)
        });
        console.log('🔍 DEBUG: Checkout endpoint test status:', checkoutTest.status);
        if (!checkoutTest.ok) {
          const testResponse = await checkoutTest.json();
          console.error('🔍 DEBUG: Checkout endpoint test failed:', testResponse);
        } else {
          const testResponse = await checkoutTest.json();
          console.log('🔍 DEBUG: Checkout endpoint test success:', testResponse);
        }
      } catch (testError) {
        console.error('🔍 DEBUG: Checkout endpoint test failed:', testError);
      }

      const checkoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/checkout/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify(checkoutSessionData)
      });

      console.log('🔍 DEBUG: Checkout response status:', checkoutRes.status);
      console.log('🔍 DEBUG: Checkout response ok:', checkoutRes.ok);

      if (!checkoutRes.ok) {
        const checkoutError = await checkoutRes.json();
        console.error('🔍 DEBUG: Checkout error response:', checkoutError);
        throw new Error(checkoutError.message || `Checkout session creation failed (${checkoutRes.status})`);
      }

      const checkoutData = await checkoutRes.json();
      console.log('✅ Checkout session created successfully:', checkoutData);
      const createdSessionId = checkoutData?.data?.sessionId;
      if (createdSessionId) {
        setCheckoutSessionId(createdSessionId);
      }

      // Now create PhonePe payment session with the checkout session data (pass only sessionId)
      console.log("🔍 DEBUG: Creating PhonePe payment session...");
      console.log("🔍 DEBUG: Session ID:", createdSessionId);
      console.log("🔍 DEBUG: Token being sent:", !!token);

      const paymentRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment/phonepe/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sessionId: createdSessionId, shipping: {
          fullName: `${form.firstName} ${form.lastName}`,
          email: form.email || user.email,
          phone: form.phone,
          addressLine1: form.address1 || "",
          addressLine2: form.address2 || "",
          city: form.city,
          state: form.state,
          postalCode: form.pincode || "",
          country: form.country || "India"
        } })
      });

      console.log("🔍 DEBUG: PhonePe session creation response status:", paymentRes.status);
      console.log("🔍 DEBUG: PhonePe session creation response ok:", paymentRes.ok);

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        console.log("🔍 DEBUG: PhonePe session creation response data:", paymentData);

        if (paymentData.success && paymentData.data?.redirectUrl) {
          console.log("✅ DEBUG: PhonePe session created successfully, redirecting to:", paymentData.data.redirectUrl);
          // Store the PhonePe transaction ID for better tracking
          if (paymentData.data.phonepeTransactionId) {
            const orderDataWithTransaction = {
              ...orderDataWithFlags,
              phonepeTransactionId: paymentData.data.phonepeTransactionId
            };
            
            // Update stored data with transaction ID
            sessionStorage.setItem('pendingOrderData', JSON.stringify(orderDataWithTransaction));
            localStorage.setItem('pendingOrderData', JSON.stringify(orderDataWithTransaction));
            localStorage.setItem('phonepeOrderData', JSON.stringify(orderDataWithTransaction));
            
            console.log('Stored order data with PhonePe transaction ID:', paymentData.data.phonepeTransactionId);
          }
          
          // ⚡ CLEAN UP: Clear flow-specific storage before redirect to keep flows isolated
          const currentMode = getCheckoutMode();
          if (currentMode === 'buynow') {
            // Clear only buy-now storage after successful payment
            clearBuyNowAfterSuccessfulCheckout();
            console.log('Cleared buy-now storage after successful payment');
          } else {
            // Clear only cart storage after successful payment
            clearCartAfterSuccessfulCheckout();
            console.log('Cleared cart storage after successful payment');
          }
          
          // Redirect to PhonePe payment gateway
          window.location.href = paymentData.data.redirectUrl;
        } else {
          throw new Error(paymentData.message || 'Failed to create payment session');
        }
      } else {
        const errorData = await paymentRes.json();
        console.error('❌ DEBUG: PhonePe session creation failed:', errorData);
        console.error('❌ DEBUG: Response status:', paymentRes.status);

        if (paymentRes.status === 401) {
          console.error('❌ DEBUG: Authentication failed - token might be invalid');
          setError("Your session has expired. Please log in again to continue with your order.");
          setShowLogin(true);
          setLoading(false);
          return;
        }

        throw new Error(errorData.message || `Payment session creation failed (${paymentRes.status})`);
      }

    } catch (err) {
      console.error('Payment error:', err);
      
      // ⚡ FAILURE HANDLING: Preserve items for retry (don't clear storage)
      const currentMode = getCheckoutMode();
      let errorMessage = err instanceof Error ? err.message : "Payment failed. Please try again.";
      
      if (currentMode === 'buynow') {
        if (errorMessage.includes('buy-now item')) {
          errorMessage = "Buy-now item was lost. Please return to the product page and try again.";
        } else if (errorMessage.includes('checkout items')) {
          errorMessage = "Buy-now checkout items were lost. Please refresh and try again.";
        } else {
          errorMessage = "Buy-now payment failed. Your item is still saved - please try again.";
        }
      } else {
        if (errorMessage.includes('cart items')) {
          errorMessage = "Cart items were lost. Please return to your cart and try again.";
        } else if (errorMessage.includes('checkout items')) {
          errorMessage = "Cart checkout items were lost. Please refresh and try again.";
        } else {
          errorMessage = "Cart payment failed. Your items are still saved - please try again.";
        }
      }
      
      setError(errorMessage);
      
      // 🔧 IMPORTANT: On failure, DO NOT clear storage - items remain for retry
      console.log('Payment failed - items preserved for retry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Only show modal if user is not logged in */}
      <LoginModal open={showLogin && !user} onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-2">
        <Card className="w-full max-w-2xl shadow-xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-[rgb(71,60,102)]">
              Checkout {isBuyNowMode ? '(Buy Now)' : '(Cart)'}
            </CardTitle>
          </CardHeader>
          <Separator />
          <form onSubmit={handleProtectedSubmit}>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required autoComplete="given-name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required autoComplete="family-name" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" />
                </div>
                <div>
                  <Label htmlFor="email">Email {user ? "(from your account)" : "(optional)"}</Label>
                  <Input id="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" disabled={!!user} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address1">Street Address</Label>
                  <Input id="address1" name="address1" value={form.address1} onChange={handleChange} required autoComplete="street-address" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" value={form.city} onChange={handleChange} required autoComplete="address-level2" />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" value={form.state} onChange={handleChange} required autoComplete="address-level1" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" value={form.country} onChange={handleChange} required autoComplete="country" />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" name="pincode" value={form.pincode} onChange={handleChange} required autoComplete="postal-code" />
                </div>
              </div>
              <Separator />
              <div>
                <h2 className="font-semibold mb-2 text-lg text-[rgb(71,60,102)]">
                  {isBuyNowMode ? 'Product Details' : 'Your Cart'}
                </h2>
                {isBuyNowMode && (
                  <Alert variant="default" className="mb-4">
                    <AlertDescription>
                      You are buying this item directly. Your cart items will be preserved for later. <button onClick={openCartSidebar} className="underline ml-2 hover:text-[rgb(71,60,102)]">Go to cart instead?</button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Loungewear Offer Display */}
                {offerDiscount > 0 && (
                  <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Gift className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-green-800">🎉 Loungewear Offer Applied!</span>
                        <div className="text-sm text-green-600">Special pricing for 3+ items</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="text-sm text-green-700 space-y-1">
                        {(() => {
                          const totalLoungewearQuantity = loungewearItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
                          const completeSets = Math.floor(totalLoungewearQuantity / 3);
                          const remainingItems = totalLoungewearQuantity % 3;
                          
                          return (
                            <>
                              {completeSets > 0 && (
                                <p className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  {completeSets} set(s) of 3 for ₹1299 each
                                </p>
                              )}
                              {remainingItems > 0 && (
                                <p className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  {remainingItems} item(s) at ₹450 each
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-green-800 font-semibold">Total Savings:</span>
                          <span className="text-xl font-bold text-green-800">₹{offerDiscount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Coupon UI */}
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Enter coupon code"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value.toUpperCase())}
                    className="w-full sm:w-64 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[rgb(71,60,102)]"
                    disabled={!!appliedCoupon || couponLoading}
                  />
                  {!appliedCoupon ? (
                    <Button
                      type="button"
                      className="bg-[rgb(71,60,102)] text-white px-4 py-2 rounded"
                      disabled={couponLoading || !coupon}
                      onClick={handleApplyCoupon}
                    >
                      {couponLoading ? (
                        <span className="flex items-center gap-2"><span className="loading loading-spinner loading-xs"></span> Applying...</span>
                      ) : "Apply"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                      onClick={handleRemoveCoupon}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {couponError && <div className="text-red-600 text-sm mb-2">{couponError}</div>}
                {couponSuccess && <div className="text-green-600 text-sm mb-2">{couponSuccess}</div>}
                <ul className="divide-y">
                  {displayItems.map((item) => (
                    <li key={`${item.id}-${item.size}`} className="py-2 flex justify-between items-center">
                      <span className="font-medium text-gray-900">{item.name} <span className="text-xs text-gray-500">({item.size})</span> x {item.quantity}</span>
                      <span className="font-semibold text-[rgb(71,60,102)]">₹{item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Subtotal */}
                <div className="text-right font-semibold mt-2 text-gray-700">
                  Subtotal: ₹{rawSubtotal}
                </div>
                
                {/* Offer Discount */}
                {offerDiscount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 my-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-600"/>
                        <div>
                          <span className="text-green-800 font-semibold text-sm">Loungewear Offer Applied!</span>
                          <div className="text-xs text-green-600">
                            {(() => {
                              const totalLoungewearQuantity = loungewearItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
                              const completeSets = Math.floor(totalLoungewearQuantity / 3);
                              const remainingItems = totalLoungewearQuantity % 3;
                              
                              if (completeSets > 0 && remainingItems === 0) {
                                return `${completeSets} set(s) of 3 for ₹1299 each`;
                              } else if (completeSets > 0 && remainingItems > 0) {
                                return `${completeSets} set(s) of 3 + ${remainingItems} item(s) at ₹450 each`;
                              } else {
                                return "3+ loungewear items qualify for special pricing";
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-800 font-bold text-lg">-₹{offerDiscount}</div>
                        <div className="text-xs text-green-600">You saved!</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Coupon Discount */}
                {appliedCoupon && (
                  <div className="text-right text-green-700 font-semibold mt-2">Coupon Discount: -₹{couponDiscount}</div>
                )}
                
                <div className="text-right font-bold mt-4 text-xl text-[rgb(71,60,102)]">Total: ₹{finalTotal}</div>
              </div>
              <Separator />
              
              {/* Show cart items for buy now users */}
              {isBuyNowMode && cartItems.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-semibold mb-3 text-lg text-[rgb(71,60,102)]">Your Cart Items (Preserved)</h2>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      These items are still in your cart and will be available after checkout:
                    </p>
                    <ul className="space-y-2">
                      {cartItems.map((item) => (
                        <li key={`${item.id}-${item.size}`} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{item.name} <span className="text-gray-500">({item.size})</span> x {item.quantity}</span>
                          <span className="font-medium text-gray-900">₹{item.price * item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button 
                        onClick={openCartSidebar}
                        className="text-sm text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 underline font-medium"
                      >
                        View Full Cart ({cartItems.length} items)
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h2 className="font-semibold mb-2 text-lg text-[rgb(71,60,102)]">Payment Method</h2>
                <RadioGroup
                  className="flex gap-6"
                  value={form.paymentMethod}
                  onValueChange={(val) => setForm((f) => ({ ...f, paymentMethod: val }))}
                  name="paymentMethod"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Online" id="online" />
                    <Label htmlFor="online">Online Payment</Label>
                  </div>
                </RadioGroup>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full h-12 rounded-md bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white font-bold text-base tracking-wide transition shadow-md"
                disabled={loading}
              >
                {loading ? "Placing Order..." : "Place Order"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
} 