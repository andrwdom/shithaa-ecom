"use client"

import React, { useState, useEffect } from "react";
import { useCart } from "./cart-context";
import { useAuth } from "./auth/AuthContext";
import { Button } from "./ui/button";
import { ShoppingBag, X, Minus, Plus, Trash2, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getShippingDisplayMessage } from "@/lib/shipping-calculator"

export default function CartSidebar() {
  const {
    cartItems,
    removeFromCart,
    updateCartItem,
    isCartSidebarOpen,
    closeCartSidebar,
    refreshCartData,
    cartTotal,
    cartSubtotal,
    offerDetails,
    isLoadingOffer
  } = useCart();

  const { user } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [productStocks, setProductStocks] = useState<Record<string, Record<string, number>>>({});

  // Fetch stock info for all cart items on open
  useEffect(() => {
    const fetchStocks = async () => {
      if (!user || cartItems.length === 0) return;
      
      try {
        const token = await user.getIdToken();
        if (!token) return;

        const productIds = [...new Set(cartItems.map(item => item._id))];
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/cart/get-stock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token
          },
          body: JSON.stringify({ productIds })
        });

        if (response.ok) {
          const stockData = await response.json();
          setProductStocks(stockData);
          console.log('Stock data fetched:', stockData);
        } else {
          console.error('Failed to fetch stock data');
        }
      } catch (error) {
        console.error('Error fetching stock data:', error);
      }
    };
    if (isCartSidebarOpen && cartItems.length > 0) fetchStocks();
  }, [isCartSidebarOpen, cartItems, user]);

  const handleQuantityUpdate = async (item: any, newQuantity: number) => {
    console.log('handleQuantityUpdate called:', { item: item._id, size: item.size, newQuantity, currentStock: productStocks[item._id]?.[item.size] });
    
    if (newQuantity < 1) return;
    
    const currentStock = productStocks[item._id]?.[item.size] || 0;
    console.log('Stock check:', { itemId: item._id, size: item.size, currentStock, newQuantity });
    
    // CRITICAL: Validate stock before any updates
    if (newQuantity > currentStock) {
      console.warn(`Stock validation failed in sidebar: quantity ${newQuantity} > stock ${currentStock}`);
      alert(`Cannot set quantity higher than ${currentStock} in stock for this size.`);
      return;
    }

    const itemKey = `${item._id}-${item.size}`;
    setIsUpdating(prev => ({ ...prev, [itemKey]: true }));
    
    try {
      await updateCartItem(item._id, item.size, newQuantity, currentStock);
    } catch (error) {
      console.error('Error updating cart item:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleRemoveItem = async (item: any) => {
    const itemKey = `${item._id}-${item.size}`;
    setIsUpdating(prev => ({ ...prev, [itemKey]: true }));
    
    try {
      await removeFromCart(item._id, item.size);
    } catch (error) {
      console.error('Error removing cart item:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleProceedToCheckout = async () => {
    try {
      // Refresh cart data before checkout to ensure accuracy
      await refreshCartData();
      closeCartSidebar();
      router.push('/checkout');
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
    }
  };

  if (!isCartSidebarOpen) return null;

  return (
    <React.Fragment>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closeCartSidebar}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-[rgb(71,60,102)]" />
            <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeCartSidebar}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500">Add some items to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</p>
              
              {cartItems.map((item) => {
                const itemKey = `${item._id}-${item.size}`;
                const isItemUpdating = isUpdating[itemKey];
                const currentStock = productStocks[item._id]?.[item.size] || 0;
                
                return (
                  <div key={item._id + item.size} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-500">Size: {item.size}</p>
                      <p className="text-sm font-semibold text-[rgb(71,60,102)]">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityUpdate(item, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isItemUpdating}
                        className="min-w-[40px]"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                        disabled={item.quantity >= currentStock || isItemUpdating}
                        className="min-w-[40px]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item)}
                      disabled={isItemUpdating}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 min-w-[40px]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-white">
            {/* Offer Details */}
            {offerDetails?.offerApplied && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <Gift className="h-4 w-4" />
                  <span className="text-sm font-medium">Special Offer Applied!</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {offerDetails.offerDetails?.completeSets || 0} complete sets at special price
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <div className="text-right">
                {isLoadingOffer ? (
                  <div className="text-sm text-gray-500">Calculating...</div>
                ) : (
                  <span className="text-2xl font-bold text-[rgb(71,60,102)]">₹{cartTotal.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center mb-4">
              {getShippingDisplayMessage(cartItems, null)}
            </div>
            <Button 
              className="w-full bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white py-3 rounded-xl font-semibold" 
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
            </Button>
            <Button
              variant="outline"
              className="w-full mt-3 border-[rgb(71,60,102)] text-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)] hover:text-white bg-transparent"
              onClick={closeCartSidebar}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
