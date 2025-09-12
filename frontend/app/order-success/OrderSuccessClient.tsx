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
  const transactionId = params.get("transactionId"); // 🔑 ADDED: Get transactionId from URL
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optimisticOrder, setOptimisticOrder] = useState<any>(null); // For instant UI

  useEffect(() => {
    // 🔑 FIX: Load order details from multiple storage locations for maximum reliability
    const storageKeys = [
      'pendingOrderData',
      'phonepeOrderData',
      'buyNowOrderData',
      'cartOrderData',
      'optimisticOrderDetails'
    ];
    
    // Try to find order data in any storage location
    for (const key of storageKeys) {
      const data = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (data) {
        try {
          const details = JSON.parse(data);
          // Add payment status since we know the payment was successful
          const orderDetails = {
            ...details,
            paymentStatus: 'paid',
            status: 'Order Placed',
            orderStatus: 'Confirmed'
          };
          setOptimisticOrder(orderDetails);
          console.log('Found order details in storage:', key);
          // Clean up storage
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
          break;
      } catch (e) {
          console.error(`Failed to parse order details from ${key}:`, e);
        }
      }
    }

    // If no ID is provided, show error
    if (!orderId && !transactionId) {
      if (!optimisticOrder) { // Only error if we have no order data at all
        setError("No order or transaction ID provided. Please check your order confirmation email or contact support.");
        setLoading(false);
      }
      return;
    }

    const fetchOrderDetails = async () => {
      // Don't show main loader if we have optimistic data
      if (!optimisticOrder) {
        setLoading(true);
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      let endpoint = '';
      if (orderId) {
        endpoint = `${apiUrl}/api/orders/by-orderid/${orderId}`;
      } else if (transactionId) {
        endpoint = `${apiUrl}/api/payment/order/${transactionId}`;
      }

      // 🔑 FIX: Implement a more robust retry mechanism to handle database update delays.
      for (let attempt = 1; attempt <= 20; attempt++) {
        try {
          console.log(`Fetching order details, attempt #${attempt}`);
          const orderRes = await authenticatedFetch(endpoint);
          const responseData = await orderRes.json();
          
          if (orderRes.ok && responseData.success) {
            const orderDetails = responseData.data;
            if (orderDetails) {
              // Check for a final, successful status
              const isPaid = orderDetails.paymentStatus === 'paid' || orderDetails.status === 'Paid' || orderDetails.status === 'Order Placed';
              if (isPaid) {
                setOrder(orderDetails);
                setError(""); // Clear any previous errors
                setLoading(false);
                return; // Success! Exit the loop.
              }
              console.log(`Order status is '${orderDetails.paymentStatus}', retrying...`);
            } else {
              // If the API returns success but no data, that's a hard failure.
              setError("Order data not found for this transaction.");
              setLoading(false);
              return;
            }
          } else if (orderRes.status === 404) {
            // A 404 is a definitive "not found", so we stop retrying.
            setError(responseData.message || 'Order not found. It may still be processing.');
            setLoading(false);
            return;
          }
          // For other non-ok responses, we'll just let it retry.
        } catch (error: any) {
          console.error(`Attempt ${attempt} failed:`, error.message);
          // Don't set a fatal error on network issues, just let it retry.
        }
        
        // Wait 1.5 seconds before the next attempt.
        if (attempt < 20) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      // If all retries fail, show a reassuring fallback message.
      setError("Your payment was successful and your order is being processed. You can view the final details on your account page shortly.");
      setLoading(false);
    };

    fetchOrderDetails();
  }, [orderId, transactionId, router]);

  if (loading && !optimisticOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
        <div className="text-lg font-semibold text-gray-700">Loading your order...</div>
      </div>
    );
  }

  // Use the confirmed order if available, otherwise use the optimistic one
  const displayOrder = order || optimisticOrder;

  if (error && !displayOrder) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <div className="text-4xl text-red-500 mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-4">Order Confirmation Pending</h1>
        <p className="mb-6 text-gray-600">{error}</p>
        <a href="/" className="btn btn-primary">Back to Home</a>
      </div>
    );
  }

  if (!displayOrder) {
    // This state is hit if there's no optimistic data and the fetch is loading or has an error.
    // A more specific loading or error screen is shown above. This is a fallback.
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-gray-500 animate-spin mb-4" />
        <div className="text-lg font-semibold text-gray-700">Confirming order details...</div>
      </div>
    );
  }

  const isPaid = displayOrder.paymentStatus === 'paid' || displayOrder.status === 'Paid' || displayOrder.status === 'Order Placed';
  const isFailed = displayOrder.paymentStatus === 'failed' || displayOrder.status === 'Payment Failed';

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 text-center flex flex-col items-center justify-center min-h-[70vh] container-responsive">
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
          <div className="font-mono">{displayOrder.orderId}</div>
        </div>
        {displayOrder.phonepeTransactionId && (
          <div className="flex flex-wrap justify-between text-left text-gray-800">
            <div className="font-semibold">Transaction ID:</div>
            <div className="font-mono">{displayOrder.phonepeTransactionId}</div>
          </div>
        )}
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Amount Paid:</div>
          <div>₹{displayOrder.amountPaid || displayOrder.total || displayOrder.totalPrice}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Payment Method:</div>
          <div className="capitalize">{displayOrder.paymentMethod || 'N/A'}</div>
        </div>
        <div className="flex flex-wrap justify-between text-left text-gray-800">
          <div className="font-semibold">Status:</div>
          <div className={`capitalize font-bold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>{displayOrder.paymentStatus || displayOrder.status || 'N/A'}</div>
        </div>
        {displayOrder.items && displayOrder.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="font-semibold text-left text-gray-800 mb-2">Order Items:</div>
            <div className="space-y-2">
              {displayOrder.items.map((item: any, index: number) => (
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