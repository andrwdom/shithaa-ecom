"use client";
import { useState } from "react";

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

function formatDate(date: string | number) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(date: string | number) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    ' • ' + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Accent bar color by status
const STATUS_ACCENT = {
  Pending: "from-yellow-300 to-yellow-400",
  Packing: "from-blue-300 to-blue-400",
  Shipped: "from-green-300 to-green-400",
  Delivered: "from-green-500 to-green-700",
  Cancelled: "from-red-400 to-red-600",
};

// Border color by status
const STATUS_BORDER = {
  Pending: "border-yellow-400 ring-yellow-100",
  Packing: "border-blue-400 ring-blue-100",
  Shipped: "border-green-400 ring-green-100",
  Delivered: "border-green-700 ring-green-200",
  Cancelled: "border-red-500 ring-red-100",
};

// Left border color by status
const STATUS_BORDER_LEFT = {
  Pending: "border-l-4 border-yellow-400",
  Packing: "border-l-4 border-blue-400",
  Shipped: "border-l-4 border-green-400",
  Delivered: "border-l-4 border-green-700",
  Cancelled: "border-l-4 border-red-500",
};

export default function OrderHistory({ orders }: { orders: any[] }) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  if (!orders) return null;

  return (
    <div className="space-y-6">
      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🛒</div>
          <div className="font-semibold text-lg">You haven’t placed any orders yet.</div>
          <div className="text-sm mt-1">Browse our collection and start shopping!</div>
        </div>
      )}
      <div className="flex flex-col gap-6">
      {orders.map((order) => {
        const items = order.items || order.cartItems || [];
        const status = order.status || order.orderStatus || order.paymentStatus;
        const orderDate = order.createdAt || order.date || order.orderDate || order.updatedAt;
        const accent = STATUS_ACCENT[status as keyof typeof STATUS_ACCENT] || "from-gray-200 to-gray-300";
        const borderLeft = STATUS_BORDER_LEFT[status as keyof typeof STATUS_BORDER_LEFT] || "border-l-4 border-gray-200";
        // Minimal preview: product names, date, status, view details button
        return (
          <div
            key={order._id}
            className={`relative flex items-stretch bg-white rounded-2xl shadow-md ${borderLeft} transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group overflow-hidden`}
          >
            {/* Accent bar (optional, can remove if only border is needed) */}
            {/* Cancelled sticker */}
            {status.toLowerCase() === "cancelled" && (
              <div className="absolute -top-3 -left-6 z-10 rotate-[-18deg]">
                <span className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded shadow-lg drop-shadow-lg border-2 border-white">Cancelled</span>
              </div>
            )}
            <div className="flex flex-1 items-center gap-4 p-4">
              {/* Product thumbnail */}
              {items[0]?.image && (
                <img
                  src={Array.isArray(items[0].image) ? items[0].image[0] : items[0].image}
                  alt={items[0].name}
                  className="w-16 h-16 object-cover rounded-xl border-2 border-purple-100 shadow-sm bg-gray-50"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-gray-900 truncate">
                  {items.length === 1 ? items[0].name : `${items[0]?.name} +${items.length - 1} more`}
                </div>
                <div className="text-xs text-gray-500 mt-1 font-medium">
                  Ordered: {formatDateTime(orderDate)}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <StatusBadge status={status} />
                  <button
                    className="btn btn-xs btn-outline rounded-full px-4 py-1 font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:scale-105 transition-transform duration-150 shadow-sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
      {/* Modal for order details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative animate-fadeIn">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setSelectedOrder(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-2">Order Details</h3>
            <div className="mb-4 text-xs text-gray-500">Order ID: {selectedOrder._id}</div>
            <div className="mb-4">
              <div className="font-semibold mb-2">Products:</div>
              <div className="space-y-2">
                {(selectedOrder.items || selectedOrder.cartItems || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.image && (
                      <img src={Array.isArray(item.image) ? item.image[0] : item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                    )}
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-gray-500">Qty: {item.quantity} {item.size && `| Size: ${item.size}`}</div>
                      <div className="text-xs">Price: ₹{item.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Contact/Shipping Info */}
            {(selectedOrder.address || selectedOrder.shippingInfo) && (
              <div className="mb-4 text-sm">
                <span className="font-medium">Shipping Address:</span>
                <div className="pl-2 mt-1 text-gray-700">
                  {(() => {
                    // Get shipping information for display
                    const getShippingDisplayInfo = () => {
                      if (selectedOrder.shippingInfo) {
                        // Use new shippingInfo structure
                        return [
                          { label: 'Full Name', value: selectedOrder.shippingInfo.fullName },
                          { label: 'Email', value: selectedOrder.shippingInfo.email },
                          { label: 'Phone', value: selectedOrder.shippingInfo.phone },
                          { label: 'Address Line 1', value: selectedOrder.shippingInfo.addressLine1 },
                          { label: 'Address Line 2', value: selectedOrder.shippingInfo.addressLine2 },
                          { label: 'City', value: selectedOrder.shippingInfo.city },
                          { label: 'State', value: selectedOrder.shippingInfo.state },
                          { label: 'Postal Code', value: selectedOrder.shippingInfo.postalCode },
                          { label: 'Country', value: selectedOrder.shippingInfo.country }
                        ].filter(field => field.value);
                      } else if (selectedOrder.shippingAddress) {
                        // Use shippingAddress structure
                        return [
                          { label: 'Full Name', value: selectedOrder.shippingAddress.fullName },
                          { label: 'Email', value: selectedOrder.shippingAddress.email },
                          { label: 'Phone', value: selectedOrder.shippingAddress.phone },
                          { label: 'Flat/House No.', value: selectedOrder.shippingAddress.flatHouseNo },
                          { label: 'Area/Locality', value: selectedOrder.shippingAddress.areaLocality },
                          { label: 'Street Address', value: selectedOrder.shippingAddress.streetAddress },
                          { label: 'Landmark', value: selectedOrder.shippingAddress.landmark },
                          { label: 'City', value: selectedOrder.shippingAddress.city },
                          { label: 'State', value: selectedOrder.shippingAddress.state },
                          { label: 'Pincode', value: selectedOrder.shippingAddress.pincode },
                          { label: 'Country', value: selectedOrder.shippingAddress.country }
                        ].filter(field => field.value);
                      } else if (selectedOrder.address) {
                        // Use legacy address structure
                        return [
                          { label: 'Address Line 1', value: selectedOrder.address.line1 },
                          { label: 'Address Line 2', value: selectedOrder.address.line2 },
                          { label: 'City', value: selectedOrder.address.city },
                          { label: 'State', value: selectedOrder.address.state },
                          { label: 'Pincode', value: selectedOrder.address.pincode },
                          { label: 'Country', value: selectedOrder.address.country }
                        ].filter(field => field.value);
                      }
                      return [];
                    };
                    
                    const shippingFields = getShippingDisplayInfo();
                    
                    if (shippingFields.length === 0) return null;
                    
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-1 shadow-sm">
                        {shippingFields.map((field, index) => (
                          <div key={index}>
                            <span className="font-medium">{field.label}:</span> {field.value}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            {/* Show total if available or calculable */}
            <div className="mb-2 text-sm">
              <span className="font-medium">Total:</span> ₹{
                typeof selectedOrder.totalAmount === 'number' ? selectedOrder.totalAmount :
                typeof selectedOrder.totalPrice === 'number' ? selectedOrder.totalPrice :
                typeof selectedOrder.total === 'number' ? selectedOrder.total :
                typeof selectedOrder.orderSummary?.total === 'number' ? selectedOrder.orderSummary.total :
                (selectedOrder.items || selectedOrder.cartItems || []).reduce((sum: number, item: any) => sum + (Number(item.price) * (Number(item.quantity) || 1)), 0)
              }
            </div>
            {/* Shipping and payment info if available */}
            {/* Add more fields as needed */}
            <div className="mt-6 text-center">
              <a href="/contact" className="text-sm text-purple-700 underline hover:text-purple-900 font-medium">Need help? Contact support</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 