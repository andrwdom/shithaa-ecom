"use client";
import React, { useState } from 'react'
import { Gift } from 'lucide-react'

export default function OrderSummary({ cartItems, coupon, summary, offerDetails }: any) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border md:sticky md:top-20">
      <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
      <div className="space-y-2 text-sm">
        {cartItems.map((item: any) => (
          <div key={item.id + item.size} className="flex justify-between">
            <span>{item.name} <span className="text-xs text-gray-500">({item.size})</span> x {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between">
          <span>Subtotal</span><span>₹{summary.subtotal}</span>
        </div>
        
        {/* Loungewear Offer */}
        {offerDetails?.offerApplied && (
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
            <span>-₹{summary.discount}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span>Shipping</span>
          {summary.shipping === 0 ? (
            <span className="flex flex-col items-end">
              <span className="line-through text-gray-400 text-xs">₹49</span>
              <span className="text-green-700 font-semibold text-sm">Free shipping within Tamil Nadu!</span>
            </span>
          ) : (
            <span>₹{summary.shipping}</span>
          )}
        </div>
        <div className="border-t pt-2 font-semibold text-base flex justify-between">
          <span>Total</span><span>₹{summary.total}</span>
        </div>
        
        {/* Offer Details */}
        {offerDetails?.offerApplied && (
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
      </div>
    </div>
  )
} 