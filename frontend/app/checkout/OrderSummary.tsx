"use client";
import React, { useState } from 'react'

export default function OrderSummary({ cartItems, coupon, summary }: any) {
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
        {coupon && (
          <div className="flex justify-between text-green-700 font-semibold">
            <span>Discount ({coupon.discountPercentage}%)</span>
            <span>-₹{summary.discount}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping</span><span>₹{summary.shipping}</span>
        </div>
        <div className="border-t pt-2 font-semibold text-base flex justify-between">
          <span>Total</span><span>₹{summary.total}</span>
        </div>
      </div>
    </div>
  )
} 