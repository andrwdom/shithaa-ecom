"use client";

import { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react';
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
  mode: 'buy-now' | 'cart' | 'stored' | 'restored';
  items: CheckoutItem[];
  source: 'buy-now' | 'cart' | 'stored' | 'restored';
  timestamp: number;
  sessionId: string;
}

interface CheckoutFlowContextType {
  currentFlow: CheckoutFlow | null;
  isBuyNowMode: boolean;
  isCartMode: boolean;
  checkoutItems: CheckoutItem[];
  isLoading: boolean;
  setCheckoutFlow: (mode: 'buy-now' | 'cart' | 'stored' | 'restored') => void;
  clearCheckoutFlow: () => void;
  restoreCheckoutItems: () => CheckoutItem[];
  retryRestoreCart: () => void;
}

const CheckoutFlowContext = createContext<CheckoutFlowContextType | undefined>(undefined);

function CheckoutFlowProviderInner({ children }: { children: ReactNode }) {
  const [currentFlow, setCurrentFlow] = useState<CheckoutFlow | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const { cartItems } = useCart();
  const { buyNowItem, clearBuyNowItem } = useBuyNow();

  // Initialize checkout flow and restore items
  useEffect(() => {
    const initializeFlow = () => {
      setIsLoading(true);
      
      try {
        // First, try to restore from existing flow data
        const existingFlow = sessionStorage.getItem('checkoutFlow');
        const existingItems = sessionStorage.getItem('checkoutItems');
        
        if (existingFlow && existingItems) {
          try {
            const flow = JSON.parse(existingFlow);
            const items = JSON.parse(existingItems);
            
            // Check if flow is still valid (within 1 hour)
            const flowAge = Date.now() - flow.timestamp;
            if (flowAge < 3600000) { // 1 hour
              setCurrentFlow(flow);
              setCheckoutItems(items);
              console.log('Restored existing checkout flow:', flow);
              return;
            }
          } catch (error) {
            console.error('Error parsing existing flow data:', error);
          }
        }

        // Try to restore from buy-now context
        if (buyNowItem) {
          const flow: CheckoutFlow = {
            mode: 'buy-now',
            items: [buyNowItem],
            source: 'buy-now',
            timestamp: Date.now(),
            sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          setCurrentFlow(flow);
          setCheckoutItems([buyNowItem]);
          
          // Store flow data
          sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
          sessionStorage.setItem('checkoutItems', JSON.stringify([buyNowItem]));
          
          // Store flow-specific data
          const buyNowData = {
            flow: flow,
            items: [buyNowItem],
            timestamp: Date.now()
          };
          sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
          localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
          
          console.log('Initialized buy-now checkout flow:', flow);
          return;
        }

        // Try to restore from cart context
        if (cartItems.length > 0) {
          const flow: CheckoutFlow = {
            mode: 'cart',
            items: cartItems,
            source: 'cart',
            timestamp: Date.now(),
            sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          setCurrentFlow(flow);
          setCheckoutItems(cartItems);
          
          // Store flow data
          sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
          sessionStorage.setItem('checkoutItems', JSON.stringify(cartItems));
          
          // Store flow-specific data
          const cartData = {
            flow: flow,
            items: cartItems,
            timestamp: Date.now()
          };
          sessionStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
          localStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
          
          console.log('Initialized cart checkout flow:', flow);
          return;
        }

        // Try to restore from stored checkout data
        const storedCheckoutData = restoreFromStoredData();
        if (storedCheckoutData.length > 0) {
          const flow: CheckoutFlow = {
            mode: 'cart', // Assume cart mode for stored data
            items: storedCheckoutData,
            source: 'stored',
            timestamp: Date.now(),
            sessionId: `stored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          setCurrentFlow(flow);
          setCheckoutItems(storedCheckoutData);
          
          // Store flow data
          sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
          sessionStorage.setItem('checkoutItems', JSON.stringify(storedCheckoutData));
          
          console.log('Restored checkout flow from stored data:', flow);
          return;
        }

        // No items found - clear flow
        setCurrentFlow(null);
        setCheckoutItems([]);
        console.log('No checkout items found to restore');
        
      } catch (error) {
        console.error('CheckoutFlow: Error initializing flow:', error);
        setCurrentFlow(null);
        setCheckoutItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFlow();
  }, [searchParams, buyNowItem, cartItems, clearBuyNowItem]);

  // Function to restore items from stored data
  const restoreFromStoredData = (): CheckoutItem[] => {
    try {
      // Try multiple storage locations
      const sources = [
        'pendingOrderData',
        'phonepeOrderData',
        'buyNowCheckoutData',
        'cartCheckoutData',
        'phonepeBuyNowItem',
        'phonepeCartItems'
      ];

      for (const source of sources) {
        const data = sessionStorage.getItem(source) || localStorage.getItem(source);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            
            // Extract items from different data structures
            let items: CheckoutItem[] = [];
            
            if (parsed.cartItems && Array.isArray(parsed.cartItems)) {
              items = parsed.cartItems;
            } else if (parsed.items && Array.isArray(parsed.items)) {
              items = parsed.items;
            } else if (Array.isArray(parsed)) {
              items = parsed;
            }
            
            if (items.length > 0) {
              console.log(`Restored ${items.length} items from ${source}`);
              return items;
            }
          } catch (error) {
            console.error(`Error parsing data from ${source}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring from stored data:', error);
    }
    
    return [];
  };

  // Function to retry restoring cart items
  const retryRestoreCart = () => {
    console.log('Retrying to restore cart items...');
    setIsLoading(true);
    
    try {
      const restoredItems = restoreFromStoredData();
      if (restoredItems.length > 0) {
        const flow: CheckoutFlow = {
          mode: 'cart',
          items: restoredItems,
          source: 'restored',
          timestamp: Date.now(),
          sessionId: `restored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        setCurrentFlow(flow);
        setCheckoutItems(restoredItems);
        
        // Store flow data
        sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
        sessionStorage.setItem('checkoutItems', JSON.stringify(restoredItems));
        
        console.log('Successfully restored checkout items:', restoredItems);
      } else {
        console.log('No items found to restore');
      }
    } catch (error) {
      console.error('Error retrying restore:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const setCheckoutFlow = (mode: 'buy-now' | 'cart' | 'stored' | 'restored') => {
    try {
      let items: CheckoutItem[] = [];
      let source: 'buy-now' | 'cart' = mode;

      if (mode === 'buy-now' && buyNowItem) {
        items = [buyNowItem];
        source = 'buy-now';
      } else if (mode === 'cart' && cartItems.length > 0) {
        items = cartItems;
        source = 'cart';
      } else {
        // Try to restore from stored data
        items = restoreFromStoredData();
        source = 'stored';
      }

      if (items.length === 0) {
        console.warn('No items found for checkout flow:', mode);
        return;
      }

      const flow: CheckoutFlow = {
        mode,
        items,
        source,
        timestamp: Date.now(),
        sessionId: `${mode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      setCurrentFlow(flow);
      setCheckoutItems(items);

      // Store flow data
      sessionStorage.setItem('checkoutFlow', JSON.stringify(flow));
      sessionStorage.setItem('checkoutItems', JSON.stringify(items));

      // Store flow-specific data
      if (mode === 'buy-now') {
        const buyNowData = {
          flow: flow,
          items: items,
          timestamp: Date.now()
        };
        sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
        localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
      } else {
        const cartData = {
          flow: flow,
          items: items,
          timestamp: Date.now()
        };
        sessionStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
        localStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
      }

      console.log('Set checkout flow:', flow);
    } catch (error) {
      console.error('Error setting checkout flow:', error);
    }
  };

  const clearCheckoutFlow = () => {
    setCurrentFlow(null);
    setCheckoutItems([]);
    sessionStorage.removeItem('checkoutFlow');
    sessionStorage.removeItem('checkoutItems');
    console.log('Cleared checkout flow');
  };

  const restoreCheckoutItems = (): CheckoutItem[] => {
    return restoreFromStoredData();
  };

  const contextValue: CheckoutFlowContextType = {
    currentFlow,
    isBuyNowMode: currentFlow?.mode === 'buy-now',
    isCartMode: currentFlow?.mode === 'cart',
    checkoutItems,
    isLoading,
    setCheckoutFlow,
    clearCheckoutFlow,
    restoreCheckoutItems,
    retryRestoreCart
  };

  return (
    <CheckoutFlowContext.Provider value={contextValue}>
      {children}
    </CheckoutFlowContext.Provider>
  );
}

export function CheckoutFlowProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="loading loading-spinner loading-lg text-[#473C66]"></div>
      </div>
    }>
      <CheckoutFlowProviderInner>
        {children}
      </CheckoutFlowProviderInner>
    </Suspense>
  );
}

export function useCheckoutFlow() {
  const context = useContext(CheckoutFlowContext);
  if (context === undefined) {
    throw new Error('useCheckoutFlow must be used within a CheckoutFlowProvider');
  }
  return context;
}
