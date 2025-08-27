"use client";
import { useState, MouseEvent } from "react";
import { Clock, Cog, Truck, CheckCircle, Ban, ExternalLink, Package, Phone, Mail } from "lucide-react";

// Complete status configuration with icons and descriptions
const STATUS_CONFIG = {
  Pending: {
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
    iconColor: "text-amber-500",
    description: "Order received, waiting to be processed",
    accent: "from-amber-300 to-amber-400",
    borderLeft: "border-l-4 border-amber-400",
    border: "border-amber-400 ring-amber-100"
  },
  Processing: {
    color: "bg-[#473C66]/10 text-[#473C66] border-[#473C66]/20",
    icon: Cog,
    iconColor: "text-[#473C66]",
    description: "Order is being prepared and packed",
    accent: "from-[#473C66] to-[#5a4a7a]",
    borderLeft: "border-l-4 border-[#473C66]",
    border: "border-[#473C66] ring-[#473C66]/10"
  },
  Shipped: {
    color: "bg-[#473C66]/10 text-[#473C66] border-[#473C66]/20",
    icon: Truck,
    iconColor: "text-[#473C66]",
    description: "Order has been shipped and is in transit",
    accent: "from-[#473C66] to-[#5a4a7a]",
    borderLeft: "border-l-4 border-[#473C66]",
    border: "border-[#473C66] ring-[#473C66]/10"
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

  // Define the order of statuses
  const statusSequence = ['ordered', 'processing', 'shipped', 'delivered'];

  /*
   * Normalize backend status variations to one of:
   *   ordered → processing → shipped → delivered
   * We get many possible strings from the backend e.g.:
   *   "Pending", "Order Placed", "Confirmed", "Processing", "Packed",
   *   "Shipped", "Out for Delivery", "Delivered", etc.
   */
  const normalizedStatus = (status || '').trim().toLowerCase();

  const mapStatusToId = () => {
    if (!normalizedStatus) return 'ordered';

    if (
      normalizedStatus.includes('processing') ||
      normalizedStatus.includes('packed') ||
      normalizedStatus.includes('preparing')
    ) {
      return 'processing';
    }

    if (
      normalizedStatus.includes('shipped') ||
      normalizedStatus.includes('in transit') ||
      normalizedStatus.includes('out for delivery')
    ) {
      return 'shipped';
    }

    if (normalizedStatus.includes('delivered')) {
      return 'delivered';
    }

    // Default / initial states (pending, confirmed, placed, etc.)
    return 'ordered';
  };

  const currentStatusId = mapStatusToId();
  
  const currentStepIndex = statusSequence.findIndex(step => step === currentStatusId);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'inactive';
  };
  
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          const IconComponent = step.icon;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  stepStatus === 'completed' 
                    ? 'bg-[#473C66] border-[#473C66] text-white shadow-lg' 
                    : stepStatus === 'current'
                    ? 'bg-[#473C66]/10 border-[#473C66] text-[#473C66] ring-4 ring-[#473C66]/20'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 font-medium text-center ${
                  stepStatus === 'completed' ? 'text-[#473C66] font-semibold' : 
                  stepStatus === 'current' ? 'text-[#473C66] font-bold' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                  getStepStatus(index) === 'completed' ? 'bg-[#473C66]' : 'bg-gray-300'
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
        const status = order.orderStatus || order.status || order.paymentStatus;
        const orderDate = order.createdAt || order.date || order.orderDate || order.updatedAt;
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Pending;
        
        // Minimal preview: product names, date, status, view details button
        return (
          <div
            key={order._id}
            className={`relative flex flex-col bg-white rounded-3xl shadow-lg border border-gray-100 ${config.borderLeft} transition-all duration-200 hover:shadow-xl hover:-translate-y-1 group overflow-hidden`}
          >
            {/* Cancelled sticker */}
            {status.toLowerCase() === "cancelled" && (
              <div className="absolute -top-3 -left-6 z-10 rotate-[-18deg]">
                <span className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded shadow-lg drop-shadow-lg border-2 border-white">Cancelled</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4">
              {/* Product thumbnail */}
              {items[0]?.image && (
                <img
                  src={Array.isArray(items[0].image) ? items[0].image[0] : items[0].image}
                  alt={items[0].name}
                  className="w-full sm:w-24 h-auto sm:h-24 object-cover rounded-2xl border-2 border-gray-100 shadow-sm bg-gray-50"
                />
              )}
              
              {/* Order details */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
                      {items.length > 0 ? items[0].name : "Order"}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Ordered: {formatDateTime(orderDate)}
                    </p>
                    
                    {/* Total Amount and Quantity */}
                    <div className="flex items-center gap-4 mb-2">
                      <p className="text-lg font-semibold text-[#473C66]">
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
                  <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
                    <StatusBadge status={status} />
                    
                    {/* Shipping tracking info */}
                    {order.shippingTracking && order.shippingTracking.partner && order.shippingTracking.trackingId && (
                      <div className="flex items-center gap-1 text-xs text-[#473C66] bg-[#473C66]/10 px-3 py-1 rounded-full border border-[#473C66]/20 w-fit">
                        <Truck className="w-3 h-3" />
                        <span>{order.shippingTracking.partner}</span>
                        {order.shippingTracking.trackingUrl && (
                          <ExternalLink className="w-3 h-3 ml-1 cursor-pointer" 
                            onClick={(e: MouseEvent) => {
                              e.stopPropagation();
                              window.open(order.shippingTracking.trackingUrl, '_blank');
                            }}
                          />
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="w-full sm:w-auto px-6 py-2 bg-[#473C66] text-white text-sm font-medium rounded-xl hover:bg-[#3a3054] transition-colors duration-200 shadow-sm hover:shadow-md"
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
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e: MouseEvent) => e.stopPropagation()}>
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
              <div className="bg-gradient-to-r from-[#473C66]/5 to-[#473C66]/10 rounded-2xl p-6 mb-6 border border-[#473C66]/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Order ID</p>
                    <p className="font-mono text-xl font-bold text-[#473C66]">{selectedOrder.orderId || selectedOrder._id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedOrder.orderStatus || selectedOrder.status || selectedOrder.paymentStatus} />
                    </div>
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
                
                {/* Shipping Tracking Information - Display only when shipped or delivered */}
                {(['shipped', 'delivered'].includes((selectedOrder.status || selectedOrder.orderStatus || '').toLowerCase())) && selectedOrder.shippingTracking && selectedOrder.shippingTracking.partner && selectedOrder.shippingTracking.trackingId && (
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
                      if (selectedOrder?.shippingInfo) {
                        return {
                          name: selectedOrder.shippingInfo.fullName || selectedOrder.shippingInfo.name || '',
                          email: selectedOrder.shippingInfo.email || '',
                          phone: selectedOrder.shippingInfo.phone || '',
                          address: [
                            selectedOrder.shippingInfo.addressLine1,
                            selectedOrder.shippingInfo.addressLine2,
                            selectedOrder.shippingInfo.city,
                            selectedOrder.shippingInfo.state,
                            selectedOrder.shippingInfo.postalCode,
                            selectedOrder.shippingInfo.country
                          ].filter(Boolean).join(', ')
                        };
                      } else if (selectedOrder?.shippingAddress) {
                        return {
                          name: selectedOrder.shippingAddress.fullName || selectedOrder.shippingAddress.name || '',
                          email: selectedOrder.shippingAddress.email || '',
                          phone: selectedOrder.shippingAddress.phone || '',
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
                      } else if (selectedOrder?.address) {
                        return {
                          name: selectedOrder.customerName || '',
                          email: selectedOrder.email || '',
                          phone: selectedOrder.phone || '',
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