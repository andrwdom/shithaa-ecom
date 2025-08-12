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
    isLoadingOffer,
    debugCart
  } = useCart();

  const { user } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [productStocks, setProductStocks] = useState<Record<string, Record<string, number>>>({});

  // Fetch stock info for all cart items on open and refresh cart data
  useEffect(() => {
    const fetchStocksAndRefreshCart = async () => {
      if (!user) return;
      
      try {
        // First refresh cart data to ensure we have the latest
        await refreshCartData();
        
        if (cartItems.length === 0) return;
        
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
          const data = await response.json();
          if (data.success && data.data) {
            setProductStocks(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching stock info:', error);
      }
    };

    if (isCartSidebarOpen) {
      fetchStocksAndRefreshCart();
    }
  }, [isCartSidebarOpen, user, cartItems]);

  // Enhanced stock validation for cart items
  const getItemStock = (item: any) => {
    if (!productStocks[item._id]) return 0;
    return productStocks[item._id][item.size] || 0;
  };

  const isItemOutOfStock = (item: any) => {
    const stock = getItemStock(item);
    return stock === 0;
  };

  const isQuantityExceedingStock = (item: any) => {
    const stock = getItemStock(item);
    return stock > 0 && item.quantity > stock;
  };

  const getStockStatus = (item: any) => {
    const stock = getItemStock(item);
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-500' };
    if (stock <= 5) return { text: `Only ${stock} left!`, color: 'text-orange-500' };
    return { text: 'In Stock', color: 'text-green-600' };
  };

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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshCartData}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Refresh Cart"
            >
              ↻
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={debugCart}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Debug Cart"
            >
              🐛
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeCartSidebar}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some products to get started!</p>
              <Button
                onClick={closeCartSidebar}
                className="bg-[rgb(71,60,102)] hover:bg-[rgb(71,60,102)]/90 text-white"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item, index) => {
                const stock = getItemStock(item);
                const stockStatus = getStockStatus(item);
                const isOutOfStock = isItemOutOfStock(item);
                const isExceedingStock = isQuantityExceedingStock(item);
                
                return (
                  <div key={`${item._id}-${item.size}-${index}`} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="object-cover rounded-lg"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-500">Size: {item.size}</p>
                      <p className="text-sm font-medium text-gray-900">₹{item.price.toLocaleString()}</p>
                      
                      {/* Stock status */}
                      <div className={`text-xs font-medium ${stockStatus.color} mt-1`}>
                        {stockStatus.text}
                      </div>
                      
                      {/* Stock warning */}
                      {isExceedingStock && (
                        <div className="text-xs text-red-500 font-medium mt-1">
                          Max quantity: {stock}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <button
                          onClick={() => updateCartItem(item._id, item.size, Math.max(1, item.quantity - 1), stock)}
                          disabled={item.quantity <= 1 || isUpdating[`${item._id}-${item.size}`]}
                          className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-700 disabled:text-gray-300 bg-white hover:bg-gray-100 transition disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-12 text-center text-sm font-medium bg-white px-2 py-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItem(item._id, item.size, item.quantity + 1, stock)}
                          disabled={isOutOfStock || item.quantity >= stock || isUpdating[`${item._id}-${item.size}`]}
                          className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-700 bg-white hover:bg-gray-100 transition disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item._id, item.size)}
                        disabled={isUpdating[`${item._id}-${item.size}`]}
                        className="text-red-500 hover:text-red-700 transition p-1 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
