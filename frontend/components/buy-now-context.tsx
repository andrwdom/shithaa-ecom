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
  refreshBuyNowItem: () => Promise<void>; // Add this function
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

  // Function to refresh buy-now item data from backend to ensure fresh data
  const refreshBuyNowItem = async () => {
    if (!buyNowItem) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/products/${buyNowItem._id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const product = data.data;
          
          // Check if the selected size still has stock
          const sizeData = product.sizes?.find((s: any) => s.size === buyNowItem.size);
          const currentStock = sizeData?.stock || 0;
          
          // If item is out of stock, clear it
          if (currentStock === 0) {
            console.log(`Buy now product ${product.name} size ${buyNowItem.size} is out of stock, clearing buy now item`);
            clearBuyNowItem();
            return;
          }
          
          // If quantity exceeds stock, adjust it
          const adjustedQuantity = Math.min(buyNowItem.quantity, currentStock);
          
          // Create refreshed item with latest data
          const refreshedItem: BuyNowItem = {
            id: product._id || product.id,
            _id: product._id || product.id,
            name: product.name,
            price: product.price,
            quantity: adjustedQuantity,
            size: buyNowItem.size,
            image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image || buyNowItem.image,
          };
          
          // Update buy now item with refreshed data
          if (adjustedQuantity !== buyNowItem.quantity || 
              product.price !== buyNowItem.price ||
              product.name !== buyNowItem.name) {
            setBuyNowItem(refreshedItem);
            console.log("Buy now item data refreshed from backend");
          }
        } else {
          // Product not found, clear buy now item
          console.log("Buy now product not found, clearing buy now item");
          clearBuyNowItem();
        }
      } else {
        // API call failed, keep current item
        console.log("Failed to refresh buy now item data, keeping current item");
      }
    } catch (error) {
      console.error("Error refreshing buy now item data:", error);
      // Keep current item on error
    }
  };

  return (
    <BuyNowContext.Provider value={{ buyNowItem, setBuyNowItem, clearBuyNowItem, refreshBuyNowItem }}>
      {children}
    </BuyNowContext.Provider>
  );
}

export function useBuyNow() {
  const ctx = useContext(BuyNowContext);
  if (!ctx) throw new Error("useBuyNow must be used within a BuyNowProvider");
  return ctx;
} 