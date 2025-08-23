"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { authenticatedFetch } from '@/lib/api-utils';

export default function OrderSuccessClient() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh]"><div className="loading loading-spinner loading-lg text-green-600"></div></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutSummary, setCheckoutSummary] = useState<any>(null);

  useEffect(() => {
    // If no orderId is provided, show error
    if (!orderId) {
      setError("No order ID provided. Please check your order confirmation email or contact support.");
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        
        // 🔑 FIX: Fetch order details using the correct, newly created endpoint for public order IDs.
        const orderRes = await authenticatedFetch(`${apiUrl}/api/orders/by-orderid/${orderId}`);
        const orderData = await orderRes.json();
        
        if (orderRes.ok && orderData.success) {
          setOrder(orderData.data);
        } else {
          setError(orderData.message || 'Failed to fetch order details');
          return;
        }
        
        // 🔑 REMOVED: Fetching checkout session summary is redundant.
        // The required data is already in the order object.
        
      } catch (error: any) {
        setError(error.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, router]);

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

  const isPaid = order.paymentStatus === 'paid' || order.status === 'Paid';
  const isFailed = order.paymentStatus === 'failed' || order.status === 'Payment Failed';

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 text-center flex flex-col items-center justify-center min-h-[70vh]">
      {/* Success/Failure Animation */}
      <div className="mb-6 animate-bounce-in">
        {isPaid ? (
          <CheckCircle className="h-20 w-20 text-green-500 drop-shadow-lg" />
        ) : (
          <div className="text-6xl text-red-500">❌</div>
        )}
      </div>
      <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isPaid ? 'text-green-700' : 'text-red-700'}`}>{isPaid ? 'Order Placed Successfully!' : 'Payment Failed'}</h1>
      <p className="text-lg text-gray-700 mb-4">{isPaid ? 'Thank you for shopping with Shithaa. Your order is confirmed.' : 'Your payment was not successful. Please try again.'}</p>
      <div className="bg-white rounded-xl shadow p-6 mb-6 w-full max-w-lg mx-auto flex flex-col gap-2">
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Order ID:</div>
          <div className="font-mono">{order.orderId}</div>
        </div>
        {order.phonepeTransactionId && (
          <div className="flex flex-wrap justify-between text-left text-gray-800">
            <div className="font-semibold">Transaction ID:</div>
            <div className="font-mono">{order.phonepeTransactionId}</div>
          </div>
        )}
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Amount Paid:</div>
          <div>₹{order.amountPaid || order.total || order.totalPrice}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Payment Method:</div>
          <div className="capitalize">{order.paymentMethod || 'N/A'}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Status:</div>
          <div className={`capitalize font-bold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>{order.paymentStatus || order.status || 'N/A'}</div>
        </div>
        {order.items && order.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="font-semibold text-left text-gray-800 mb-2">Order Items:</div>
            <div className="space-y-2">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm text-gray-700">
                  <span>{item.name} (Size: {item.size}) x {item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {isPaid ? (
        <>
          <div className="text-green-700 font-medium mb-2">Your invoice has been emailed to you.</div>
          <div className="text-gray-600 mb-6">You can also view your order in your account.</div>
          
          {/* Cart preservation message for buy now users */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-lg mx-auto">
            <div className="text-blue-800 text-sm">
              <p className="font-medium mb-2">🛒 Your cart items are still available!</p>
              <p className="text-blue-700">
                If you had other items in your cart, they're still there and ready for your next purchase.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              className="px-6 py-3 rounded-xl bg-green-100 text-green-800 font-semibold shadow hover:bg-green-200 transition"
              onClick={() => router.push('/account')}
            >
              Track Order
            </button>
            <button
              className="px-6 py-3 rounded-xl bg-blue-100 text-blue-800 font-semibold shadow hover:bg-blue-200 transition"
              onClick={() => {
                // Open cart sidebar if available, otherwise go to homepage
                if (typeof window !== 'undefined' && window.location.pathname.includes('order-success')) {
                  // Try to trigger cart sidebar open
                  const event = new CustomEvent('openCartSidebar');
                  window.dispatchEvent(event);
                  // Fallback to homepage if cart sidebar doesn't open
                  setTimeout(() => {
                    if (window.location.pathname.includes('order-success')) {
                      window.location.href = '/';
                    }
                  }, 100);
                } else {
                  window.location.href = '/';
                }
              }}
            >
              Continue Shopping
            </button>
            <a
              href="/"
              className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold shadow hover:bg-gray-300 transition"
            >
              Back to Homepage
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="text-red-600 font-medium mb-4">If money was deducted, it will be auto-refunded by your bank. You can retry payment below.</div>
          <button
            className="px-6 py-3 rounded-xl bg-red-100 text-red-800 font-semibold shadow hover:bg-red-200 transition"
            onClick={() => router.push('/checkout')}
          >
            Retry Payment
          </button>
        </>
      )}
      {/* Confetti animation (optional) */}
      <style>{`
        @keyframes bounce-in { 0% { transform: scale(0.7); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
        .animate-bounce-in { animation: bounce-in 0.7s cubic-bezier(.68,-0.55,.27,1.55) both; }
      `}</style>
    </div>
  );
} 