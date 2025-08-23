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
  source: 'buy-now' | 'cart' | 'stored' | 'restored' | 'context' | 'raw-storage' | 'aggressive-storage';
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

  // 🔑 FIXED: Validation guard to ensure strict flow separation
  const validateFlowSeparation = (flow: CheckoutFlow | null, items: CheckoutItem[]) => {
    if (!flow || !items || items.length === 0) return true;
    
    // Ensure buy-now mode only has buy-now items and flow source
    if (flow.mode === 'buynow') {
      // Check if flow source is buy-now related
      const isValidBuyNowSource = flow.source === 'buynow' || 
                                 flow.source === 'context' || 
                                 flow.source === 'stored' || 
                                 flow.source === 'raw-storage';
      
      if (!isValidBuyNowSource) {
        console.error('[CheckoutFlowManager] ❌ Cross-contamination detected: buy-now flow has invalid source:', flow.source);
        return false;
      }
    }
    
    // Ensure cart mode only has cart items and flow source
    if (flow.mode === 'cart') {
      // Check if flow source is cart related
      const isValidCartSource = flow.source === 'cart' || 
                               flow.source === 'stored' || 
                               flow.source === 'restored';
      
      if (!isValidCartSource) {
        console.error('[CheckoutFlowManager] ❌ Cross-contamination detected: cart flow has invalid source:', flow.source);
        return false;
      }
    }
    
    return true;
  };

  // 🔥 Move all flow detection + restoration into useEffect
  useEffect(() => {
    const initFlow = () => {
      console.log('[CheckoutFlowManager] 🔄 initFlow called with:', { 
        urlMode, 
        buyNowItem: !!buyNowItem, 
        cartItemsLength: cartItems?.length 
      });
      
      // 🔑 FIXED: Clear any cross-contaminated data before initializing flow
      if (urlMode === "buynow") {
        // Clear any cart-related checkout data when in buy-now mode
        console.log('[CheckoutFlowManager] 🧹 Clearing cart checkout data for buy-now mode');
        sessionStorage.removeItem("cartCheckoutFlow");
        sessionStorage.removeItem("cartCheckoutItems");
        localStorage.removeItem("cartCheckoutFlow");
        localStorage.removeItem("cartCheckoutItems");
      } else {
        // Clear any buy-now checkout data when in cart mode
        console.log('[CheckoutFlowManager] 🧹 Clearing buy-now checkout data for cart mode');
        sessionStorage.removeItem("buyNowCheckoutFlow");
        sessionStorage.removeItem("buyNowCheckoutItems");
        localStorage.removeItem("buyNowCheckoutFlow");
        localStorage.removeItem("buyNowCheckoutItems");
      }
      
      // --- BUY NOW MODE ---
      if (urlMode === "buynow") {
        console.log("[CheckoutFlowManager] 🛒 Buy-now mode detected, initializing...");

        // 1. Context item (if available) - HIGHEST PRIORITY
        if (buyNowItem && buyNowItem._id && buyNowItem.name) {
          console.log('[CheckoutFlowManager] ✅ Found buy-now item in context:', buyNowItem);
          
          // Validate MongoDB ObjectId format
          const validHex24 = /^[0-9a-fA-F]{24}$/;
          if (!validHex24.test(buyNowItem._id)) {
            console.error('[CheckoutFlowManager] ❌ Invalid MongoDB ObjectId in buy-now item:', buyNowItem._id);
            setCurrentFlow(null);
            setCheckoutItems([]);
            setIsLoading(false);
            return;
          }
          
          const flow: CheckoutFlow = {
            mode: "buy-now",
            items: [buyNowItem],
            source: "context",
            timestamp: Date.now(),
            sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          // 🔑 FIXED: Validate flow separation before setting state
          if (!validateFlowSeparation(flow, [buyNowItem])) {
            console.error('[CheckoutFlowManager] ❌ Flow separation validation failed, clearing state');
            setCurrentFlow(null);
            setCheckoutItems([]);
            setIsLoading(false);
            return;
          }
          
          setCurrentFlow(flow);
          setCheckoutItems([buyNowItem]);
          
          // Store in flow-specific storage
          sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
          sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([buyNowItem]));
          localStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
          localStorage.setItem("buyNowCheckoutItems", JSON.stringify([buyNowItem]));
          
          console.log("[CheckoutFlowManager] ✅ Buy-now checkout flow initialized from context:", flow);
          setIsLoading(false);
          return;
        }

        // 2. Dedicated buy-now checkout data (prioritize this when URL mode is buynow)
        console.log('[CheckoutFlowManager] 🔍 Checking buyNowCheckoutData storage...');
        const buyNowData = sessionStorage.getItem("buyNowCheckoutData") || localStorage.getItem("buyNowCheckoutData");
        if (buyNowData) {
          try {
            const parsed = JSON.parse(buyNowData);
            console.log('[CheckoutFlowManager] 📦 Parsed buyNowCheckoutData:', parsed);
            
            if (parsed?.items?.length === 1 && parsed.items[0]._id && parsed.items[0].name) {
              // Validate MongoDB ObjectId format
              const validHex24 = /^[0-9a-fA-F]{24}$/;
              if (!validHex24.test(parsed.items[0]._id)) {
                console.error('[CheckoutFlowManager] ❌ Invalid MongoDB ObjectId in stored buy-now data:', parsed.items[0]._id);
                // Continue to next fallback
              } else {
                const flow: CheckoutFlow = {
                  mode: "buy-now",
                  items: parsed.items,
                  source: "stored",
                  timestamp: Date.now(),
                  sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
                setCurrentFlow(flow);
                setCheckoutItems(parsed.items);
                
                // Store in flow-specific storage
                sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify(parsed.items));
                localStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                localStorage.setItem("buyNowCheckoutItems", JSON.stringify(parsed.items));
                
                console.log("[CheckoutFlowManager] ✅ Restored buy-now checkout flow from storage:", flow);
                setIsLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error("[CheckoutFlowManager] ❌ Error parsing buy-now checkout data:", err);
          }
        }

        // 3. Fallback to raw buyNowItem storage (aggressive check for buynow mode)
        console.log('[CheckoutFlowManager] 🔍 Checking raw buyNowItem storage...');
        const storedBuyNowItem = sessionStorage.getItem("buyNowItem") || localStorage.getItem("buyNowItem");
        if (storedBuyNowItem) {
          try {
            const parsed = JSON.parse(storedBuyNowItem);
            console.log('[CheckoutFlowManager] 📦 Parsed raw buyNowItem:', parsed);
            
            if (parsed && parsed._id && parsed.name) {
              // Validate MongoDB ObjectId format
              const validHex24 = /^[0-9a-fA-F]{24}$/;
              if (!validHex24.test(parsed._id)) {
                console.error('[CheckoutFlowManager] ❌ Invalid MongoDB ObjectId in raw buy-now item:', parsed._id);
                // Continue to next fallback
              } else {
                const flow: CheckoutFlow = {
                  mode: "buy-now",
                  items: [parsed],
                  source: "raw-storage",
                  timestamp: Date.now(),
                  sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
                setCurrentFlow(flow);
                setCheckoutItems([parsed]);
                
                // Store in flow-specific storage
                sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([parsed]));
                localStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                localStorage.setItem("buyNowCheckoutItems", JSON.stringify([parsed]));
                
                console.log("[CheckoutFlowManager] ✅ Restored buy-now checkout flow from raw storage:", flow);
                setIsLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error("[CheckoutFlowManager] ❌ Error parsing raw buy-now item:", err);
          }
        }

        // 4. If everything failed → empty state
        console.warn("[CheckoutFlowManager] ⚠️ No buy-now item found, showing empty state");
        console.log('[CheckoutFlowManager] 🔍 Storage contents:');
        console.log('  - sessionStorage.buyNowItem:', sessionStorage.getItem('buyNowItem'));
        console.log('  - localStorage.buyNowItem:', localStorage.getItem('buyNowItem'));
        console.log('  - sessionStorage.buyNowCheckoutData:', sessionStorage.getItem('buyNowCheckoutData'));
        console.log('  - localStorage.buyNowCheckoutData:', localStorage.getItem('buyNowCheckoutData'));
        
        // Clear any stale buy-now data
        sessionStorage.removeItem("buyNowCheckoutFlow");
        sessionStorage.removeItem("buyNowCheckoutItems");
        localStorage.removeItem("buyNowCheckoutFlow");
        localStorage.removeItem("buyNowCheckoutItems");
        
        setCurrentFlow(null);
        setCheckoutItems([]);
        setIsLoading(false);
        return;
      }

      // --- CART MODE ---
      console.log("[CheckoutFlowManager] 🛒 Cart mode detected, initializing...");
      
      // For cart mode, ONLY use cart context or cart-specific storage
      if (cartItems?.length > 0) {
        // Validate all cart items have valid MongoDB ObjectIds
        const validHex24 = /^[0-9a-fA-F]{24}$/;
        const validCartItems = cartItems.filter(item => 
          item && item._id && validHex24.test(item._id) && item.name && typeof item.price === 'number'
        );
        
        if (validCartItems.length > 0) {
          const flow: CheckoutFlow = {
            mode: "cart",
            items: validCartItems,
            source: "cart",
            timestamp: Date.now(),
            sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          // 🔑 FIXED: Validate flow separation before setting state
          if (!validateFlowSeparation(flow, validCartItems)) {
            console.error('[CheckoutFlowManager] ❌ Flow separation validation failed, clearing state');
            setCurrentFlow(null);
            setCheckoutItems([]);
            setIsLoading(false);
            return;
          }
          
          setCurrentFlow(flow);
          setCheckoutItems(validCartItems);
          
          // Store in flow-specific storage
          sessionStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
          sessionStorage.setItem("cartCheckoutItems", JSON.stringify(validCartItems));
          localStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
          localStorage.setItem("cartCheckoutItems", JSON.stringify(validCartItems));
          
          console.log("[CheckoutFlowManager] ✅ Cart checkout flow initialized:", flow);
        } else {
          console.warn("[CheckoutFlowManager] ⚠️ Cart items failed validation, showing empty state");
          setCurrentFlow(null);
          setCheckoutItems([]);
        }
      } else {
        console.warn("[CheckoutFlowManager] ⚠️ No cart items found, showing empty state");
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
    console.log('[CheckoutFlowManager] 🔄 setCheckoutFlow called with mode:', mode);
    
    if (mode === 'buy-now' && buyNowItem) {
      // Validate MongoDB ObjectId format
      const validHex24 = /^[0-9a-fA-F]{24}$/;
      if (!validHex24.test(buyNowItem._id)) {
        console.error('[CheckoutFlowManager] ❌ Invalid MongoDB ObjectId in buy-now item:', buyNowItem._id);
        return;
      }
      
      const flow: CheckoutFlow = {
        mode: 'buy-now',
        items: [buyNowItem],
        source: 'buy-now',
        timestamp: Date.now(),
        sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      setCurrentFlow(flow);
      setCheckoutItems([buyNowItem]);
      
      // Store in flow-specific storage
      sessionStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
      sessionStorage.setItem('buyNowCheckoutItems', JSON.stringify([buyNowItem]));
      localStorage.setItem('buyNowCheckoutFlow', JSON.stringify(flow));
      localStorage.setItem('buyNowCheckoutItems', JSON.stringify([buyNowItem]));
      
      console.log('[CheckoutFlowManager] ✅ Buy-now flow set:', flow);
    } else if (mode === 'cart' && cartItems.length > 0) {
      // Validate all cart items have valid MongoDB ObjectIds
      const validHex24 = /^[0-9a-fA-F]{24}$/;
      const validCartItems = cartItems.filter(item => 
        item && item._id && validHex24.test(item._id) && item.name && typeof item.price === 'number'
      );
      
      if (validCartItems.length > 0) {
        const flow: CheckoutFlow = {
          mode: 'cart',
          items: validCartItems,
          source: 'cart',
          timestamp: Date.now(),
          sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        setCurrentFlow(flow);
        setCheckoutItems(validCartItems);
        
        // Store in flow-specific storage
        sessionStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
        sessionStorage.setItem('cartCheckoutItems', JSON.stringify(validCartItems));
        localStorage.setItem('cartCheckoutFlow', JSON.stringify(flow));
        localStorage.setItem('cartCheckoutItems', JSON.stringify(validCartItems));
        
        console.log('[CheckoutFlowManager] ✅ Cart flow set:', flow);
      } else {
        console.error('[CheckoutFlowManager] ❌ Cart items failed validation');
      }
    } else {
      console.warn('[CheckoutFlowManager] ⚠️ Cannot set checkout flow - invalid mode or missing items');
    }
  };

  const clearCheckoutFlow = () => {
    console.log('[CheckoutFlowManager] 🗑️ Clearing checkout flow');
    setCurrentFlow(null);
    setCheckoutItems([]);
    
    // Clear all flow-specific storage
    sessionStorage.removeItem('buyNowCheckoutFlow');
    sessionStorage.removeItem('buyNowCheckoutItems');
    sessionStorage.removeItem('cartCheckoutFlow');
    sessionStorage.removeItem('cartCheckoutItems');
    localStorage.removeItem('buyNowCheckoutFlow');
    localStorage.removeItem('buyNowCheckoutItems');
    localStorage.removeItem('cartCheckoutFlow');
    localStorage.removeItem('cartCheckoutItems');
  };

  const retryRestoreCart = () => {
    console.log('[CheckoutFlowManager] 🔄 Retrying to restore checkout items...');
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
                // Validate MongoDB ObjectId format
                const validHex24 = /^[0-9a-fA-F]{24}$/;
                if (validHex24.test(parsed._id)) {
                  const flow: CheckoutFlow = {
                    mode: "buy-now",
                    items: [parsed],
                    source: "raw-storage",
                    timestamp: Date.now(),
                    sessionId: `buy-now_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  };
                  setCurrentFlow(flow);
                  setCheckoutItems([parsed]);
                  
                  // Store in flow-specific storage
                  sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                  sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([parsed]));
                  localStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
                  localStorage.setItem("buyNowCheckoutItems", JSON.stringify([parsed]));
                  
                  console.log("[CheckoutFlowManager] ✅ Retry: Restored buy-now checkout flow:", flow);
                  setIsLoading(false);
                  return;
                }
              }
            } catch (err) {
              console.error("[CheckoutFlowManager] ❌ Error parsing buy-now item during retry:", err);
            }
          }
        } else {
          // Try to restore cart items
          if (cartItems.length > 0) {
            // Validate all cart items have valid MongoDB ObjectIds
            const validHex24 = /^[0-9a-fA-F]{24}$/;
            const validCartItems = cartItems.filter(item => 
              item && item._id && validHex24.test(item._id) && item.name && typeof item.price === 'number'
            );
            
            if (validCartItems.length > 0) {
              const flow: CheckoutFlow = {
                mode: "cart",
                items: validCartItems,
                source: "cart",
                timestamp: Date.now(),
                sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
              setCurrentFlow(flow);
              setCheckoutItems(validCartItems);
              
              // Store in flow-specific storage
              sessionStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
              sessionStorage.setItem("cartCheckoutItems", JSON.stringify(validCartItems));
              localStorage.setItem("cartCheckoutFlow", JSON.stringify(flow));
              localStorage.setItem("cartCheckoutItems", JSON.stringify(validCartItems));
              
              console.log("[CheckoutFlowManager] ✅ Retry: Restored cart checkout flow:", flow);
            }
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