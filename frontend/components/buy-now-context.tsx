"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useCart } from "./cart-context";

export interface BuyNowItem {
  id: string | number;
  _id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

interface BuyNowContextType {
  buyNowItem: BuyNowItem | null;
  setBuyNowItem: (item: BuyNowItem | null) => void;
  clearBuyNowItem: () => void;
}

const BuyNowContext = createContext<BuyNowContextType | undefined>(undefined);

export function BuyNowProvider({ children }: { children: React.ReactNode }) {
  const [buyNowItem, setBuyNowItemState] = useState<BuyNowItem | null>(null);
  const { cartItems } = useCart();

  // Persist in sessionStorage for reloads
  useEffect(() => {
    const loadBuyNowItem = () => {
      try {
        const stored = sessionStorage.getItem("buyNowItem");
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("BuyNowProvider: Loaded buy-now item:", parsed);
          if (parsed && parsed._id && parsed.name) {
            setBuyNowItemState(parsed);
          } else {
            console.log("BuyNowProvider: Stored buy-now item is invalid, clearing");
            sessionStorage.removeItem("buyNowItem");
            setBuyNowItemState(null);
          }
        } else {
          console.log("BuyNowProvider: No stored buy-now item found");
          setBuyNowItemState(null);
        }
      } catch (error) {
        console.error("BuyNowProvider: Error parsing stored buy-now item:", error);
        sessionStorage.removeItem("buyNowItem");
        setBuyNowItemState(null);
      }
    };

    // Load immediately
    loadBuyNowItem();
    
    // Also listen for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "buyNowItem") {
        console.log("BuyNowProvider: Storage event detected, reloading buy-now item");
        loadBuyNowItem();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (buyNowItem) {
      sessionStorage.setItem("buyNowItem", JSON.stringify(buyNowItem));
    } else {
      sessionStorage.removeItem("buyNowItem");
    }
  }, [buyNowItem]);

  // Auto-clear buy-now when cart operations occur (ensuring proper flow separation)
  useEffect(() => {
    if (buyNowItem && cartItems.length > 0) {
      // If user has items in cart and tries to buy now, clear buy-now to avoid confusion
      // This ensures checkout always shows the intended items
      clearBuyNowItem();
    }
  }, [cartItems.length]);

  function setBuyNowItem(item: BuyNowItem | null) {
    setBuyNowItemState(item);
  }

  function clearBuyNowItem() {
    setBuyNowItemState(null);
    sessionStorage.removeItem("buyNowItem");
  }

  return (
    <BuyNowContext.Provider value={{ buyNowItem, setBuyNowItem, clearBuyNowItem }}>
      {children}
    </BuyNowContext.Provider>
  );
}

export function useBuyNow() {
  const ctx = useContext(BuyNowContext);
  if (!ctx) throw new Error("useBuyNow must be used within a BuyNowProvider");
  return ctx;
} 