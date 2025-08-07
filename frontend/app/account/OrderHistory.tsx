"use client";
import { useState } from "react";
import { Clock, Cog, Truck, CheckCircle, Ban } from "lucide-react";

// Complete status configuration with icons and descriptions
const STATUS_CONFIG = {
  Pending: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    iconColor: "text-yellow-500",
    description: "Order received, waiting to be processed",
    accent: "from-yellow-300 to-yellow-400",
    borderLeft: "border-l-4 border-yellow-400",
    border: "border-yellow-400 ring-yellow-100"
  },
  Processing: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Cog,
    iconColor: "text-blue-500",
    description: "Order is being prepared and packed",
    accent: "from-blue-300 to-blue-400",
    borderLeft: "border-l-4 border-blue-400",
    border: "border-blue-400 ring-blue-100"
  },
  Shipped: {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Truck,
    iconColor: "text-purple-500",
    description: "Order has been shipped and is in transit",
    accent: "from-purple-300 to-purple-400",
    borderLeft: "border-l-4 border-purple-400",
    border: "border-purple-400 ring-purple-100"
  },
  Delivered: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-500",
    description: "Order has been successfully delivered",
    accent: "from-green-300 to-green-400",
    borderLeft: "border-l-4 border-green-400",
    border: "border-green-400 ring-green-100"
  },
  Cancelled: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: Ban,
    iconColor: "text-red-500",
    description: "Order has been cancelled",
    accent: "from-red-400 to-red-600",
    borderLeft: "border-l-4 border-red-500",
    border: "border-red-500 ring-red-100"
  }
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Pending;
  const IconComponent = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      <IconComponent className={`w-3 h-3 ${config.iconColor}`} />
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

export default function OrderHistory({ orders }: { orders: any[] }) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  if (!orders) return null;

  return (
    <div className="space-y-6">
      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🛒</div>
          <div className="font-semibold text-lg">You haven't placed any orders yet.</div>
          <div className="text-sm mt-1">Browse our collection and start shopping!</div>
        </div>
      )}
      <div className="flex flex-col gap-6">
      {orders.map((order) => {
        const items = order.items || order.cartItems || [];
        const status = order.status || order.orderStatus || order.paymentStatus;
        const orderDate = order.createdAt || order.date || order.orderDate || order.updatedAt;
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Pending;
        
        // Minimal preview: product names, date, status, view details button
        return (
          <div
            key={order._id}
            className={`relative flex items-stretch bg-white rounded-2xl shadow-lg border border-pink-100 ${config.borderLeft} transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group overflow-hidden`}
          >
            {/* Cancelled sticker */}
            {status.toLowerCase() === "cancelled" && (
              <div className="absolute -top-3 -left-6 z-10 rotate-[-18deg]">
                <span className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded shadow-lg drop-shadow-lg border-2 border-white">Cancelled</span>
              </div>
            )}
            <div className="flex flex-1 items-center gap-6 p-6">
              {/* Product thumbnail */}
              {items[0]?.image && (
                <img
                  src={Array.isArray(items[0].image) ? items[0].image[0] : items[0].image}
                  alt={items[0].name}
                  className="w-20 h-20 object-cover rounded-xl border-2 border-pink-100 shadow-sm bg-gray-50"
                />
              )}
              
              {/* Order details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {items.length > 0 ? items[0].name : "Order"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Ordered: {formatDateTime(orderDate)}
                    </p>
                    {items.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1">
                        +{items.length - 1} more item{items.length - 1 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  
                                     {/* Status badge */}
                   <div className="flex flex-col items-end gap-2">
                     <StatusBadge status={status} />
                     
                     {/* Shipping tracking info if available */}
                     {order.shippingTracking && order.shippingTracking.partner && order.shippingTracking.trackingId && (
                       <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                         📦 {order.shippingTracking.partner}
                       </div>
                     )}
                     
                     <button
                       onClick={() => setSelectedOrder(order)}
                       className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm"
                     >
                       View Details
                     </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Order ID */}
              <div className="mb-4">
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono text-lg font-semibold">{selectedOrder.orderId || selectedOrder._id}</p>
              </div>
              
              {/* Status with description */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={selectedOrder.status || selectedOrder.orderStatus || selectedOrder.paymentStatus} />
                  <span className="text-xs text-gray-500">
                    {STATUS_CONFIG[selectedOrder.status as keyof typeof STATUS_CONFIG]?.description || 'Status updated'}
                  </span>
                </div>
                
                {/* Shipping Tracking Information */}
                {selectedOrder.shippingTracking && selectedOrder.shippingTracking.partner && selectedOrder.shippingTracking.trackingId && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">📦 Shipping Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Courier Partner:</strong> {selectedOrder.shippingTracking.partner}</p>
                      <p><strong>Tracking ID:</strong> {selectedOrder.shippingTracking.trackingId}</p>
                      {selectedOrder.shippingTracking.trackingUrl && (
                        <p>
                          <strong>Track Order:</strong>{' '}
                          <a 
                            href={selectedOrder.shippingTracking.trackingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Click here to track
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Products */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Products</h3>
                <div className="space-y-3">
                  {(selectedOrder.items || selectedOrder.cartItems || []).map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {item.image && (
                        <img
                          src={Array.isArray(item.image) ? item.image[0] : item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity}{item.size && ` | Size: ${item.size}`}
                        </p>
                        <p className="text-sm text-gray-600">₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Shipping Address */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const getShippingDisplayInfo = () => {
                      if (selectedOrder.shippingInfo) {
                        return {
                          name: selectedOrder.shippingInfo.fullName,
                          email: selectedOrder.shippingInfo.email,
                          phone: selectedOrder.shippingInfo.phone,
                          addressFields: [
                            { label: 'Address Line 1', value: selectedOrder.shippingInfo.addressLine1 },
                            { label: 'Address Line 2', value: selectedOrder.shippingInfo.addressLine2 },
                            { label: 'City', value: selectedOrder.shippingInfo.city },
                            { label: 'State', value: selectedOrder.shippingInfo.state },
                            { label: 'Postal Code', value: selectedOrder.shippingInfo.postalCode },
                            { label: 'Country', value: selectedOrder.shippingInfo.country }
                          ].filter(field => field.value)
                        };
                      } else if (selectedOrder.shippingAddress) {
                        return {
                          name: selectedOrder.shippingAddress.fullName,
                          email: selectedOrder.shippingAddress.email,
                          phone: selectedOrder.shippingAddress.phone,
                          addressFields: [
                            { label: 'Flat/House No.', value: selectedOrder.shippingAddress.flatHouseNo },
                            { label: 'Area/Locality', value: selectedOrder.shippingAddress.areaLocality },
                            { label: 'Street Address', value: selectedOrder.shippingAddress.streetAddress },
                            { label: 'Landmark', value: selectedOrder.shippingAddress.landmark },
                            { label: 'City', value: selectedOrder.shippingAddress.city },
                            { label: 'State', value: selectedOrder.shippingAddress.state },
                            { label: 'Pincode', value: selectedOrder.shippingAddress.pincode },
                            { label: 'Country', value: selectedOrder.shippingAddress.country }
                          ].filter(field => field.value)
                        };
                      } else if (selectedOrder.address) {
                        return {
                          name: selectedOrder.customerName,
                          email: selectedOrder.email,
                          phone: selectedOrder.phone,
                          addressFields: [
                            { label: 'Address Line 1', value: selectedOrder.address.line1 },
                            { label: 'Address Line 2', value: selectedOrder.address.line2 },
                            { label: 'City', value: selectedOrder.address.city },
                            { label: 'State', value: selectedOrder.address.state },
                            { label: 'Pincode', value: selectedOrder.address.pincode },
                            { label: 'Country', value: selectedOrder.address.country }
                          ].filter(field => field.value)
                        };
                      }
                      return { name: '', email: '', phone: '', addressFields: [] };
                    };
                    
                    const shippingDisplay = getShippingDisplayInfo();
                    
                    return (
                      <div className="space-y-2">
                        {shippingDisplay.name && <p className="font-medium">{shippingDisplay.name}</p>}
                        {shippingDisplay.email && <p className="text-sm text-gray-600">{shippingDisplay.email}</p>}
                        {shippingDisplay.phone && <p className="text-sm text-gray-600">{shippingDisplay.phone}</p>}
                        {shippingDisplay.addressFields.map((field, index) => (
                          <p key={index} className="text-sm text-gray-600">{field.value}</p>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">
                    ₹{selectedOrder.totalAmount || selectedOrder.total || selectedOrder.totalPrice || selectedOrder.amount}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">Payment Method</span>
                  <span className="text-sm font-medium">{selectedOrder.paymentMethod || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">Order Date</span>
                  <span className="text-sm font-medium">{formatDateTime(selectedOrder.createdAt || selectedOrder.date)}</span>
                </div>
              </div>
              
              {/* Support Link */}
              <div className="mt-6 pt-4 border-t">
                <a
                  href="/contact"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  Need help? Contact support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 