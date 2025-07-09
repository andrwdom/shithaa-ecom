"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface BuyNowItem {
  id: number;
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

  // Persist in sessionStorage for reloads
  useEffect(() => {
    const stored = sessionStorage.getItem("buyNowItem");
    if (stored) setBuyNowItemState(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (buyNowItem) {
      sessionStorage.setItem("buyNowItem", JSON.stringify(buyNowItem));
    } else {
      sessionStorage.removeItem("buyNowItem");
    }
  }, [buyNowItem]);

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