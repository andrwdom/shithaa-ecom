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
  mode: 'buy-now' | 'cart';
  items: CheckoutItem[];
  source: 'buy-now' | 'cart' | 'stored' | 'restored' | 'context' | 'raw-storage';
  timestamp: number;
  sessionId: string;
}

interface CheckoutFlowContextType {
  currentFlow: CheckoutFlow | null;
  checkoutItems: CheckoutItem[];
  isBuyNowMode: boolean;
  isCartMode: boolean;
  isLoading: boolean;
  setCheckoutFlow: (mode: 'buy-now' | 'cart') => void;
  clearCheckoutFlow: () => void;
  retryRestoreCart: () => void;
}

const CheckoutFlowContext = createContext<CheckoutFlowContextType | undefined>(undefined);

export function CheckoutFlowProviderInner({ children }: { children: React.ReactNode }) {
  const [currentFlow, setCurrentFlow] = useState<CheckoutFlow | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode");
  const { cartItems } = useCart();
  const { buyNowItem } = useBuyNow();

  // 🔥 Move all flow detection + restoration into useEffect
  useEffect(() => {
    const initFlow = () => {
      // --- BUY NOW MODE ---
      if (urlMode === "buynow") {
        console.log("CheckoutFlow: Buy-now mode detected, initializing...");

        // 1. Context item
        if (buyNowItem) {
          const flow: CheckoutFlow = {
            mode: "buy-now",
            items: [buyNowItem],
            source: "context",
            timestamp: Date.now(),
            sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          setCurrentFlow(flow);
          setCheckoutItems([buyNowItem]);
          sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
          sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([buyNowItem]));
          console.log("✅ Buy-now checkout flow initialized from context:", flow);
          setIsLoading(false);
          return;
        }

        // 2. Dedicated buy-now checkout data
        const buyNowData = sessionStorage.getItem("buyNowCheckoutData") || localStorage.getItem("buyNowCheckoutData");
        if (buyNowData) {
          try {
            const parsed = JSON.parse(buyNowData);
            if (parsed.items?.length > 0) {
              const flow: CheckoutFlow = {
                mode: "buy-now",
                items: parsed.items,
                source: "stored",
                timestamp: Date.now(),
                sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
              setCurrentFlow(flow);
              setCheckoutItems(parsed.items);
              sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
              sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify(parsed.items));
              console.log("✅ Restored buy-now checkout flow from storage:", flow);
              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.error("❌ Error parsing buy-now checkout data:", err);
          }
        }

        // 3. Fallback to raw buyNowItem storage
        const storedBuyNowItem = sessionStorage.getItem("buyNowItem") || localStorage.getItem("buyNowItem");
        if (storedBuyNowItem) {
          try {
            const parsed = JSON.parse(storedBuyNowItem);
            if (parsed && parsed._id && parsed.name) {
              const flow: CheckoutFlow = {
                mode: "buy-now",
                items: [parsed],
                source: "raw-storage",
                timestamp: Date.now(),
                sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
              setCurrentFlow(flow);
              setCheckoutItems([parsed]);
              sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
              sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([parsed]));
              console.log("✅ Restored buy-now checkout flow from raw storage:", flow);
              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.error("❌ Error parsing raw buy-now item:", err);
          }
        }

        // 4. If everything failed → empty state
        console.warn("⚠️ No buy-now item found, showing empty state");
        setCurrentFlow(null);
        setCheckoutItems([]);
        setIsLoading(false);
        return;
      }

      // --- CART MODE ---
      if (cartItems?.length > 0) {
        const flow: CheckoutFlow = {
          mode: "cart",
          items: cartItems,
          source: "cart",
          timestamp: Date.now(),
          sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        setCurrentFlow(flow);
        setCheckoutItems(cartItems);
        sessionStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
        sessionStorage.setItem("cartCheckoutItems", JSON.stringify(cartItems));
        console.log("✅ Cart checkout flow initialized:", flow);
      } else {
        console.warn("⚠️ No cart items found, showing empty state");
        setCurrentFlow(null);
        setCheckoutItems([]);
      }

      setIsLoading(false);
    };

    initFlow();
  }, [urlMode, buyNowItem, cartItems]); // rerun when flow state changes

  // While loading, prevent "No Items Found" flicker
  if (isLoading) {
    return <div>Loading checkout...</div>;
  }

  // Helper functions
  const setCheckoutFlow = (mode: 'buy-now' | 'cart') => {
    if (mode === 'buy-now' && buyNowItem) {
      const flow: CheckoutFlow = {
        mode: 'buy-now',
        items: [buyNowItem],
        source: 'buy-now',
        timestamp: Date.now(),
        sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      setCurrentFlow(flow);
      setCheckoutItems([buyNowItem]);
      sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
      sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify([buyNowItem]));
    } else if (mode === 'cart' && cartItems.length > 0) {
      const flow: CheckoutFlow = {
        mode: 'cart',
        items: cartItems,
        source: 'cart',
        timestamp: Date.now(),
        sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      setCurrentFlow(flow);
      setCheckoutItems(cartItems);
      sessionStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
      sessionStorage.setItem('cartCheckoutItems', JSON.stringify(cartItems));
    }
  };

  const clearCheckoutFlow = () => {
    setCurrentFlow(null);
    setCheckoutItems([]);
    sessionStorage.removeItem('buyNowCheckoutFlow');
    sessionStorage.removeItem('buyNowCheckoutItems');
    sessionStorage.removeItem('cartCheckoutFlow');
    sessionStorage.removeItem('cartCheckoutItems');
  };

  const retryRestoreCart = () => {
    console.log('Retrying to restore checkout items...');
    setIsLoading(true);
    // Re-run the flow initialization
    setTimeout(() => {
      const initFlow = () => {
        if (urlMode === "buynow") {
          // Try to restore buy-now items
          const storedBuyNowItem = sessionStorage.getItem("buyNowItem") || localStorage.getItem("buyNowItem");
          if (storedBuyNowItem) {
            try {
              const parsed = JSON.parse(storedBuyNowItem);
              if (parsed && parsed._id && parsed.name) {
                const flow: CheckoutFlow = {
                  mode: "buy-now",
                  items: [parsed],
                  source: "raw-storage",
                  timestamp: Date.now(),
                  sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
                setCurrentFlow(flow);
                setCheckoutItems([parsed]);
                sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([parsed]));
                console.log("✅ Retry: Restored buy-now checkout flow:", flow);
                setIsLoading(false);
                return;
              }
            } catch (err) {
              console.error("❌ Error parsing buy-now item during retry:", err);
            }
          }
        } else {
          // Try to restore cart items
          if (cartItems.length > 0) {
            const flow: CheckoutFlow = {
              mode: "cart",
              items: cartItems,
              source: "cart",
              timestamp: Date.now(),
              sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            setCurrentFlow(flow);
            setCheckoutItems(cartItems);
            sessionStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
            sessionStorage.setItem("cartCheckoutItems", JSON.stringify(cartItems));
            console.log("✅ Retry: Restored cart checkout flow:", flow);
          }
        }
        setIsLoading(false);
      };
      initFlow();
    }, 100);
  };

  const contextValue: CheckoutFlowContextType = {
    currentFlow,
    checkoutItems,
    isBuyNowMode: currentFlow?.mode === 'buy-now',
    isCartMode: currentFlow?.mode === 'cart',
    isLoading,
    setCheckoutFlow,
    clearCheckoutFlow,
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