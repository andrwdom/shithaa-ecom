'use client';

import { useState, useEffect } from 'react';
import { randomUUID } from 'crypto';

/**
 * Reservation-based checkout component
 * Demonstrates the complete flow from reservation to payment confirmation
 */
export default function ReservationCheckout({ items, userId, onSuccess, onError }) {
  const [reservationId, setReservationId] = useState(null);
  const [reservationStatus, setReservationStatus] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Generate idempotency key for this checkout session
  const idempotencyKey = randomUUID();

  /**
   * Create reservation for checkout items
   */
  const createReservation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userId,
          items,
          idempotencyKey,
          holdMinutes: 15
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create reservation');
      }

      setReservationId(data.data.reservationId);
      setExpiresAt(new Date(data.data.expiresAt));
      setReservationStatus('reserved');

      // Start polling for status updates
      startStatusPolling(data.data.reservationId);

      return data.data;

    } catch (err) {
      setError(err.message);
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start payment process with reservation
   */
  const startPayment = async () => {
    if (!reservationId) {
      setError('No reservation found');
      return;
    }

    try {
      // Redirect to payment gateway with reservation details
      const paymentData = {
        reservationId,
        amount: items.reduce((total, item) => total + (item.price * item.quantity), 0),
        currency: 'INR',
        returnUrl: `${window.location.origin}/checkout/success?reservationId=${reservationId}`,
        cancelUrl: `${window.location.origin}/checkout/cancel?reservationId=${reservationId}`,
        metadata: {
          reservationId,
          idempotencyKey
        }
      };

      // Example: Redirect to PhonePe or your payment gateway
      // This is a placeholder - implement based on your payment provider
      console.log('Redirecting to payment with:', paymentData);
      
      // For testing, simulate payment success
      simulatePaymentSuccess();

    } catch (err) {
      setError('Failed to start payment: ' + err.message);
    }
  };

  /**
   * Simulate payment success (for testing)
   */
  const simulatePaymentSuccess = async () => {
    try {
      const response = await fetch('/api/webhook/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          paymentStatus: 'SUCCESS',
          paymentId: `PAY_${Date.now()}`,
          gatewayPayload: {
            transactionId: `TXN_${Date.now()}`,
            amount: items.reduce((total, item) => total + (item.price * item.quantity), 0),
            status: 'SUCCESS'
          }
        })
      });

      if (response.ok) {
        setReservationStatus('confirmed');
        // Poll for order creation
        pollForOrder();
      }
    } catch (err) {
      console.error('Payment simulation failed:', err);
    }
  };

  /**
   * Poll for reservation status updates
   */
  const startStatusPolling = (reservationId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/checkout/reservation/${reservationId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });

        if (response.ok) {
          const data = await response.json();
          const reservation = data.data;
          
          setReservationStatus(reservation.status);
          
          if (reservation.status === 'confirmed') {
            clearInterval(pollInterval);
            pollForOrder();
          } else if (reservation.status === 'expired' || reservation.status === 'cancelled') {
            clearInterval(pollInterval);
            setError('Reservation expired or cancelled');
          }
        }
      } catch (err) {
        console.error('Status polling failed:', err);
      }
    }, 5000); // Poll every 5 seconds

    // Store interval for cleanup
    return pollInterval;
  };

  /**
   * Poll for order creation after payment confirmation
   */
  const pollForOrder = async () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/checkout/reservation/${reservationId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });

        if (response.ok) {
          const data = await response.json();
          const reservation = data.data;
          
          if (reservation.metadata?.orderId) {
            setOrderId(reservation.metadata.orderId);
            clearInterval(pollInterval);
            onSuccess?.({
              reservationId,
              orderId: reservation.metadata.orderId,
              status: 'completed'
            });
          }
        }
      } catch (err) {
        console.error('Order polling failed:', err);
      }
    }, 2000); // Poll every 2 seconds

    return pollInterval;
  };

  /**
   * Cancel reservation
   */
  const cancelReservation = async () => {
    if (!reservationId) return;

    try {
      const response = await fetch(`/api/checkout/reservation/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (response.ok) {
        setReservationStatus('cancelled');
        setReservationId(null);
        setExpiresAt(null);
      }
    } catch (err) {
      setError('Failed to cancel reservation: ' + err.message);
    }
  };

  /**
   * Update countdown timer
   */
  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const now = new Date();
      const remaining = expiresAt - now;
      
      if (remaining <= 0) {
        setTimeRemaining('Expired');
        setReservationStatus('expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Render based on current state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Creating reservation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-600">❌ {error}</div>
        </div>
        <button
          onClick={() => setError(null)}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!reservationId) {
    return (
      <div className="space-y-4">
        <button
          onClick={createReservation}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reserve Items & Continue to Payment
        </button>
        <p className="text-sm text-gray-600 text-center">
          This will reserve your items for 15 minutes while you complete payment
        </p>
      </div>
    );
  }

  if (reservationStatus === 'reserved') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-600">✅ Items Reserved</div>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Your items are reserved until {expiresAt?.toLocaleTimeString()}
          </p>
          {timeRemaining && (
            <p className="text-sm text-green-600 mt-1">
              Time remaining: {timeRemaining}
            </p>
          )}
        </div>

        <button
          onClick={startPayment}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          Proceed to Payment
        </button>

        <button
          onClick={cancelReservation}
          className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancel Reservation
        </button>
      </div>
    );
  }

  if (reservationStatus === 'confirmed') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-blue-600">🎉 Payment Confirmed!</div>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Your order is being processed...
        </p>
        {orderId && (
          <p className="text-sm text-blue-600 mt-1">
            Order ID: {orderId}
          </p>
        )}
      </div>
    );
  }

  if (reservationStatus === 'expired' || reservationStatus === 'cancelled') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-gray-600">
            {reservationStatus === 'expired' ? '⏰ Reservation Expired' : '❌ Reservation Cancelled'}
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-1">
          Your reservation has been {reservationStatus === 'expired' ? 'expired' : 'cancelled'}
        </p>
        <button
          onClick={() => {
            setReservationId(null);
            setReservationStatus(null);
            setExpiresAt(null);
            setOrderId(null);
          }}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Start Over
        </button>
      </div>
    );
  }

  return null;
}

/**
 * Usage example:
 * 
 * <ReservationCheckout
 *   items={[
 *     { productId: '123', quantity: 2, size: 'M', price: 1500 }
 *   ]}
 *   userId="user123"
 *   onSuccess={(result) => console.log('Checkout completed:', result)}
 *   onError={(error) => console.error('Checkout failed:', error)}
 * />
 */
