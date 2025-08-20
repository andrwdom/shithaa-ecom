"use client";
import React, { useState } from 'react'
import { Gift } from 'lucide-react'
import { calculateShippingCost, ShippingInfo } from '@/lib/shipping-calculator'

export default function OrderSummary({ cartItems, coupon, offerDetails, mode = 'cart', shippingInfo }: any) {
  const [open, setOpen] = useState(true)
  
  // 🔑 FIXED: Ensure strict data separation based on checkout mode
  const isBuyNowMode = mode === 'buy-now';
  const displayItems = cartItems || [];
  
  // 🚨 SAFETY CHECK: Ensure buy-now flows never receive cart promotions
  if (isBuyNowMode && offerDetails?.offerApplied) {
    console.error('[OrderSummary] 🚨 SAFETY VIOLATION: Buy-now flow received cart promotions!', {
      mode,
      offerDetails,
      displayItems
    });
    // Force override to prevent cart promotion leakage
    offerDetails = null;
  }
  
  // 🔑 FIXED: Calculate all values fresh from displayItems instead of using potentially contaminated summary
  const itemSubtotal = displayItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  
  // 🔑 FIXED: Calculate actual shipping cost using shipping rules instead of hardcoded values
  let shippingCalculation;
  let shipping = 0;
  
  if (shippingInfo && shippingInfo.state && shippingInfo.state.trim()) {
    shippingCalculation = calculateShippingCost(displayItems, shippingInfo);
    shipping = shippingCalculation.shippingCost;
  } else {
    // No shipping info available yet
    shippingCalculation = {
      shippingCost: 0,
      isFreeShipping: false,
      shippingMessage: "Shipping location not set"
    };
  }
  
  // Calculate total with offer discount - Only for cart mode
  const offerDiscount = (!isBuyNowMode && offerDetails?.offerApplied) ? offerDetails.offerDiscount : 0;
  const total = itemSubtotal - offerDiscount + shipping;
  
  // 🔑 FIXED: Enhanced debug logging to confirm data source and prevent contamination
  console.log(`[OrderSummary] 🔍 DEBUG: Mode: ${mode}, Items count: ${displayItems.length}`, {
    mode,
    isBuyNowMode,
    itemsCount: displayItems.length,
    firstItem: displayItems.length > 0 ? {
      name: displayItems[0].name,
      price: displayItems[0].price,
      quantity: displayItems[0].quantity,
      size: displayItems[0].size
    } : null,
    calculatedValues: {
      itemSubtotal,
      shipping,
      total
    },
    shippingCalculation,
    shippingInfo,
    // ✅ NO MORE SUMMARY PROP - Single source of truth
    dataSource: 'displayItems + shipping calculation',
    cartItemsProp: cartItems,
    displayItemsFinal: displayItems,
    // 🚨 SAFETY: Log promotion isolation
    promotionsIsolated: isBuyNowMode ? !offerDetails?.offerApplied : true,
    offerDetailsReceived: !!offerDetails,
    offerDetailsApplied: !isBuyNowMode && offerDetails?.offerApplied
  });
  
  // 🔑 DEBUG: Log calculation details right before rendering totals
  console.log("[OrderSummary] DEBUG calculation:", {
    cartItems,
    mode,
    isBuyNowMode,
    subtotal: cartItems?.reduce((s: number, i: any) => s + i.price * i.quantity, 0),
    displayItemsSubtotal: displayItems?.reduce((s: number, i: any) => s + i.price * i.quantity, 0),
    itemSubtotal,
    offerDiscount,
    offerDetailsApplied: !isBuyNowMode && offerDetails?.offerApplied,
    shipping,
    total,
    shippingCalculation,
    offerDetails
  });
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border md:sticky md:top-20">
      <h3 className="text-lg font-semibold mb-4">
        Order Summary {isBuyNowMode && <span className="text-sm text-blue-600">(Buy Now)</span>}
      </h3>
      <div className="space-y-2 text-sm">
        {displayItems.map((item: any) => (
          <div key={item.id + item.size} className="flex justify-between">
            <span>{item.name} <span className="text-xs text-gray-500">({item.size})</span> x {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between">
          <span>Subtotal</span><span>₹{itemSubtotal}</span>
        </div>
        
        {/* Loungewear Offer - Only for cart mode */}
        {!isBuyNowMode && offerDetails?.offerApplied && (
          <div className="flex justify-between text-green-700 font-semibold">
            <div className="flex items-center gap-1">
              <Gift className="h-3 w-3"/>
              <span>Loungewear Offer</span>
            </div>
            <span>-₹{offerDetails.offerDiscount}</span>
          </div>
        )}
        
        {/* Coupon Discount */}
        {coupon && (
          <div className="flex justify-between text-green-700 font-semibold">
            <span>Coupon Discount ({coupon.discountPercentage}%)</span>
            <span>-₹{Math.round((itemSubtotal * coupon.discountPercentage) / 100)}</span>
          </div>
        )}
        
        {/* 🔑 FIXED: Dynamic shipping display based on actual calculation */}
        <div className="flex justify-between items-center">
          <span>Shipping</span>
          <span className="flex flex-col items-end">
            {!shippingInfo?.state ? (
              <span className="text-gray-500 text-sm">Set shipping location</span>
            ) : shippingCalculation.isFreeShipping ? (
              <span className="text-green-700 font-semibold text-sm">{shippingCalculation.shippingMessage}</span>
            ) : (
              <span className="text-gray-700 font-semibold text-sm">₹{shipping}</span>
            )}
          </span>
        </div>
        
        {/* 🔑 FIXED: Show shipping message below the cost */}
        {shippingCalculation.shippingMessage && shippingInfo?.state && (
          <div className="text-xs text-gray-600 text-right">
            {shippingCalculation.shippingMessage}
          </div>
        )}
        
        <div className="border-t pt-2 font-semibold text-base flex justify-between">
          <span>Total</span><span>₹{total}</span>
        </div>
        
        {/* Offer Details - Only for cart mode */}
        {!isBuyNowMode && offerDetails?.offerApplied && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded">
            <div className="text-xs text-green-800 space-y-1">
              <p className="font-semibold">🎉 Loungewear Offer Applied!</p>
              <p>• {offerDetails.offerDetails?.completeSets} set(s) of 3 for ₹1299 each</p>
              {offerDetails.offerDetails?.remainingItems > 0 && (
                <p>• {offerDetails.offerDetails.remainingItems} item(s) at ₹450 each</p>
              )}
              <p className="font-semibold">You saved ₹{offerDetails.offerDiscount}!</p>
            </div>
          </div>
        )}
        
        {/* 🚨 SAFETY: Show warning if buy-now flow somehow received promotions */}
        {isBuyNowMode && offerDetails?.offerApplied && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded">
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">⚠️ System Warning</p>
              <p>Buy-now flow should not have cart promotions. This has been automatically corrected.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 