"use client";

import { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';
import { useBuyNow } from './buy-now-context';

// Global utility for flow detection - can be used anywhere in checkout or gateway code
export function getCheckoutMode(): 'buynow' | 'cart' {
  if (typeof window === 'undefined') return 'cart'; // SSR fallback
  
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "buynow" ? "buynow" : "cart";
}

// Helper function to get checkout mode from URL string (for non-component usage)
export function getCheckoutModeFromUrl(url: string): 'buynow' | 'cart' {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("mode") === "buynow" ? "buynow" : "cart";
  } catch {
    return 'cart'; // Fallback to cart if URL parsing fails
  }
}

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
        // Get the mode from URL parameters
        let urlMode = searchParams?.get('mode');
        console.log('CheckoutFlow: URL mode detected:', urlMode);
        
        // ⚡ FLOW VALIDATION: Ensure URL mode matches actual data availability
        if (urlMode === 'buynow') {
          // Validate buy-now flow data integrity
          if (!buyNowItem && !sessionStorage.getItem('buyNowCheckoutData') && !localStorage.getItem('buyNowCheckoutData')) {
            console.warn('CheckoutFlow: Buy-now mode detected but no buy-now data available');
            // Fallback to cart if buy-now data is missing
            urlMode = null;
          }
        }
        
        // CRITICAL: Check if we're in a buy-now flow first
        if (urlMode === 'buynow') {
          console.log('CheckoutFlow: Buy-now mode detected from URL, prioritizing buy-now items...');
          
          // Try to restore from buy-now context first
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
            
            // Store flow data with buy-now specific key
            sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
            sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify([buyNowItem]));
            
            console.log('Initialized buy-now checkout flow from context:', flow);
            return;
          }
          
          // If no buy-now item in context, try to restore from buy-now storage
          const buyNowData = sessionStorage.getItem('buyNowCheckoutData') || localStorage.getItem('buyNowCheckoutData');
          if (buyNowData) {
            try {
              const parsed = JSON.parse(buyNowData);
              if (parsed.items && parsed.items.length > 0) {
                const flow: CheckoutFlow = {
                  mode: 'buy-now',
                  items: parsed.items,
                  source: 'stored',
                  timestamp: Date.now(),
                  sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
                
                setCurrentFlow(flow);
                setCheckoutItems(parsed.items);
                
                // Store flow data with buy-now specific key
                sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
                sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify(parsed.items));
                
                console.log('Restored buy-now checkout flow from storage:', flow);
                return;
              }
            } catch (error) {
              console.error('Error parsing buy-now data:', error);
            }
          }
          
          // If still no items, try to restore from regular buy-now storage
          const storedBuyNowItem = sessionStorage.getItem('buyNowItem') || localStorage.getItem('buyNowItem');
          if (storedBuyNowItem) {
            try {
              const parsed = JSON.parse(storedBuyNowItem);
              if (parsed && parsed._id && parsed.name) {
                const flow: CheckoutFlow = {
                  mode: 'buy-now',
                  items: [parsed],
                  source: 'stored',
                  timestamp: Date.now(),
                  sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
                
                setCurrentFlow(flow);
                setCheckoutItems([parsed]);
                
                // Store flow data with buy-now specific key
                sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
                sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify([parsed]));
                
                console.log('Restored buy-now checkout flow from buy-now storage:', flow);
                return;
              }
            } catch (error) {
              console.error('Error parsing buy-now item:', error);
            }
          }
          
          // If we're in buy-now mode but can't find any items, show error
          console.log('CheckoutFlow: Buy-now mode but no items found');
          setCurrentFlow(null);
          setCheckoutItems([]);
          return;
        }
        
        // If not in buy-now mode, check for cart flow
        console.log('CheckoutFlow: Checking for cart checkout flow...');
        
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
          
          // Store flow data with cart specific key
          sessionStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
          sessionStorage.setItem('cartCheckoutItems', JSON.stringify(cartItems));
          
          console.log('Initialized cart checkout flow:', flow);
          return;
        }
        
        // Try to restore from cart storage
        const cartData = sessionStorage.getItem('cartCheckoutData') || localStorage.getItem('cartCheckoutData');
        if (cartData) {
          try {
            const parsed = JSON.parse(cartData);
            if (parsed.items && parsed.items.length > 0) {
              const flow: CheckoutFlow = {
                mode: 'cart',
                items: parsed.items,
                source: 'stored',
                timestamp: Date.now(),
                sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
              
              setCurrentFlow(flow);
              setCheckoutItems(parsed.items);
              
              // Store flow data with cart specific key
              sessionStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
              sessionStorage.setItem('cartCheckoutItems', JSON.stringify(parsed.items));
              
              console.log('Restored cart checkout flow from storage:', flow);
              return;
            }
          } catch (error) {
            console.error('Error parsing cart data:', error);
          }
        }
        
        // Try to restore from existing flow data (legacy support)
        const existingFlow = sessionStorage.getItem('buyNowCheckoutFlow') || sessionStorage.getItem('cartCheckoutFlow');
        const existingItems = sessionStorage.getItem('buyNowCheckoutItems') || sessionStorage.getItem('cartCheckoutItems');
        
        if (existingFlow && existingItems) {
          try {
            const flow = JSON.parse(existingFlow);
            const items = JSON.parse(existingItems);
            
            // Check if flow is still valid (within 1 hour)
            const flowAge = Date.now() - flow.timestamp;
            if (flowAge < 3600000) { // 1 hour
              setCurrentFlow(flow);
              setCheckoutItems(items);
              console.log('Restored existing checkout flow (legacy):', flow);
              return;
            }
          } catch (error) {
            console.error('Error parsing existing flow data:', error);
          }
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
    console.log('Retrying to restore checkout items...');
    setIsLoading(true);
    
    try {
      // Check current flow mode and restore accordingly
      if (currentFlow?.mode === 'buy-now') {
        // Try to restore buy-now items
        const buyNowData = sessionStorage.getItem('buyNowCheckoutData') || localStorage.getItem('buyNowCheckoutData');
        if (buyNowData) {
          try {
            const parsed = JSON.parse(buyNowData);
            if (parsed.items && parsed.items.length > 0) {
              const flow: CheckoutFlow = {
                mode: 'buy-now',
                items: parsed.items,
                source: 'restored',
                timestamp: Date.now(),
                sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
              
              setCurrentFlow(flow);
              setCheckoutItems(parsed.items);
              
              // Store flow data with buy-now specific key
              sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
              sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify(parsed.items));
              
              console.log('Successfully restored buy-now items:', parsed.items);
              return;
            }
          } catch (error) {
            console.error('Error parsing buy-now data:', error);
          }
        }
      } else {
        // Try to restore cart items
        const cartData = sessionStorage.getItem('cartCheckoutData') || localStorage.getItem('cartCheckoutData');
        if (cartData) {
          try {
            const parsed = JSON.parse(cartData);
            if (parsed.items && parsed.items.length > 0) {
              const flow: CheckoutFlow = {
                mode: 'cart',
                items: parsed.items,
                source: 'restored',
                timestamp: Date.now(),
                sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
              
              setCurrentFlow(flow);
              setCheckoutItems(parsed.items);
              
              // Store flow data with cart specific key
              sessionStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
              sessionStorage.setItem('cartCheckoutItems', JSON.stringify(parsed.items));
              
              console.log('Successfully restored cart items:', parsed.items);
              return;
            }
          } catch (error) {
            console.error('Error parsing cart data:', error);
          }
        }
      }
      
      console.log('No items found to restore');
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
      let source: 'buy-now' | 'cart' | 'stored' | 'restored' = mode;

      // ⚡ FLOW VALIDATION: Ensure mode matches available data
      if (mode === 'buy-now') {
        if (!buyNowItem) {
          console.warn('setCheckoutFlow: Buy-now mode requested but no buy-now item available');
          return;
        }
        items = [buyNowItem];
        source = 'buy-now';
      } else if (mode === 'cart') {
        if (cartItems.length === 0) {
          console.warn('setCheckoutFlow: Cart mode requested but no cart items available');
          return;
        }
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

      // ⚡ DATA INTEGRITY: Validate items before setting flow
      const validItems = items.filter(item => 
        item && 
        item._id && 
        item.name && 
        typeof item.price === 'number' && 
        typeof item.quantity === 'number' && 
        item.size
      );
      
      if (validItems.length !== items.length) {
        console.warn('setCheckoutFlow: Some items are invalid, filtering out invalid items');
        items = validItems;
      }
      
      if (items.length === 0) {
        console.warn('setCheckoutFlow: No valid items found after filtering');
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

      // Store flow data with flow-specific keys to prevent conflicts
      if (mode === 'buy-now') {
        sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
        sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify(items));
        
        // Also store in buy-now specific storage
        const buyNowData = {
          flow: flow,
          items: items,
          timestamp: Date.now()
        };
        sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
        localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
      } else {
        sessionStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
        sessionStorage.setItem('cartCheckoutItems', JSON.stringify(items));
        
        // Also store in cart specific storage
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
    
    // Clear all flow-specific storage keys to prevent conflicts
    sessionStorage.removeItem('checkoutFlow');
    sessionStorage.removeItem('checkoutItems');
    sessionStorage.removeItem('buyNowCheckoutFlow');
    sessionStorage.removeItem('buyNowCheckoutItems');
    sessionStorage.removeItem('cartCheckoutFlow');
    sessionStorage.removeItem('cartCheckoutItems');
    
    console.log('Cleared all checkout flow data');
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