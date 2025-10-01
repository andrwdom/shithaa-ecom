import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaEnvelope, FaTruck, FaPhone, FaMapMarkerAlt, FaMoneyBill, FaCalendarAlt, FaBox, FaTag, FaSearch, FaFilter, FaClock, FaCheckCircle, FaTimesCircle, FaShippingFast, FaDollarSign, FaSpinner, FaCog, FaBan, FaDownload, FaExclamationTriangle as AlertTriangle } from 'react-icons/fa';

// Updated status colors and icons
const STATUS_CONFIG = {
  Pending: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: FaClock,
    iconColor: 'text-yellow-500',
    description: 'Order received, waiting to be processed'
  },
  Processing: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: FaCog,
    iconColor: 'text-blue-500',
    description: 'Order is being prepared and packed'
  },
  Shipped: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: FaShippingFast,
    iconColor: 'text-purple-500',
    description: 'Order has been shipped and is in transit'
  },
  Delivered: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: FaCheckCircle,
    iconColor: 'text-green-500',
    description: 'Order has been successfully delivered'
  },
  Cancelled: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: FaBan,
    iconColor: 'text-red-500',
    description: 'Order has been cancelled'
  }
};

// Complete order lifecycle statuses
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function formatDate(date) {
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  const IconComponent = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      <IconComponent className={`w-3 h-3 ${config.iconColor}`} />
      {status}
    </span>
  );
}

// Dashboard Summary Cards with updated status counting
const DashboardSummary = ({ orders }) => {
  const today = new Date().toDateString();
  
  const pendingOrders = orders.filter(order => {
    const status = order.orderStatus || order.status || order.paymentStatus;
    // Only count Pending orders that are not awaiting payment
    return status === 'Pending' && status !== 'awaiting_payment' && status !== 'Awaiting Payment';
  }).length;
  
  const processingOrders = orders.filter(order => {
    const status = order.orderStatus || order.status || order.paymentStatus;
    return status === 'Processing';
  }).length;
  
  const shippedOrders = orders.filter(order => {
    const status = order.orderStatus || order.status || order.paymentStatus;
    return status === 'Shipped';
  }).length;
  
  const deliveredOrders = orders.filter(order => {
    const status = order.orderStatus || order.status || order.paymentStatus;
    return status === 'Delivered';
  }).length;
  
  const revenueToday = orders
    .filter(order => {
      const orderDate = new Date(order.createdAt || order.placedAt).toDateString();
      const status = order.orderStatus || order.status || order.paymentStatus;
      const paymentStatus = order.paymentStatus?.toLowerCase() || '';
      
      // Only include orders that are:
      // 1. Created today
      // 2. Not cancelled
      // 3. Not failed payments
      // 4. Not awaiting payment
      return orderDate === today && 
             status !== 'Cancelled' && 
             !paymentStatus.includes('failed') &&
             !paymentStatus.includes('awaiting') &&
             status !== 'Payment Failed';
    })
    .reduce((sum, order) => {
      const total = order.totalAmount || order.total || order.totalPrice || order.amount || 0;
      return sum + total;
    }, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Pending</p>
            <h2 className="text-lg font-bold text-gray-900">{pendingOrders}</h2>
          </div>
          <FaClock className="w-5 h-5 text-yellow-500" />
        </div>
      </div>
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Processing</p>
            <h2 className="text-lg font-bold text-gray-900">{processingOrders}</h2>
          </div>
          <FaCog className="w-5 h-5 text-blue-500" />
        </div>
      </div>
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Shipped</p>
            <h2 className="text-lg font-bold text-gray-900">{shippedOrders}</h2>
          </div>
          <FaShippingFast className="w-5 h-5 text-purple-500" />
        </div>
      </div>
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Delivered</p>
            <h2 className="text-lg font-bold text-gray-900">{deliveredOrders}</h2>
          </div>
          <FaCheckCircle className="w-5 h-5 text-green-500" />
        </div>
      </div>
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 flex flex-col justify-between">
        <div className="flex items-center justify-between h-full">
          <div>
            <p className="text-xs font-medium text-gray-500">Revenue Today</p>
            <h2 className="text-lg font-bold text-gray-900">{currency}{revenueToday.toFixed(2)}</h2>
          </div>
          <FaDollarSign className="w-5 h-5 text-green-500 self-end" />
        </div>
      </div>
    </div>
  );
};

// Updated Status Toggle Group with all statuses
const StatusToggleGroup = ({ value, onChange }) => {
  const options = [
    { label: 'All', value: 'All' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Shipped', value: 'Shipped' },
    { label: 'Delivered', value: 'Delivered' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-[#4D1E64] whitespace-nowrap ${
            value === opt.value
              ? 'bg-[#4D1E64] text-white border-[#4D1E64] shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

const PAYMENT_METHODS = ['All', 'COD', 'Prepaid', 'Razorpay', 'Stripe', 'PhonePe'];
const SORT_ORDERS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

// Enhanced Search and Filters Bar
const EnhancedSearchAndFilters = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  paymentMethod,
  onPaymentMethodChange,
  sortOrder,
  onSortOrderChange,
}) => {
  return (
    <div className="sticky top-0 z-20 bg-transparent mb-6">
      <div className="px-3 py-3 md:px-4 md:py-4 bg-white/90 backdrop-blur border border-gray-100 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        {/* Search Input */}
        <div className="w-full md:w-[260px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by #order ID, name, or phone"
              value={search}
              onChange={onSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent"
            />
          </div>
        </div>
        {/* Status Dropdown */}
        <div className="w-full md:w-[180px]">
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent"
          >
            <option value="All">All Statuses</option>
            {ORDER_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        {/* Date Range */}
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="date"
            value={dateRange.start}
            onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })}
            className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent text-xs"
          />
          <span className="text-gray-400 text-xs mt-2 md:mt-0">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value })}
            className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent text-xs"
          />
        </div>
        {/* Payment Method */}
        <div className="w-full md:w-[140px]">
          <select
            value={paymentMethod}
            onChange={e => onPaymentMethodChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent"
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>
        {/* Sort Order */}
        <div className="w-full md:w-[120px]">
          <select
            value={sortOrder}
            onChange={e => onSortOrderChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent"
          >
            {SORT_ORDERS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Modern Responsive Order Card with updated status handling
const ModernOrderCard = ({ order, onView, onStatusChange, onDelete }) => {
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  const shipping = order.shippingInfo || order.shippingAddress || order.address;
  const name = shipping?.fullName || shipping?.name || order.customerName;
  const email = shipping?.email || order.shippingInfo?.email || order.email;
  const phone = shipping?.phone || order.shippingInfo?.phone || order.phone;
  const total = order.totalAmount || order.total || order.totalPrice || order.amount;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Get shipping address lines for display
  const getShippingAddressLines = () => {
    if (order.shippingInfo) {
      const lines = [
        order.shippingInfo.addressLine1,
        order.shippingInfo.addressLine2,
        order.shippingInfo.city,
        order.shippingInfo.state,
        order.shippingInfo.postalCode,
        order.shippingInfo.country
      ].filter(Boolean);
      return lines;
    } else if (order.shippingAddress) {
      const lines = [
        order.shippingAddress.flatHouseNo,
        order.shippingAddress.areaLocality,
        order.shippingAddress.streetAddress,
        order.shippingAddress.landmark,
        order.shippingAddress.city,
        order.shippingAddress.state,
        order.shippingAddress.pincode,
        order.shippingAddress.country
      ].filter(Boolean);
      return lines;
    } else if (order.address) {
      const lines = [
        order.address.line1,
        order.address.line2,
        order.address.city,
        order.address.state,
        order.address.pincode,
        order.address.country
      ].filter(Boolean);
      return lines;
    }
    return [];
  };
  
  const addressLines = getShippingAddressLines();
  const isTestOrder = order.isTestOrder || payment === 'test-paid';

  // Dropdown for status change with all statuses
  const [showDropdown, setShowDropdown] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const statusOptions = [
    { label: '⏳ Pending', value: 'Pending', icon: FaClock },
    { label: '⚙️ Processing', value: 'Processing', icon: FaCog },
    { label: '🚚 Shipped', value: 'Shipped', icon: FaShippingFast },
    { label: '✅ Delivered', value: 'Delivered', icon: FaCheckCircle },
    { label: '❌ Cancelled', value: 'Cancelled', icon: FaBan },
  ];

  const handleStatusChange = (status) => {
    setShowDropdown(false);
    if (status === 'Shipped') {
      setShowShippingModal(true);
    } else {
      onStatusChange(order._id, status);
    }
  };

  return (
    <div className="p-4 shadow-md rounded-xl flex flex-col gap-2 bg-white border border-gray-100">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-bold text-sm">#{order.orderId || 'N/A'} - {name}</p>
          <p className="text-xs text-gray-500">📧 {email}</p>
          <p className="text-xs text-gray-500">📞 {phone}</p>
          <p className="text-xs text-gray-500">📍 {addressLines.map((line, i) => <span key={i}>{line}{i < addressLines.length - 1 ? ', ' : ''}</span>)}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="text-xs text-gray-600 mt-2">
        <p>💳 {payment || 'N/A'} | ₹{typeof total === 'number' && !isNaN(total) ? total.toFixed(2) : '0.00'}</p>
        <p>📅 {formatDate(placedAt)}</p>
      </div>
      <div className="flex flex-wrap justify-between gap-2 mt-3">
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded border border-gray-300 text-xs font-semibold hover:bg-gray-50 transition"
            onClick={() => onView(order)}
          >
            View Details
          </button>
          <button
            className="px-3 py-1.5 rounded border border-red-300 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition"
            onClick={() => setShowDeleteConfirm(true)}
          >
            🗑️ Delete
          </button>
        </div>
        <div className="relative">
          <button
            className="px-3 py-1.5 rounded bg-[#4D1E64] text-white text-xs font-semibold hover:bg-[#3a164d] transition"
            onClick={() => setShowDropdown(v => !v)}
            type="button"
          >
            Change Status
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
              {statusOptions.map(opt => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.value}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => handleStatusChange(opt.value)}
                  >
                    <IconComponent className="w-3 h-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Order?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning: You are about to permanently delete:</p>
              <ul className="text-xs text-red-700 space-y-1 ml-4">
                <li>• Order #{order.orderId}</li>
                <li>• Customer: {name} ({email})</li>
                <li>• Amount: ₹{typeof total === 'number' ? total.toFixed(2) : '0.00'}</li>
                <li>• This will restore stock to inventory</li>
                <li>• This will remove order from customer's account</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(order._id, order.orderId);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                Yes, Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Tracking Modal */}
      {showShippingModal && (
        <ShippingTrackingModal
          order={order}
          onClose={() => setShowShippingModal(false)}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
};

// Shipping Tracking Modal Component
function ShippingTrackingModal({ order, onClose, onStatusChange }) {
  const [shippingPartner, setShippingPartner] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(false);

  const courierOptions = [
    { value: 'DTDC', label: 'DTDC' },
    { value: 'ST Courier', label: 'ST Courier' },
    { value: 'XpressBees', label: 'XpressBees' },
    { value: 'India Post', label: 'India Post' },
    { value: 'Delhivery', label: 'Delhivery' },
    { value: 'Blue Dart', label: 'Blue Dart' },
    { value: 'Ecom Express', label: 'Ecom Express' },
    { value: 'Other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!shippingPartner || !trackingId.trim()) {
      toast.error('Please select a courier partner and enter tracking ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://shithaa.in'}/api/orders/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          orderId: order._id,
          status: 'Shipped',
          shippingPartner,
          trackingId: trackingId.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Order marked as shipped with tracking details!');
        onStatusChange(order._id, 'Shipped');
        onClose();
      } else {
        toast.error(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  // Esc key to close
  React.useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Shipping Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Order #{order.orderId} - {order.shippingInfo?.fullName || order.customerName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Courier Partner *
              </label>
              <select
                value={shippingPartner}
                onChange={(e) => setShippingPartner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent"
                required
              >
                <option value="">Select courier partner</option>
                {courierOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking ID *
              </label>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D1E64] focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#4D1E64] text-white rounded-lg hover:bg-[#3a164d] transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onStatusChange }) {
  if (!order) return null;
  
  const [activeTab, setActiveTab] = useState('details');
  const [showPaymentLog, setShowPaymentLog] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  const displayName = userInfo.name && userInfo.name.trim() ? userInfo.name : (order.customerName && order.customerName.trim() ? order.customerName : 'Unknown User');
  const displayEmail = userInfo.email || order.email || '';
  const shipping = order.shippingInfo || order.shippingAddress || order.address;
  const items = order.items || order.cartItems || [];
  const total = order.totalAmount || order.total || order.totalPrice;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  const coupon = order.couponUsed?.code || order.discount?.appliedCouponCode;
  const discount = order.couponUsed?.discount || order.discount?.value || 0;
  const isTestOrder = order.isTestOrder || payment === 'test-paid';

  // Local status state for immediate UI feedback
  const [currentStatus, setCurrentStatus] = useState(status);
  const handleStatusChangeLocal = (orderId, nextStatus) => {
    setCurrentStatus(nextStatus);
    onStatusChange(orderId, nextStatus);
  };
  
  // Get shipping information for display
  const getShippingDisplayInfo = () => {
    if (order.shippingInfo) {
      return {
        name: order.shippingInfo.fullName,
        email: order.shippingInfo.email,
        phone: order.shippingInfo.phone,
        addressFields: [
          { label: 'Address Line 1', value: order.shippingInfo.addressLine1 },
          { label: 'Address Line 2', value: order.shippingInfo.addressLine2 },
          { label: 'City', value: order.shippingInfo.city },
          { label: 'State', value: order.shippingInfo.state },
          { label: 'Postal Code', value: order.shippingInfo.postalCode },
          { label: 'Country', value: order.shippingInfo.country }
        ].filter(field => field.value)
      };
    } else if (order.shippingAddress) {
      return {
        name: order.shippingAddress.fullName,
        email: order.shippingAddress.email,
        phone: order.shippingAddress.phone,
        addressFields: [
          { label: 'Flat/House No.', value: order.shippingAddress.flatHouseNo },
          { label: 'Area/Locality', value: order.shippingAddress.areaLocality },
          { label: 'Street Address', value: order.shippingAddress.streetAddress },
          { label: 'Landmark', value: order.shippingAddress.landmark },
          { label: 'City', value: order.shippingAddress.city },
          { label: 'State', value: order.shippingAddress.state },
          { label: 'Pincode', value: order.shippingAddress.pincode },
          { label: 'Country', value: order.shippingAddress.country }
        ].filter(field => field.value)
      };
    } else if (order.address) {
      return {
        name: order.customerName,
        email: order.email,
        phone: order.phone,
        addressFields: [
          { label: 'Address Line 1', value: order.address.line1 },
          { label: 'Address Line 2', value: order.address.line2 },
          { label: 'City', value: order.address.city },
          { label: 'State', value: order.address.state },
          { label: 'Pincode', value: order.address.pincode },
          { label: 'Country', value: order.address.country }
        ].filter(field => field.value)
      };
    }
    return { name: '', email: '', phone: '', addressFields: [] };
  };
  
  const shippingDisplay = getShippingDisplayInfo();
  const totalAmount = order.totalAmount || order.totalPrice || order.total || order.amount || order.orderSummary?.total || 0;

  // Esc key to close
  React.useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const tabs = [
    { id: 'details', label: 'Order Details', icon: FaBox },
    { id: 'status', label: 'Update Status', icon: FaCog },
    { id: 'payment', label: 'Payment Info', icon: FaMoneyBill }
  ];

  async function handleDownloadInvoice() {
    try {
      const res = await fetch(`${backendUrl}/api/orders/${order._id}/invoice`, {
        headers: {
          ...(localStorage.getItem('token') ? { token: localStorage.getItem('token') } : {})
        }
      });
      if (!res.ok) {
        toast.error('Failed to download invoice');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${order.orderId || order._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Invoice download error:', err);
      toast.error('Invoice download failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Close layer for mobile: tap outside header/content to close */}
        <button className="sr-only" onClick={onClose}>Close</button>
        
        {/* Enhanced Modal Header */}
        <div className="bg-gradient-to-r from-[#4D1E64] to-[#6B2C7A] text-white p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Order #{order.orderId || 'N/A'}</h2>
                <p className="text-white/80 text-xs md:text-sm">{displayName} • {formatDate(placedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <StatusBadge status={currentStatus} />
              {isTestOrder && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Test Order
                </span>
              )}
              <button
                onClick={handleDownloadInvoice}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                title="Download Invoice (PDF)"
              >
                <FaDownload className="w-4 h-4" />
                Invoice
              </button>
              <button
                onClick={handleDownloadInvoice}
                className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                title="Download Invoice"
                aria-label="Download Invoice"
              >
                <FaDownload className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-3 md:space-x-8 px-4 md:px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#4D1E64] text-[#4D1E64]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Modal Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(92vh-180px)] md:max-h-[calc(92vh-200px)] overscroll-contain touch-pan-y">
          
          {/* Order Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FaUser className="w-4 h-4" />
                  Customer Information
                </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{displayName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{displayEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{shippingDisplay.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Order Date</label>
                    <p className="text-gray-900">{formatDate(placedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FaTruck className="w-4 h-4" />
                  Shipping Address
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                  <p className="font-medium text-gray-900 mb-2">{shippingDisplay.name}</p>
                  {shippingDisplay.addressFields.map((field, index) => (
                    <p key={index} className="text-gray-700 text-sm">
                      <span className="font-medium">{field.label}:</span> {field.value}
                    </p>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FaBox className="w-4 h-4" />
                  Order Items ({items.length} item{items.length !== 1 ? 's' : ''})
                </h3>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 flex items-center gap-3 md:gap-4">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm md:text-base">{item.name}</h4>
                        <div className="text-xs md:text-sm text-gray-600 space-y-1">
                          <p>Quantity: <span className="font-medium">{item.quantity}</span></p>
                          {item.size && <p>Size: <span className="font-medium">{item.size}</span></p>}
                          <p>Price: <span className="font-medium">{currency}{item.price}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base md:text-lg font-semibold text-gray-900">
                          {currency}{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Order Total */}
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base md:text-lg font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-lg md:text-xl font-bold text-[#4D1E64]">
                      {currency}{typeof totalAmount === 'number' ? totalAmount.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="text-xs md:text-sm text-green-600 mt-1">
                      Discount Applied: -{currency}{discount.toFixed(2)}
                      {coupon && <span className="ml-2">({coupon})</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Update Tab */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FaCog className="w-4 h-4" />
                  Current Status
                </h3>
                <div className="flex items-center gap-2 md:gap-3">
                  <StatusBadge status={status} />
                  <span className="text-gray-600 text-sm md:text-base">
                    {STATUS_CONFIG[status]?.description || 'Status updated'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <h3 className="text-lg font-semibold mb-3">Update Order Status</h3>
                <div className="grid grid-cols-1 gap-3">
                  {ORDER_STATUSES.map(statusOption => {
                    const config = STATUS_CONFIG[statusOption];
                    const IconComponent = config.icon;
                    const isCurrentStatus = currentStatus === statusOption;
                    
                    return (
                      <button
                        key={statusOption}
                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg border transition-all ${
                          isCurrentStatus 
                            ? 'bg-[#4D1E64] text-white border-[#4D1E64] shadow-md' 
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (statusOption === 'Shipped') {
                            setShowShippingModal(true);
                            return;
                          }
                          handleStatusChangeLocal(order._id, statusOption);
                        }}
                        disabled={isCurrentStatus}
                      >
                        <IconComponent className={`w-5 h-5 ${isCurrentStatus ? 'text-white' : config.iconColor}`} />
                        <div className="text-left flex-1">
                          <div className="font-semibold">{statusOption}</div>
                          <div className={`text-sm ${isCurrentStatus ? 'text-white/80' : 'text-gray-500'}`}>
                            {config.description}
                          </div>
                        </div>
                        {isCurrentStatus && (
                          <FaCheckCircle className="w-5 h-5 text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Payment Info Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FaMoneyBill className="w-4 h-4" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <p className="text-gray-900">{payment || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-gray-900 font-semibold">
                      {currency}{typeof totalAmount === 'number' ? totalAmount.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  {order.phonepeTransactionId && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                      <p className="text-gray-900 font-mono text-sm">{order.phonepeTransactionId}</p>
                    </div>
                  )}
                  {order.amountPaid && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Amount Paid</label>
                      <p className="text-gray-900">{currency}{order.amountPaid}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Log */}
              {order.paymentLog && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Payment Log</h3>
                    <button
                      onClick={() => setShowPaymentLog(!showPaymentLog)}
                      className="text-[#4D1E64] hover:text-[#3a164d] text-sm font-medium"
                    >
                      {showPaymentLog ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  {showPaymentLog && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                        {JSON.stringify(order.paymentLog, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <div className="text-sm text-gray-500">
              Order placed on {formatDate(placedAt)}
            </div>
          </div>
        </div>
      </div>
      {showShippingModal && (
        <ShippingTrackingModal
          order={order}
          onClose={() => setShowShippingModal(false)}
          onStatusChange={(id, next) => {
            handleStatusChangeLocal(id, next);
            setShowShippingModal(false);
          }}
        />
      )}
    </div>
  );
}

const Orders = ({ token, setToken }) => {
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [lastApiResponse, setLastApiResponse] = useState(null)
  const [cancellingOrder, setCancellingOrder] = useState(null)
  const [userNameCache, setUserNameCache] = useState({})
  const [printOrder, setPrintOrder] = useState(null)
  const printRef = useRef()
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');

  // Helper to fetch display name from backend
  const fetchUserName = async (email) => {
    if (!email) return '';
    if (userNameCache[email]) return userNameCache[email];
    try {
      const res = await axios.get(`${backendUrl}/api/user/public-profile?email=${encodeURIComponent(email)}`);
      if (res.data && res.data.success && res.data.profile && res.data.profile.name) {
        setUserNameCache(prev => ({ ...prev, [email]: res.data.profile.name }));
        return res.data.profile.name;
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setUserNameCache(prev => ({ ...prev, [email]: 'Unknown User' }));
        return 'Unknown User';
      }
    }
    return '';
  };

  const fetchOrders = () => {
    setLoading(true);
    setApiError('');
    axios.get(`${backendUrl}/api/orders`)
      .then(response => {
        setLastApiResponse(response.data);
        if (response.data.success) {
          setOrders(response.data.orders);
          console.log('Fetched orders:', response.data.orders);
        } else {
          setApiError(response.data.message);
          toast.error(response.data.message);
        }
      })
      .catch(error => {
        setApiError(error.response?.data?.message || 'Failed to fetch orders');
        setLastApiResponse(error);
        console.error('Error fetching orders:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch orders');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    console.log('Orders.jsx loaded');
  }, []);

  useEffect(() => {
    console.log('Orders component mounted');
    fetchOrders();
  }, [token]);

  const handleAuthError = () => {
    setToken('');
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancellingOrder(orderId);
    try {
      const response = await axios.post(
        `${backendUrl}/api/orders/status`,
        {
          orderId,
          status: 'Cancelled'
        },
        {
          headers: {
            token: token
          }
        }
      );
      
      if (response.data.success) {
        fetchOrders();
        toast.success('Order cancelled successfully');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      console.log("Updating order status:", orderId, "to", status);
      const response = await axios.post(
        `${backendUrl}/api/orders/status`,
        { orderId, status },
        {
          headers: {
            token: token
          }
        }
      );
      console.log('Status update response:', response.data);
      if (response.data.success) {
        fetchOrders();
        toast.success(`Order status updated to ${status}`);
        return;
      } else {
        // Only show error toast if it's not a successful status update
        // This prevents showing error messages when the backend actually succeeded
        if (response.data.message && !response.data.message.includes('successfully')) {
          toast.error('Backend error: ' + response.data.message);
        } else {
          // If backend succeeded but returned a message, just refresh orders
          fetchOrders();
        }
        return;
      }
    } catch (err) {
      console.error('Status update error:', err);
      // Only show error toast for actual network/API errors
      if (err.response?.status >= 400) {
        toast.error('Failed to update status: ' + (err.response?.data?.message || err.message));
      } else {
        // For successful operations that might have warnings, just refresh
        fetchOrders();
      }
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    try {
      console.log("Deleting order:", orderId, orderNumber);
      
      const response = await axios.delete(
        `${backendUrl}/api/orders/${orderId}`,
        {
          headers: {
            token: token
          }
        }
      );
      
      console.log('Delete response:', response.data);
      
      if (response.data.success) {
        toast.success(`Order #${orderNumber} deleted successfully! ${response.data.stockRestored ? 'Stock restored to inventory.' : ''}`);
        fetchOrders(); // Refresh the orders list
      } else {
        toast.error('Failed to delete order: ' + response.data.message);
      }
    } catch (err) {
      console.error('Delete order error:', err);
      toast.error('Failed to delete order: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrint = (order) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      setPrintOrder(null);
    }, 100);
  };

  const canCancelOrder = (status) => {
    return ['Pending', 'Processing'].includes(status);
  };

  // Enhanced search filter
  // First filter out awaiting_payment orders
  let filteredOrders = orders.filter(order => {
    const status = order.paymentStatus || order.status || order.orderStatus;
    return status !== 'awaiting_payment' && status !== 'Awaiting Payment';
  });

  // Then apply search filters
  filteredOrders = filteredOrders.filter(order => {
    // Search logic
    let matchesSearch = true;
    if (search) {
      const s = search.trim();
      if (s.startsWith('#')) {
        const idQuery = s.slice(1).toLowerCase();
        matchesSearch =
          (order.orderId && order.orderId.toLowerCase().includes(idQuery)) ||
          (order._id && order._id.toLowerCase().includes(idQuery));
      } else {
        const name = (order.userInfo?.name || order.customerName || '').toLowerCase();
        const phone = (order.userInfo?.phone || order.phone || '').toLowerCase();
        matchesSearch =
          name.includes(s.toLowerCase()) ||
          phone.includes(s.toLowerCase());
      }
    }
    const status = order.status || order.orderStatus || order.paymentStatus;
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    // Date range filter
    const orderDate = new Date(order.createdAt || order.placedAt);
    const inDateRange = (!dateRange.start || orderDate >= new Date(dateRange.start)) &&
      (!dateRange.end || orderDate <= new Date(dateRange.end + 'T23:59:59'));
    // Payment method filter
    const matchesPayment = paymentMethod === 'All' || (order.paymentMethod || '').toLowerCase().includes(paymentMethod.toLowerCase());
    return matchesSearch && matchesStatus && inDateRange && matchesPayment;
  });

  filteredOrders = filteredOrders.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.placedAt);
    const dateB = new Date(b.createdAt || b.placedAt);
    return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders Management</h1>
          <p className="text-gray-600">Manage and track all customer orders with full lifecycle status support</p>
        </div>
        <div className="hidden md:flex gap-2">
          <a href={`${backendUrl}/api/orders`} target="_blank" rel="noreferrer" className="px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Refresh</a>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <DashboardSummary orders={orders} />

      {/* Search and Filters */}
      <EnhancedSearchAndFilters
        search={search}
        onSearchChange={e => setSearch(e.target.value)}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {/* Status Filter Toggles */}
      <div className="overflow-x-auto w-full">
        <div className="flex gap-2 min-w-max pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          <StatusToggleGroup value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4D1E64] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading orders...</p>
        </div>
      )}

      {/* Error State */}
      {apiError && (
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Orders</h3>
          <p className="text-gray-500">{apiError}</p>
        </div>
      )}

      {/* Empty States */}
      {!loading && !apiError && orders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
          <p className="text-gray-500">Orders will appear here once customers start placing them.</p>
        </div>
      )}

      {!loading && !apiError && filteredOrders.length === 0 && orders.length > 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Match Your Filters</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Orders List */}
      {!loading && !apiError && filteredOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 content-start items-stretch">
          {filteredOrders.map(order => (
            <ModernOrderCard
              key={order._id}
              order={order}
              onView={setSelectedOrder}
              onStatusChange={updateStatus}
              onDelete={handleDeleteOrder}
            />
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateStatus}
        />
      )}

      {/* Print Invoice */}
      {printOrder && (
        <div className='fixed inset-0 bg-white z-[9999] flex items-center justify-center print:block'>
          <Invoice ref={printRef} order={printOrder} />
        </div>
      )}
    </div>
  )
}

export default Orders