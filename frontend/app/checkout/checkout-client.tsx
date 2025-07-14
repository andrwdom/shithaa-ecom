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

export default function CheckoutClient() {
  const { cartItems, clearCart } = useCart();
  const { buyNowItem, clearBuyNowItem } = useBuyNow();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get("mode") === "buynow" && !!buyNowItem;
  const checkoutItems = isBuyNow ? [buyNowItem] : cartItems;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    country: "",
    zipcode: "",
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

  // Calculate discounted total
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/coupons/validate`, {
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
      // Prepare payload with all required fields
      const payload = {
        userInfo: {
          userId: user.mongoId,
          name: user.displayName || user.name || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email,
        },
        address: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email || user.email,
          street: form.street,
          address: form.address,
          address1: form.address1,
          address2: form.address2,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          country: form.country,
          pincode: form.pincode,
          zipcode: form.zipcode,
          zip: form.zip,
        },
        items: itemsWithId.map(item => ({
          _id: item._id, // Use _id instead of id
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          size: item.size
        })),
        couponUsed: appliedCoupon ? { code: appliedCoupon.code, discount: appliedCoupon.discountPercentage } : undefined,
        totalAmount: total,
        paymentStatus: 'test-paid',
        createdAt: new Date().toISOString(),
      };
      // Extra logging for debugging
      console.log('Order payload:', payload);
      console.log('Form state:', form);
      console.log('User:', user);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        setShowLogin(true);
        setLoading(false);
        return;
      }
      if (res.status === 500) {
        setError("Server error while placing order. Please try again or contact support.");
        setShowLogin(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        if (isBuyNow) clearBuyNowItem();
        else clearCart();
        router.push("/order-success");
      } else {
        setError(data.message || "Order failed.");
      }
    } catch (err) {
      setError("Order failed. Please try again.");
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
            <CardTitle className="text-3xl font-bold text-[rgb(71,60,102)]">Checkout</CardTitle>
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
                <h2 className="font-semibold mb-2 text-lg text-[rgb(71,60,102)]">Your Cart</h2>
                {isBuyNow && (
                  <Alert variant="default" className="mb-4">
                    <AlertDescription>
                      You are buying this item directly. <a href="/cart" className="underline ml-2">Go to cart instead?</a>
                    </AlertDescription>
                  </Alert>
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
                {appliedCoupon && (
                  <div className="text-right text-green-700 font-semibold mt-2">Discount: -₹{discount}</div>
                )}
                <div className="text-right font-bold mt-4 text-xl text-[rgb(71,60,102)]">Total: ₹{total}</div>
              </div>
              <Separator />
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