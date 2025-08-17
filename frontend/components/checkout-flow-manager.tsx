"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';
import { useBuyNow } from './buy-now-context';

export interface CheckoutItem {
  _id: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  category?: string;
  categorySlug?: string;
}

export interface CheckoutFlow {
  mode: 'buy-now' | 'cart';
  items: CheckoutItem[];
  source: 'buy-now' | 'cart';
  timestamp: number;
  sessionId: string;
}

interface CheckoutFlowContextType {
  currentFlow: CheckoutFlow | null;
  isBuyNowMode: boolean;
  isCartMode: boolean;
  checkoutItems: CheckoutItem[];
  totalAmount: number;
  setCheckoutFlow: (mode: 'buy-now' | 'cart') => void;
  clearCheckoutFlow: () => void;
  refreshCheckoutFlow: () => void;
  isLoading: boolean;
}

const CheckoutFlowContext = createContext<CheckoutFlowContextType | undefined>(undefined);

export function CheckoutFlowProvider({ children }: { children: ReactNode }) {
  const [currentFlow, setCurrentFlow] = useState<CheckoutFlow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { cartItems, cartTotal } = useCart();
  const { buyNowItem, clearBuyNowItem } = useBuyNow();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate unique session ID for this checkout session
  const generateSessionId = () => `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize checkout flow based on URL and context
  useEffect(() => {
    const initializeFlow = () => {
      setIsLoading(true);
      
      try {
        const urlMode = searchParams.get('mode');
        const isBuyNowRequested = urlMode === 'buynow';
        
        // Check if we have a stored flow that matches the current request
        const storedFlow = sessionStorage.getItem('checkoutFlow');
        let flow: CheckoutFlow | null = null;
        
        if (storedFlow) {
          try {
            flow = JSON.parse(storedFlow);
            // Validate stored flow
            if (flow && flow.timestamp && (Date.now() - flow.timestamp) < 30 * 60 * 1000) { // 30 minutes
              // Check if stored flow matches current request
              if ((isBuyNowRequested && flow.mode === 'buy-now') || 
                  (!isBuyNowRequested && flow.mode === 'cart')) {
                console.log('CheckoutFlow: Using stored flow:', flow);
                setCurrentFlow(flow);
                setIsLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error('CheckoutFlow: Error parsing stored flow:', error);
          }
        }
        
        // Create new flow based on current context
        if (isBuyNowRequested && buyNowItem) {
          // Buy Now mode
          flow = {
            mode: 'buy-now',
            items: [buyNowItem],
            source: 'buy-now',
            timestamp: Date.now(),
            sessionId: generateSessionId()
          };
          
          // Clear any cart-related data to prevent conflicts
          sessionStorage.removeItem('cartCheckoutData');
          localStorage.removeItem('cartCheckoutData');
          
          console.log('CheckoutFlow: Created Buy Now flow:', flow);
        } else if (!isBuyNowRequested && cartItems.length > 0) {
          // Cart mode
          flow = {
            mode: 'cart',
            items: [...cartItems],
            source: 'cart',
            timestamp: Date.now(),
            sessionId: generateSessionId()
          };
          
          // Clear any buy-now data to prevent conflicts
          sessionStorage.removeItem('buyNowCheckoutData');
          localStorage.removeItem('buyNowCheckoutData');
          clearBuyNowItem(); // Clear buy-now context when in cart mode
          
          console.log('CheckoutFlow: Created Cart flow:', flow);
        } else {
          // No valid flow possible
          console.log('CheckoutFlow: No valid flow possible');
          setCurrentFlow(null);
          setIsLoading(false);
          return;
        }
        
        // Store the new flow
        setCurrentFlow(flow);
        sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
        
        // Store flow-specific data
        if (flow.mode === 'buy-now') {
          const buyNowData = {
            flow: flow,
            items: flow.items,
            timestamp: Date.now()
          };
          sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
          localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
        } else {
          const cartData = {
            flow: flow,
            items: flow.items,
            timestamp: Date.now()
          };
          sessionStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
          localStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
        }
        
      } catch (error) {
        console.error('CheckoutFlow: Error initializing flow:', error);
        setCurrentFlow(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFlow();
  }, [searchParams, buyNowItem, cartItems, clearBuyNowItem]);

  // Clear flow when navigating away from checkout
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't clear on page refresh, only on navigation away
      if (window.location.pathname !== '/checkout') {
        clearCheckoutFlow();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const setCheckoutFlow = (mode: 'buy-now' | 'cart') => {
    if (mode === 'buy-now' && buyNowItem) {
      const flow: CheckoutFlow = {
        mode: 'buy-now',
        items: [buyNowItem],
        source: 'buy-now',
        timestamp: Date.now(),
        sessionId: generateSessionId()
      };
      setCurrentFlow(flow);
      sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
      
      // Store buy-now specific data
      const buyNowData = { flow, items: flow.items, timestamp: Date.now() };
      sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
      localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
      
      // Clear cart data
      sessionStorage.removeItem('cartCheckoutData');
      localStorage.removeItem('cartCheckoutData');
      
      router.push('/checkout?mode=buynow');
    } else if (mode === 'cart' && cartItems.length > 0) {
      const flow: CheckoutFlow = {
        mode: 'cart',
        items: [...cartItems],
        source: 'cart',
        timestamp: Date.now(),
        sessionId: generateSessionId()
      };
      setCurrentFlow(flow);
      sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
      
      // Store cart specific data
      const cartData = { flow, items: flow.items, timestamp: Date.now() };
      sessionStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
      localStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
      
      // Clear buy-now data
      sessionStorage.removeItem('buyNowCheckoutData');
      localStorage.removeItem('buyNowCheckoutData');
      clearBuyNowItem();
      
      router.push('/checkout');
    }
  };

  const clearCheckoutFlow = () => {
    setCurrentFlow(null);
    sessionStorage.removeItem('checkoutFlow');
    sessionStorage.removeItem('buyNowCheckoutData');
    sessionStorage.removeItem('cartCheckoutData');
    localStorage.removeItem('buyNowCheckoutData');
    localStorage.removeItem('cartCheckoutData');
    clearBuyNowItem();
  };

  const refreshCheckoutFlow = () => {
    // Force re-initialization of the flow
    setIsLoading(true);
    setTimeout(() => {
      const urlMode = searchParams.get('mode');
      if (urlMode === 'buynow' && buyNowItem) {
        setCheckoutFlow('buy-now');
      } else if (cartItems.length > 0) {
        setCheckoutFlow('cart');
      }
      setIsLoading(false);
    }, 100);
  };

  const isBuyNowMode = currentFlow?.mode === 'buy-now';
  const isCartMode = currentFlow?.mode === 'cart';
  const checkoutItems = currentFlow?.items || [];
  const totalAmount = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const value: CheckoutFlowContextType = {
    currentFlow,
    isBuyNowMode,
    isCartMode,
    checkoutItems,
    totalAmount,
    setCheckoutFlow,
    clearCheckoutFlow,
    refreshCheckoutFlow,
    isLoading
  };

  return (
    <CheckoutFlowContext.Provider value={value}>
      {children}
    </CheckoutFlowContext.Provider>
  );
}

export function useCheckoutFlow() {
  const context = useContext(CheckoutFlowContext);
  if (context === undefined) {
    throw new Error('useCheckoutFlow must be used within a CheckoutFlowProvider');
  }
  return context;
}
