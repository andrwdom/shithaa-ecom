"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export default function OrderSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return setError("No order ID provided.");
      setLoading(true);
      setError("");
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + `/api/orders/${orderId}`;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(apiUrl, {
          headers: token ? { token } : {},
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data.data) setOrder(data.data);
        else setError(data.message || "Order not found.");
      } catch (err) {
        setError("Could not fetch order. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
        <div className="text-lg font-semibold text-gray-700">Loading your order...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <div className="text-4xl text-red-500 mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="mb-6 text-gray-600">{error}</p>
        <a href="/" className="btn btn-primary">Back to Home</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 text-center flex flex-col items-center justify-center min-h-[70vh]">
      {/* Success Animation */}
      <div className="mb-6 animate-bounce-in">
        <CheckCircle className="h-20 w-20 text-green-500 drop-shadow-lg" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-green-700 mb-2">Order Placed Successfully!</h1>
      <p className="text-lg text-gray-700 mb-4">Thank you for shopping with Shitha. Your order is confirmed.</p>
      <div className="bg-white rounded-xl shadow p-6 mb-6 w-full max-w-lg mx-auto flex flex-col gap-2">
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Order ID:</div>
          <div className="font-mono">{order._id}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Amount Paid:</div>
          <div>₹{order.total || order.totalPrice}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Payment Method:</div>
          <div className="capitalize">{order.paymentMethod || 'N/A'}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Status:</div>
          <div className="capitalize">{order.paymentStatus || 'N/A'}</div>
        </div>
      </div>
      <div className="text-green-700 font-medium mb-2">Your invoice has been emailed to you.</div>
      <div className="text-gray-600 mb-6">You can also view your order in your account.</div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          className="px-6 py-3 rounded-xl bg-green-100 text-green-800 font-semibold shadow hover:bg-green-200 transition"
          onClick={() => router.push('/account')}
        >
          Track Order
        </button>
        <a
          href="/"
          className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold shadow hover:bg-gray-300 transition"
        >
          Back to Homepage
        </a>
      </div>
      {/* Confetti animation (optional) */}
      <style>{`
        @keyframes bounce-in { 0% { transform: scale(0.7); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
        .animate-bounce-in { animation: bounce-in 0.7s cubic-bezier(.68,-0.55,.27,1.55) both; }
      `}</style>
    </div>
  );
} 