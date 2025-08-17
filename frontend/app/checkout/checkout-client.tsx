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
import { getIdToken } from "firebase/auth";
import { Gift } from "lucide-react";

export default function CheckoutClient() {
  const { cartItems, clearCart, cartTotal, offerDetails, openCartSidebar } = useCart();
  const { buyNowItem, clearBuyNowItem, isLoading: buyNowLoading, restoreFromStorage } = useBuyNow();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get("mode") === "buynow" && !!buyNowItem;
  // Real-time sync: determine checkout items based on current state
  const checkoutItems = buyNowItem ? [buyNowItem] : cartItems;
  
  // Show loading state while buy now context is loading
  if (buyNowLoading && searchParams.get("mode") === "buynow") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#473C66] mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }
  
  // Show error if no items found in buy now mode
  if (searchParams.get("mode") === "buynow" && !buyNowItem && !buyNowLoading) {
    const retryRestoreBuyNow = () => {
      // Try to restore from storage using the context function
      restoreFromStorage();
      // If still no item after restoration attempt, reload the page
      setTimeout(() => {
        if (!buyNowItem) {
          window.location.reload();
        }
      }, 100);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">
              It looks like your order details couldn't be restored. This might happen if you refreshed the page or cleared your browser data.
            </p>
            <div className="space-y-3">
              <button
                onClick={retryRestoreBuyNow}
                className="w-full bg-[#473C66] hover:bg-[#3a3054] text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Retry Restore Order
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    street: "",
    address: "",
    address1: "",
    address2: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "",
    zipcode: "",
    pincode: "",
    zip: "",
    paymentMethod: "Online",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  }, [buyNowItem, clearBuyNowItem]);

  // Calculate discounted total using cartTotal from context
  const subtotal = cartTotal || checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPercentage) / 100) : 0;
  const total = subtotal - discount;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function ensureBackendToken() {
    const token = localStorage.getItem("token");
    if (token) return token;
    if (!user) return null;
    try {
      const idToken = await getIdToken(user, true); // force refresh
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (res.status === 401) {
        setError("Session expired or invalid. Please log in again.");
        setShowLogin(true);
        return null;
      }
      if (res.status === 500) {
        setError("Server error during authentication. Please try again or contact support.");
        setShowLogin(true);
        return null;
      }
      const data = await res.json();
      if (data.success && data.data.token) {
        localStorage.setItem("token", data.data.token);
        return data.data.token;
      } else {
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
      !form.street ||
      !form.city ||
      !form.state ||
      !form.country ||
      !form.zipcode ||
      !(form.email || user?.email)
    ) {
      setError("Please fill all required fields, including email.");
      return;
    }
    if (checkoutItems.length === 0) {
      setError(isBuyNow ? "No Buy Now item found." : "Your cart is empty.");
      return;
    }
    setLoading(true);
    const token = await ensureBackendToken();
    if (!token) {
      setLoading(false);
      return;
    }
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
        amount: total,
        shipping: {
          fullName: `${form.firstName} ${form.lastName}`,
          email: form.email || user.email,
          phone: form.phone,
          addressLine1: form.address1 || form.street || "",
          addressLine2: form.address2 || "",
          city: form.city,
          state: form.state,
          postalCode: form.pincode || form.zipcode || "",
          country: form.country || "India"
        },
        cartItems: itemsWithId,
        userId: user.mongoId || user.uid,
        email: form.email || user.email,
        checkoutSource: isBuyNow ? 'buy-now' : 'cart'
      };

      // Store order data in sessionStorage for fallback order creation
      const orderDataWithFlags = {
        ...orderData,
        isBuyNow: isBuyNow,
        timestamp: Date.now(), // Add timestamp for debugging
        redirectUrl: window.location.href // Add current URL for debugging
      };
      
      // Store in multiple locations for maximum persistence
      sessionStorage.setItem('pendingOrderData', JSON.stringify(orderDataWithFlags));
      localStorage.setItem('pendingOrderData', JSON.stringify(orderDataWithFlags));
      
      // Also store a backup with a different key
      localStorage.setItem('phonepeOrderData', JSON.stringify(orderDataWithFlags));
      
      // Store cart/buy-now items separately as backup
      if (isBuyNow && buyNowItem) {
        localStorage.setItem('phonepeBuyNowItem', JSON.stringify(buyNowItem));
      } else if (cartItems.length > 0) {
        localStorage.setItem('phonepeCartItems', JSON.stringify(cartItems));
      }
      
      console.log('Stored order data in multiple locations for maximum persistence:', orderDataWithFlags);
      console.log('User object during checkout:', {
        uid: user.uid,
        mongoId: user.mongoId,
        email: user.email,
        displayName: user.displayName
      });
      console.log('Storage content after storing:', {
        sessionStorage: {
          pendingOrderData: sessionStorage.getItem('pendingOrderData'),
          buyNowItem: sessionStorage.getItem('buyNowItem'),
          cartItems: sessionStorage.getItem('cartItems')
        },
        localStorage: {
          pendingOrderData: localStorage.getItem('pendingOrderData'),
          phonepeOrderData: localStorage.getItem('phonepeOrderData'),
          phonepeBuyNowItem: localStorage.getItem('phonepeBuyNowItem'),
          phonepeCartItems: localStorage.getItem('phonepeCartItems'),
          buyNowItem: localStorage.getItem('buyNowItem'),
          cartItems: localStorage.getItem('cartItems')
        }
      });

      console.log('Initiating PhonePe payment:', orderData);
      
      // Use the existing working PhonePe create-session endpoint
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/payment/phonepe/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(orderData),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Payment initiation failed');
      }

      const paymentData = await paymentResponse.json();
      
      if (paymentData.success && paymentData.redirectUrl) {
        // Redirect to PhonePe payment page
        window.location.href = paymentData.redirectUrl;
      } else {
        throw new Error('Payment gateway error');
      }

    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : "Payment failed. Please try again.";
      setError(errorMessage);
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
              Checkout {isBuyNow ? '(Buy Now)' : '(Cart)'}
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
                  <Label htmlFor="street">Street Address</Label>
                  <Input id="street" name="street" value={form.street} onChange={handleChange} required autoComplete="street-address" />
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
                  <Label htmlFor="zipcode">Zipcode</Label>
                  <Input id="zipcode" name="zipcode" value={form.zipcode} onChange={handleChange} required autoComplete="postal-code" />
                </div>
              </div>
              <Separator />
              <div>
                <h2 className="font-semibold mb-2 text-lg text-[rgb(71,60,102)]">
                  {isBuyNow ? 'Product Details' : 'Your Cart'}
                </h2>
                {isBuyNow && (
                  <Alert variant="default" className="mb-4">
                    <AlertDescription>
                      You are buying this item directly. Your cart items will be preserved for later. <button onClick={openCartSidebar} className="underline ml-2 hover:text-[rgb(71,60,102)]">Go to cart instead?</button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Loungewear Offer Display */}
                {offerDetails?.offerApplied && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Loungewear Offer Applied!</span>
                    </div>
                    <div className="text-xs text-green-700 space-y-1">
                      <p>• {offerDetails.offerDetails?.completeSets} set(s) of 3 for ₹1299 each</p>
                      {offerDetails.offerDetails?.remainingItems > 0 && (
                        <p>• {offerDetails.offerDetails.remainingItems} item(s) at ₹450 each</p>
                      )}
                      <p className="font-semibold">You saved ₹{offerDetails.offerDiscount}!</p>
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
                  {checkoutItems.map((item) => (
                    <li key={`${item.id}-${item.size}`} className="py-2 flex justify-between items-center">
                      <span className="font-medium text-gray-900">{item.name} <span className="text-xs text-gray-500">({item.size})</span> x {item.quantity}</span>
                      <span className="font-semibold text-[rgb(71,60,102)]">₹{item.price * item.quantity}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Offer Discount */}
                {offerDetails?.offerApplied && (
                  <div className="text-right text-green-700 font-semibold mt-2">
                    <div className="flex items-center justify-end gap-1">
                      <Gift className="h-3 w-3" />
                      <span>Loungewear Offer: -₹{offerDetails.offerDiscount}</span>
                    </div>
                  </div>
                )}
                
                {/* Coupon Discount */}
                {appliedCoupon && (
                  <div className="text-right text-green-700 font-semibold mt-2">Coupon Discount: -₹{discount}</div>
                )}
                
                <div className="text-right font-bold mt-4 text-xl text-[rgb(71,60,102)]">Total: ₹{total}</div>
              </div>
              <Separator />
              
              {/* Show cart items for buy now users */}
              {isBuyNow && cartItems.length > 0 && (
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