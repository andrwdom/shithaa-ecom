"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useCart } from './cart-context';

// Import CheckoutFlow type for flow-specific storage
interface CheckoutFlow {
  mode: 'buy-now' | 'cart';
  items: BuyNowItem[];
  source: string;
  timestamp: number;
  sessionId: string;
}

export interface BuyNowItem {
  id: string;
  _id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  category?: string;
  categorySlug?: string;
}

interface BuyNowContextType {
  buyNowItem: BuyNowItem | null;
  setBuyNowItem: (item: BuyNowItem | null) => void;
  clearBuyNowItem: () => void;
  clearBuyNowAfterSuccessfulCheckout: () => void;
  isLoading: boolean;
  restoreFromStorage: () => void;
}

const BuyNowContext = createContext<BuyNowContextType | undefined>(undefined);

export function BuyNowProvider({ children }: { children: ReactNode }) {
  const [buyNowItem, setBuyNowItemState] = useState<BuyNowItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [wasBuyNowIntentionallyCleared, setWasBuyNowIntentionallyCleared] = useState(false)
  const { cartItems } = useCart();
  
  // Add ref to prevent unnecessary operations
  const lastCartLengthRef = useRef(0);

  // Enhanced persistence with both sessionStorage and localStorage for better reliability
  useEffect(() => {
    const loadBuyNowItem = () => {
      try {
        setIsLoading(true);
        
        // Try sessionStorage first (primary storage)
        let stored = sessionStorage.getItem("buyNowItem");
        
        // Fallback to localStorage if sessionStorage is empty
        if (!stored) {
          stored = localStorage.getItem("buyNowItem");
          // If we found it in localStorage, also copy it to sessionStorage
          if (stored) {
            sessionStorage.setItem("buyNowItem", stored);
          }
        }
        
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("[BuyNowContext] 📦 Loaded buy-now item:", parsed);
          if (parsed && parsed._id && parsed.name) {
            setBuyNowItemState(parsed);
          } else {
            console.log("[BuyNowContext] ❌ Stored buy-now item is invalid, clearing");
            sessionStorage.removeItem("buyNowItem");
            localStorage.removeItem("buyNowItem");
            setBuyNowItemState(null);
          }
        } else {
          console.log("[BuyNowContext] 📭 No stored buy-now item found");
          setBuyNowItemState(null);
        }
      } catch (error) {
        console.error("[BuyNowContext] ❌ Error parsing stored buy-now item:", error);
        sessionStorage.removeItem("buyNowItem");
        localStorage.removeItem("buyNowItem");
        setBuyNowItemState(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Load immediately
    loadBuyNowItem();
    
    // Also listen for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "buyNowItem") {
        console.log("[BuyNowContext] 🔄 Storage event detected, reloading buy-now item");
        loadBuyNowItem();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Enhanced persistence - save to both storages for better reliability
  useEffect(() => {
    if (buyNowItem) {
      const itemData = JSON.stringify(buyNowItem);
      sessionStorage.setItem("buyNowItem", itemData);
      localStorage.setItem("buyNowItem", itemData); // Backup in localStorage
      console.log("[BuyNowContext] 💾 Saved buy-now item to both storages");
      
      // Store in checkout flow specific storage with unique key
      const buyNowData = {
        flow: {
          mode: 'buy-now',
          items: [buyNowItem],
          source: 'buy-now',
          timestamp: Date.now(),
          sessionId: `buynow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        items: [buyNowItem],
        timestamp: Date.now()
      };
      sessionStorage.setItem("buyNowCheckoutData", JSON.stringify(buyNowData));
      localStorage.setItem("buyNowCheckoutData", JSON.stringify(buyNowData));
      
      // Also store in flow-specific storage for immediate checkout access
      const flow: CheckoutFlow = {
        mode: 'buy-now',
        items: [buyNowItem],
        source: 'buy-now',
        timestamp: Date.now(),
        sessionId: `buynow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      sessionStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
      sessionStorage.setItem("buyNowCheckoutItems", JSON.stringify([buyNowItem]));
      localStorage.setItem("buyNowCheckoutFlow", JSON.stringify(flow));
      localStorage.setItem("buyNowCheckoutItems", JSON.stringify([buyNowItem]));
      
      console.log("[BuyNowContext] 💾 Saved buy-now checkout flow data to all storage locations");
    } else {
      // Only clear if buy-now was intentionally cleared (not on mount)
      if (wasBuyNowIntentionallyCleared) {
        sessionStorage.removeItem("buyNowItem");
        localStorage.removeItem("buyNowItem");
        sessionStorage.removeItem("buyNowCheckoutData");
        localStorage.removeItem("buyNowCheckoutData");
        sessionStorage.removeItem("buyNowCheckoutFlow");
        localStorage.removeItem("buyNowCheckoutFlow");
        sessionStorage.removeItem("buyNowCheckoutItems");
        localStorage.removeItem("buyNowCheckoutItems");
        console.log("[BuyNowContext] 🗑️ Cleared buy-now item from all storages after successful checkout");
      }
    }
  }, [buyNowItem, wasBuyNowIntentionallyCleared]);

  // REMOVED: Auto-clear buy-now when cart operations occur
  // This was causing conflicts between buy-now and cart flows
  // Buy-now and cart should be completely independent

  function setBuyNowItem(item: BuyNowItem | null) {
    console.log("[BuyNowContext] 🔄 Setting buy-now item:", item);
    setBuyNowItemState(item);
  }

  function clearBuyNowItem() {
    console.log("[BuyNowContext] 🗑️ Clearing buy-now item");
    setBuyNowItemState(null);
    
    // Clear from all storage locations
    sessionStorage.removeItem("buyNowItem");
    localStorage.removeItem("buyNowItem");
    sessionStorage.removeItem("buyNowCheckoutData");
    localStorage.removeItem("buyNowCheckoutData");
    
    // Clear flow-specific storage keys
    sessionStorage.removeItem("buyNowCheckoutFlow");
    sessionStorage.removeItem("buyNowCheckoutItems");
    localStorage.removeItem("buyNowCheckoutFlow");
    localStorage.removeItem("buyNowCheckoutItems");
  }

  // 🔧 NEW FUNCTION: Clear buy-now after successful checkout (keeps cart intact)
  function clearBuyNowAfterSuccessfulCheckout() {
    console.log("[BuyNowContext] 🗑️ Clearing buy-now after successful checkout");
    setBuyNowItemState(null);
    setWasBuyNowIntentionallyCleared(true);
    
    // Clear buy-now items from storage
    sessionStorage.removeItem("buyNowItem");
    localStorage.removeItem("buyNowItem");
    
    // Clear buy-now checkout flow data
    sessionStorage.removeItem("buyNowCheckoutData");
    localStorage.removeItem("buyNowCheckoutData");
    sessionStorage.removeItem("buyNowCheckoutFlow");
    sessionStorage.removeItem("buyNowCheckoutItems");
    localStorage.removeItem("buyNowCheckoutFlow");
    localStorage.removeItem("buyNowCheckoutItems");
    localStorage.removeItem("buyNowOrderData");
    sessionStorage.removeItem("buyNowOrderData");
    
    console.log("[BuyNowContext] 🗑️ Buy-now cleared after successful checkout - all storage locations cleaned");
  }

  function restoreFromStorage() {
    console.log("[BuyNowContext] 🔄 Attempting to restore from storage");
    setIsLoading(true);
    
    try {
      // Try to restore from checkout flow data first
      const checkoutData = sessionStorage.getItem("buyNowCheckoutData") || localStorage.getItem("buyNowCheckoutData");
      if (checkoutData) {
        const parsed = JSON.parse(checkoutData);
        if (parsed.items && parsed.items.length > 0) {
          const item = parsed.items[0];
          if (item && item._id && item.name) {
            console.log("[BuyNowContext] ✅ Restored from checkout flow data:", item);
            setBuyNowItemState(item);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Fallback to regular buy-now storage
      const stored = sessionStorage.getItem("buyNowItem") || localStorage.getItem("buyNowItem");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id && parsed.name) {
          console.log("[BuyNowContext] ✅ Restored from regular storage:", parsed);
          setBuyNowItemState(parsed);
        } else {
          console.log("[BuyNowContext] ❌ Stored item is invalid, clearing");
          clearBuyNowItem();
        }
      } else {
        console.log("[BuyNowContext] 📭 No stored item found");
      }
    } catch (error) {
      console.error("[BuyNowContext] ❌ Error restoring from storage:", error);
      clearBuyNowItem();
    } finally {
      setIsLoading(false);
    }
  }

  const value: BuyNowContextType = {
    buyNowItem,
    setBuyNowItem,
    clearBuyNowItem,
    clearBuyNowAfterSuccessfulCheckout,
    isLoading,
    restoreFromStorage
  };

  return (
    <BuyNowContext.Provider value={value}>
      {children}
    </BuyNowContext.Provider>
  );
}

export function useBuyNow() {
  const context = useContext(BuyNowContext);
  if (context === undefined) {
    throw new Error('useBuyNow must be used within a BuyNowProvider');
  }
  return context;
} 