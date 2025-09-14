"use client";
import React from 'react'
import { Gift } from 'lucide-react'

export default function OrderSummary({ 
  summary, 
  cartItems, 
  coupon, 
  offerDetails, 
  mode = 'cart', 
  shippingInfo 
}: any) {
  // All calculations are now received via the 'summary' prop
  const { 
    subtotal, 
    offerDiscount, 
    couponDiscount, 
    shipping, 
    total, 
    shippingMessage, 
    isFreeShipping 
  } = summary;

  const isBuyNowMode = mode === 'buy-now';
  const displayItems = cartItems || [];

  console.log('[OrderSummary] ✅ Using pre-calculated summary prop:', {
    summary,
    mode,
    displayItemsCount: displayItems.length
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
          <span>Subtotal</span><span>₹{subtotal}</span>
        </div>
        
        {/* Loungewear Offer - Show when offer discount is applied */}
        {offerDiscount > 0 && (
          <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-2 my-2">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600"/>
              <div>
                <span className="text-green-800 font-semibold text-sm">Loungewear Offer Applied!</span>
                <div className="text-xs text-green-600">
                  {(() => {
                    // Use offer details from props if available, otherwise calculate from items
                    if (offerDetails?.offerDetails) {
                      const { completeSets, remainingItems } = offerDetails.offerDetails;
                      if (completeSets > 0 && remainingItems === 0) {
                        return `${completeSets} set(s) of 3 for ₹1299 each`;
                      } else if (completeSets > 0 && remainingItems > 0) {
                        return `${completeSets} set(s) of 3 + ${remainingItems} item(s) at ₹450 each`;
                      }
                    }
                    
                    // Fallback calculation
                    const loungewearItems = displayItems.filter((item: any) => 
                      item.categorySlug === 'zipless-feeding-lounge-wear' || 
                      item.categorySlug === 'non-feeding-lounge-wear' ||
                      (item.name && (item.name.toLowerCase().includes('lounge') || item.name.toLowerCase().includes('loungewear')))
                    );
                    const totalLoungewearQuantity = loungewearItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
                    const completeSets = Math.floor(totalLoungewearQuantity / 3);
                    const remainingItems = totalLoungewearQuantity % 3;
                    
                    if (completeSets > 0 && remainingItems === 0) {
                      return `${completeSets} set(s) of 3 for ₹1299 each`;
                    } else if (completeSets > 0 && remainingItems > 0) {
                      return `${completeSets} set(s) of 3 + ${remainingItems} item(s) at ₹450 each`;
                    } else {
                      return "3+ loungewear items qualify for special pricing";
                    }
                  })()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-800 font-bold text-lg">-₹{Math.abs(offerDiscount)}</div>
              <div className="text-xs text-green-600">You saved!</div>
            </div>
          </div>
        )}
        
        {/* Coupon Discount */}
        {coupon && couponDiscount > 0 && (
          <div className="flex justify-between text-green-700 font-semibold">
            <span>Coupon Discount ({coupon.discountPercentage}%)</span>
            <span>-₹{couponDiscount}</span>
          </div>
        )}
        
        {/* 🔑 FIXED: Dynamic shipping display based on actual calculation */}
        <div className="flex justify-between items-center">
          <span>Shipping</span>
          <span className="flex flex-col items-end">
            {!shippingInfo?.state ? (
              <span className="text-gray-500 text-sm">Set shipping location</span>
            ) : isFreeShipping ? (
              <span className="text-green-700 font-semibold text-sm">{shippingMessage}</span>
            ) : (
              <span className="text-gray-700 font-semibold text-sm">₹{shipping}</span>
            )}
          </span>
        </div>
        
        {/* 🔑 FIXED: Show shipping message below the cost */}
        {shippingMessage && shippingInfo?.state && (
          <div className="text-xs text-gray-600 text-right">
            {shippingMessage}
          </div>
        )}
        
        <div className="border-t pt-2 font-semibold text-base flex justify-between">
          <span>Total</span><span>₹{total}</span>
        </div>
        
        {/* Offer Details - CRITICAL FIX: Only show for 3+ items */}
        {(() => {
          const loungewearItems = displayItems.filter((item: any) => 
            item.categorySlug === 'zipless-feeding-lounge-wear' || 
            item.categorySlug === 'non-feeding-lounge-wear'
          );
          const totalLoungewearQuantity = loungewearItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
          
          // 🔧 CRITICAL FIX: Only show offer details if there are 3+ loungewear items
          const shouldShowOfferDetails = totalLoungewearQuantity >= 3 && offerDetails?.offerApplied;
          
          return shouldShowOfferDetails ? (
            <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
              <div className="text-xs text-green-800 space-y-1">
                <p className="font-semibold">🎉 Loungewear Offer Applied!</p>
                <p>• {offerDetails.offerDetails?.completeSets} set(s) of 3 for ₹1299 each</p>
                {offerDetails.offerDetails?.remainingItems > 0 && (
                  <p>• {offerDetails.offerDetails.remainingItems} item(s) at ₹450 each</p>
                )}
                <p className="font-semibold">You saved ₹{Math.abs(offerDiscount)}!</p>
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  )
} 