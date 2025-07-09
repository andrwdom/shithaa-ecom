"use client";
import React, { useState } from 'react'

export default function OrderSummary({ cartItems, coupon, summary }: any) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-xl shadow p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[rgb(71,60,102)]">Order Summary</h2>
        <button className="lg:hidden btn btn-xs btn-ghost" onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'}</button>
      </div>
      <div className={`${open ? '' : 'hidden lg:block'}`}>
        <ul className="divide-y mb-4">
          {cartItems.map((item: any) => (
            <li key={item.id + item.size} className="py-2 flex justify-between items-center">
              <span className="font-medium text-gray-900">{item.name} <span className="text-xs text-gray-500">({item.size})</span> x {item.quantity}</span>
              <span className="font-semibold text-[rgb(71,60,102)]">₹{item.price * item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-sm mb-1">
          <span>Subtotal</span>
          <span>₹{summary.subtotal}</span>
        </div>
        {coupon && (
          <div className="flex justify-between text-sm mb-1 text-green-700 font-semibold">
            <span>Discount ({coupon.discountPercentage}%)</span>
            <span>-₹{summary.discount}</span>
          </div>
        )}
        <div className="flex justify-between text-sm mb-1">
          <span>Shipping</span>
          <span>₹{summary.shipping}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Total</span>
          <span>₹{summary.total}</span>
        </div>
      </div>
    </div>
  )
} 