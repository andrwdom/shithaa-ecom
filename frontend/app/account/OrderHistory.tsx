"use client";
import { useState } from "react";
import { Clock, Cog, Truck, CheckCircle, Ban, ExternalLink, Package, Phone, Mail } from "lucide-react";

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



// Progress Tracker Component
function OrderProgressTracker({ status }: { status: string }) {
  const steps = [
    { id: 'ordered', label: 'Ordered', icon: Package },
    { id: 'processing', label: 'Processing', icon: Cog },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];
  
  const getStepStatus = (stepId: string) => {
    const currentStatus = status.toLowerCase();
    switch (stepId) {
      case 'ordered':
        return 'completed';
      case 'processing':
        return ['processing', 'shipped', 'delivered'].includes(currentStatus) ? 'completed' : 'pending';
      case 'shipped':
        return ['shipped', 'delivered'].includes(currentStatus) ? 'completed' : 
               currentStatus === 'processing' ? 'pending' : 'inactive';
      case 'delivered':
        return currentStatus === 'delivered' ? 'completed' : 
               ['processing', 'shipped'].includes(currentStatus) ? 'pending' : 'inactive';
      default:
        return 'inactive';
    }
  };
  
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id);
          const IconComponent = step.icon;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  stepStatus === 'completed' 
                    ? 'bg-green-100 border-green-500 text-green-600' 
                    : stepStatus === 'pending'
                    ? 'bg-blue-100 border-blue-500 text-blue-600'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 font-medium text-center ${
                  stepStatus === 'completed' ? 'text-green-600' : 
                  stepStatus === 'pending' ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                  getStepStatus(steps[index + 1].id) === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
            <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-6">
              {/* Product thumbnail - larger size */}
              {items[0]?.image && (
                <img
                  src={Array.isArray(items[0].image) ? items[0].image[0] : items[0].image}
                  alt={items[0].name}
                  className="w-24 h-24 object-cover rounded-xl border-2 border-pink-100 shadow-sm bg-gray-50"
                />
              )}
              
              {/* Order details */}
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {items.length > 0 ? items[0].name : "Order"}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Ordered: {formatDateTime(orderDate)}
                    </p>
                    
                    {/* Total Amount and Quantity */}
                    <div className="flex items-center gap-4 mb-2">
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{order.totalAmount || order.total || order.totalPrice || order.amount || 0}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qty: {(items as any[]).reduce((total: number, item: any) => total + (item.quantity || 1), 0)}
                      </p>
                    </div>
                    
                    {items.length > 1 && (
                      <p className="text-xs text-gray-400">
                        +{items.length - 1} more item{items.length - 1 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  
                  {/* Status badge and actions */}
                  <div className="flex flex-col sm:items-end gap-3">
                    <StatusBadge status={status} />
                    
                    {/* Shipping tracking info if available */}
                    {order.shippingTracking && order.shippingTracking.partner && order.shippingTracking.trackingId && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 w-fit">
                        <Truck className="w-3 h-3" />
                        <span>{order.shippingTracking.partner}</span>
                        {order.shippingTracking.trackingUrl && (
                          <ExternalLink className="w-3 h-3 ml-1 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(order.shippingTracking.trackingUrl, '_blank');
                            }}
                          />
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm"
                      aria-label={`View details for order ${order.orderId || order._id}`}
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" 
          onClick={() => setSelectedOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="order-modal-title" className="text-2xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                  aria-label="Close order details"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Order ID and Status Message */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Order ID</p>
                    <p className="font-mono text-xl font-bold text-gray-900">{selectedOrder.orderId || selectedOrder._id}</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const status = (selectedOrder.status || selectedOrder.orderStatus || selectedOrder.paymentStatus).toLowerCase();
                      
                      if (status === 'delivered') {
                        return (
                          <>
                            <p className="text-sm text-gray-500 font-medium">Status</p>
                            <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Successfully Delivered
                            </p>
                          </>
                        );
                      } else if (status === 'shipped') {
                        return (
                          <>
                            <p className="text-sm text-gray-500 font-medium">Tracking</p>
                            <p className="text-lg font-semibold text-purple-600 flex items-center gap-1">
                              <Truck className="w-4 h-4" />
                              Track Your Package
                            </p>
                          </>
                        );
                      } else if (status === 'processing') {
                        return (
                          <>
                            <p className="text-sm text-gray-500 font-medium">Status</p>
                            <p className="text-lg font-semibold text-blue-600 flex items-center gap-1">
                              <Cog className="w-4 h-4" />
                              Being Prepared
                            </p>
                          </>
                        );
                      } else if (status === 'cancelled') {
                        return (
                          <>
                            <p className="text-sm text-gray-500 font-medium">Status</p>
                            <p className="text-lg font-semibold text-red-600 flex items-center gap-1">
                              <Ban className="w-4 h-4" />
                              Order Cancelled
                            </p>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <p className="text-sm text-gray-500 font-medium">Status</p>
                            <p className="text-lg font-semibold text-yellow-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Order Confirmed
                            </p>
                          </>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Order Progress Tracker */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Progress</h3>
                <OrderProgressTracker status={selectedOrder.status || selectedOrder.orderStatus || selectedOrder.paymentStatus} />
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="space-y-4">
                    {(selectedOrder.items || selectedOrder.cartItems || []).map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                        {item.image && (
                          <img
                            src={Array.isArray(item.image) ? item.image[0] : item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-lg">{item.name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Qty:</span> {item.quantity}
                            </p>
                            {item.size && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Size:</span> {item.size}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Price:</span> ₹{item.price}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Shipping Address */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  {(() => {
                    const getShippingDisplayInfo = () => {
                      if (selectedOrder.shippingInfo) {
                        return {
                          name: selectedOrder.shippingInfo.fullName,
                          email: selectedOrder.shippingInfo.email,
                          phone: selectedOrder.shippingInfo.phone,
                          address: [
                            selectedOrder.shippingInfo.addressLine1,
                            selectedOrder.shippingInfo.addressLine2,
                            selectedOrder.shippingInfo.city,
                            selectedOrder.shippingInfo.state,
                            selectedOrder.shippingInfo.postalCode,
                            selectedOrder.shippingInfo.country
                          ].filter(Boolean).join(', ')
                        };
                      } else if (selectedOrder.shippingAddress) {
                        return {
                          name: selectedOrder.shippingAddress.fullName,
                          email: selectedOrder.shippingAddress.email,
                          phone: selectedOrder.shippingAddress.phone,
                          address: [
                            selectedOrder.shippingAddress.flatHouseNo,
                            selectedOrder.shippingAddress.areaLocality,
                            selectedOrder.shippingAddress.streetAddress,
                            selectedOrder.shippingAddress.landmark,
                            selectedOrder.shippingAddress.city,
                            selectedOrder.shippingAddress.state,
                            selectedOrder.shippingAddress.pincode,
                            selectedOrder.shippingAddress.country
                          ].filter(Boolean).join(', ')
                        };
                      } else if (selectedOrder.address) {
                        return {
                          name: selectedOrder.customerName,
                          email: selectedOrder.email,
                          phone: selectedOrder.phone,
                          address: [
                            selectedOrder.address.line1,
                            selectedOrder.address.line2,
                            selectedOrder.address.city,
                            selectedOrder.address.state,
                            selectedOrder.address.pincode,
                            selectedOrder.address.country
                          ].filter(Boolean).join(', ')
                        };
                      }
                      return { name: '', email: '', phone: '', address: '' };
                    };
                    
                    const shippingDisplay = getShippingDisplayInfo();
                    
                    return (
                      <div className="space-y-2">
                        {shippingDisplay.name && <p className="font-semibold text-gray-900">{shippingDisplay.name}</p>}
                        {shippingDisplay.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {shippingDisplay.phone}
                          </p>
                        )}
                        {shippingDisplay.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {shippingDisplay.email}
                          </p>
                        )}
                        {shippingDisplay.address && <p className="text-sm text-gray-600">{shippingDisplay.address}</p>}
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-gray-900">Total Amount</span>
                  <span className="text-3xl font-bold text-green-600">
                    ₹{selectedOrder.totalAmount || selectedOrder.total || selectedOrder.totalPrice || selectedOrder.amount}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium text-gray-900">{selectedOrder.paymentMethod || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium text-gray-900">{formatDate(selectedOrder.createdAt || selectedOrder.date)}</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                {/* Track Package Button */}
                {selectedOrder.shippingTracking && selectedOrder.shippingTracking.trackingUrl && (
                  <button
                    onClick={() => window.open(selectedOrder.shippingTracking.trackingUrl, '_blank')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                  >
                    <Truck className="w-4 h-4" />
                    Track Package
                  </button>
                )}
                
                {/* Support Link */}
                <a
                  href="/contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-purple-600 text-purple-600 font-semibold rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200"
                >
                  <Package className="w-4 h-4" />
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