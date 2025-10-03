import React, { useState, useCallback } from 'react';

// Multi-tab synchronization for checkout sessions
const checkoutChannel = typeof window !== 'undefined' ? new BroadcastChannel('checkout-sync') : null;

export interface CheckoutItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  categorySlug?: string;
  category?: string;
}

export interface CheckoutSession {
  sessionId: string;
  source: 'cart' | 'buynow';
  items: CheckoutItem[];
  subtotal: number;
  total: number;
  currency: string;
  expiresAt: string;
  status: string;
}

export interface CreateCheckoutSessionRequest {
  source: 'cart' | 'buynow';
  items: CheckoutItem[];
  couponCode?: string;
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  data?: {
    sessionId: string;
    source: 'cart' | 'buynow';
    items: CheckoutItem[];
    subtotal: number;
    total: number;
    currency: string;
    expiresAt: string;
    message: string;
  };
  message?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  data?: {
    status: string;
    message: string;
    sessionId: string;
    phonepeTransactionId?: string;
    paymentDetails?: {
      redirectUrl?: string;
      responseCode?: string;
      responseMessage?: string;
    };
    stockReserved?: boolean;
    expiresAt?: string;
  };
  message?: string;
  error?: string;
}

export const useCheckoutSession = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<CheckoutSession | null>(null);

  // Generate unique session ID for this tab
  const getUniqueSessionId = useCallback(() => {
    return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createCheckoutSession = useCallback(async (
    request: CreateCheckoutSessionRequest,
    token: string,
    email?: string
  ): Promise<CreateCheckoutSessionResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add email to request if provided
      const requestWithEmail = {
        ...request,
        ...(email && { email })
      };
      
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify(requestWithEmail)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      if (data.success && data.data) {
        const session: CheckoutSession = {
          sessionId: data.data.sessionId,
          source: data.data.source,
          items: data.data.items,
          subtotal: data.data.subtotal,
          total: data.data.total,
          currency: data.data.currency,
          expiresAt: data.data.expiresAt,
          status: 'pending'
        };
        
        setCurrentSession(session);
        
        // Broadcast checkout session creation to other tabs
        if (checkoutChannel) {
          checkoutChannel.postMessage({
            type: 'checkout-started',
            sessionId: data.data.sessionId,
            source: data.data.source,
            tabId: getUniqueSessionId(),
            timestamp: Date.now()
          });
          console.log('[CheckoutSession] 📡 Broadcasted checkout session creation to other tabs');
        }
        
        return data;
      } else {
        throw new Error(data.message || 'Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCheckoutSession = useCallback(async (
    sessionId: string,
    token?: string
  ): Promise<CheckoutSession | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/checkout/session/${sessionId}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get checkout session');
      }

      if (data.success && data.data) {
        const session: CheckoutSession = {
          sessionId: data.data.sessionId,
          source: data.data.source,
          items: data.data.items,
          subtotal: data.data.subtotal,
          total: data.data.total,
          currency: data.data.currency,
          expiresAt: data.data.expiresAt,
          status: data.data.status
        };
        
        setCurrentSession(session);
        return session;
      } else {
        throw new Error(data.message || 'Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reserveStock = useCallback(async (
    sessionId: string,
    token: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/checkout/session/${sessionId}/reserve-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reserve stock');
      }

      if (data.success && data.data?.stockReserved) {
        // Update current session status
        if (currentSession) {
          setCurrentSession({
            ...currentSession,
            status: data.data.status || 'awaiting_payment'
          });
        }
        return true;
      } else {
        throw new Error(data.message || 'Stock reservation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const getPaymentStatus = useCallback(async (
    sessionId: string,
    token?: string
  ): Promise<PaymentStatusResponse> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/payment/status/${sessionId}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get payment status');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  const cancelCheckoutSession = useCallback(async (
    sessionId: string,
    token: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/checkout/session/${sessionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-request-id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel checkout session');
      }

      // Clear current session
      setCurrentSession(null);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setCurrentSession(null);
    setError(null);
  }, []);

  // Listen for checkout events from other tabs
  React.useEffect(() => {
    if (checkoutChannel) {
      const handleCheckoutMessage = (event: MessageEvent) => {
        if (event.data.type === 'checkout-started' && event.data.tabId !== getUniqueSessionId()) {
          console.log('[CheckoutSession] 🔄 Received checkout event from other tab:', event.data);
          // Optionally show a notification or update UI
          // For now, just log the event
        }
      };
      
      checkoutChannel.addEventListener('message', handleCheckoutMessage);
      return () => checkoutChannel.removeEventListener('message', handleCheckoutMessage);
    }
  }, [getUniqueSessionId]);

  return {
    isLoading,
    error,
    currentSession,
    createCheckoutSession,
    getCheckoutSession,
    reserveStock,
    getPaymentStatus,
    cancelCheckoutSession,
    clearSession
  };
};
