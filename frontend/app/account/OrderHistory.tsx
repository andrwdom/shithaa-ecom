"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800",
  Packing: "bg-blue-100 text-blue-800",
  Shipped: "bg-green-100 text-green-800",
  Delivered: "bg-green-700 text-white",
  Cancelled: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}

function downloadInvoice(orderId: string, token?: string) {
  const url = `${backendUrl}/api/orders/${orderId}/invoice`;
  fetch(url, {
    method: "GET",
    headers: token ? { token } : {},
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to download invoice");
      return res.blob();
    })
    .then((blob) => {
      saveAs(blob, `Invoice_${orderId}.pdf`);
    })
    .catch(() => alert("Failed to download invoice"));
}

export default function OrderHistory({ orders }: { orders: any[] }) {
  if (!orders) return null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : undefined;
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold mb-4">Order History</h2>
      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🛒</div>
          <div className="font-semibold text-lg">You haven’t placed any orders yet.</div>
          <div className="text-sm mt-1">Browse our collection and start shopping!</div>
        </div>
      )}
      {orders.map((order) => {
        // Support both new and legacy order structures
        const items = order.items || order.cartItems || [];
        const total = order.totalAmount || order.totalPrice || order.total || order.orderSummary?.total || 0;
        const status = order.status || order.orderStatus || order.paymentStatus;
        const payment = order.paymentStatus || order.paymentMethod;
        const shipping = order.shippingInfo || order.address;
        const userInfo = order.userInfo || { name: order.customerName, email: order.email };
        // Robust address join
        const address = [
          shipping?.address,
          shipping?.address1,
          shipping?.address2,
          shipping?.line1,
          shipping?.line2,
          shipping?.city,
          shipping?.state,
          shipping?.country,
          shipping?.pincode,
          shipping?.zipcode,
          shipping?.zip,
        ].filter(Boolean).join(', ');
        return (
          <div key={order._id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-lg">Order #{order._id.slice(-6)}</div>
              <StatusBadge status={status} />
            </div>
            <div className="text-sm text-gray-600 mb-2">
              <span>Placed: {new Date(order.createdAt).toLocaleString()}</span>
              {order.updatedAt && (
                <span className="ml-2 text-xs text-gray-400">(Last updated: {new Date(order.updatedAt).toLocaleString()})</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mb-1">
              <span>Customer: {userInfo.name}</span> | <span>Email: {userInfo.email}</span>
            </div>
            <div className="text-xs text-gray-500 mb-1">
              <span>Shipping: {address}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 border-b pb-2 last:border-b-0">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-gray-500">Qty: {item.quantity} {item.size && `| Size: ${item.size}`}</div>
                    <div className="text-xs">Price: ₹{item.price}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="font-bold text-right">Total: 	{total}</div>
            <div className="text-sm text-gray-500">Payment: {payment}</div>
            <button
              className="mt-2 px-4 py-2 rounded font-semibold text-white transition w-max self-end"
              style={{ backgroundColor: '#473C66', border: 'none' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#36234d')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#473C66')}
              onClick={() => downloadInvoice(order._id, token || undefined)}
            >
              Download Invoice
            </button>
          </div>
        );
      })}
    </div>
  );
} 