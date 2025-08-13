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
  isLoading: boolean;
  restoreFromStorage: () => void;
}

const BuyNowContext = createContext<BuyNowContextType | undefined>(undefined);

export function BuyNowProvider({ children }: { children: React.ReactNode }) {
  const [buyNowItem, setBuyNowItemState] = useState<BuyNowItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { cartItems } = useCart();

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
          console.log("BuyNowProvider: Loaded buy-now item:", parsed);
          if (parsed && parsed._id && parsed.name) {
            setBuyNowItemState(parsed);
          } else {
            console.log("BuyNowProvider: Stored buy-now item is invalid, clearing");
            sessionStorage.removeItem("buyNowItem");
            localStorage.removeItem("buyNowItem");
            setBuyNowItemState(null);
          }
        } else {
          console.log("BuyNowProvider: No stored buy-now item found");
          setBuyNowItemState(null);
        }
      } catch (error) {
        console.error("BuyNowProvider: Error parsing stored buy-now item:", error);
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
        console.log("BuyNowProvider: Storage event detected, reloading buy-now item");
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
      console.log("BuyNowProvider: Saved buy-now item to both storages");
    } else {
      sessionStorage.removeItem("buyNowItem");
      localStorage.removeItem("buyNowItem");
      console.log("BuyNowProvider: Cleared buy-now item from both storages");
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
    console.log("BuyNowProvider: Setting buy-now item:", item);
    setBuyNowItemState(item);
  }

  function clearBuyNowItem() {
    console.log("BuyNowProvider: Clearing buy-now item");
    setBuyNowItemState(null);
    sessionStorage.removeItem("buyNowItem");
    localStorage.removeItem("buyNowItem");
  }

  function restoreFromStorage() {
    console.log("BuyNowProvider: Restoring buy-now item from storage");
    const stored = sessionStorage.getItem("buyNowItem");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed._id && parsed.name) {
        setBuyNowItemState(parsed);
        console.log("BuyNowProvider: Restored buy-now item from sessionStorage");
      } else {
        console.log("BuyNowProvider: Stored buy-now item in sessionStorage is invalid, clearing");
        sessionStorage.removeItem("buyNowItem");
        localStorage.removeItem("buyNowItem");
        setBuyNowItemState(null);
      }
    } else {
      const stored = localStorage.getItem("buyNowItem");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id && parsed.name) {
          setBuyNowItemState(parsed);
          console.log("BuyNowProvider: Restored buy-now item from localStorage");
        } else {
          console.log("BuyNowProvider: Stored buy-now item in localStorage is invalid, clearing");
          sessionStorage.removeItem("buyNowItem");
          localStorage.removeItem("buyNowItem");
          setBuyNowItemState(null);
        }
      } else {
        console.log("BuyNowProvider: No stored buy-now item found in either storage");
        setBuyNowItemState(null);
      }
    }
  }

  return (
    <BuyNowContext.Provider value={{ buyNowItem, setBuyNowItem, clearBuyNowItem, isLoading, restoreFromStorage }}>
      {children}
    </BuyNowContext.Provider>
  );
}

export function useBuyNow() {
  const ctx = useContext(BuyNowContext);
  if (!ctx) throw new Error("useBuyNow must be used within a BuyNowProvider");
  return ctx;
} 