import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaEnvelope, FaTruck, FaPhone, FaMapMarkerAlt, FaMoneyBill, FaCalendarAlt, FaBox, FaTag, FaSearch, FaFilter, FaClock, FaCheckCircle, FaTimesCircle, FaShippingFast, FaDollarSign, FaSpinner, FaCog, FaBan } from 'react-icons/fa';

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
    return status === 'Pending';
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
      return orderDate === today && status !== 'Cancelled';
    })
    .reduce((sum, order) => {
      const total = order.totalAmount || order.total || order.totalPrice || 0;
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
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 px-2 py-4">
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
const ModernOrderCard = ({ order, onView, onStatusChange }) => {
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  const shipping = order.shippingInfo || order.shippingAddress || order.address;
  const name = shipping?.fullName || shipping?.name || order.customerName;
  const email = shipping?.email || order.shippingInfo?.email || order.email;
  const phone = shipping?.phone || order.shippingInfo?.phone || order.phone;
  const total = order.totalAmount || order.total || order.totalPrice;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  
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
        <button
          className="px-3 py-1.5 rounded border border-gray-300 text-xs font-semibold hover:bg-gray-50 transition"
          onClick={() => onView(order)}
        >
          View Details
        </button>
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
    { value: 'India Post', label: 'India Post' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!shippingPartner || !trackingId.trim()) {
      toast.error('Please select a courier partner and enter tracking ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}/api/orders/status`, {
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
  const totalAmount = order.totalAmount || order.totalPrice || order.total || order.orderSummary?.total || 0;

  // Esc key to close
  React.useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-2 py-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-auto p-4 sm:p-6 relative animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold font-heading">Order Details</h2>
          <button
            className="rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4D1E64]"
            onClick={onClose}
            aria-label="Close order details"
            type="button"
          >
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Current Status Display */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={status} />
            <span className="text-xs text-gray-500">
              {STATUS_CONFIG[status]?.description || 'Status updated'}
            </span>
          </div>
        </div>
        
        {/* User Info Box */}
        <div className="bg-gray-100 p-3 rounded-md flex flex-col gap-1 text-sm mb-4">
          <p className="flex items-center gap-2">
            <FaUser className="w-4 h-4" /> <span className="font-medium">{displayName}</span>
          </p>
          <p className="flex items-center gap-2">
            <FaEnvelope className="w-4 h-4" /> {displayEmail}
          </p>
        </div>
        
        {/* Shipping + Payment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4 mb-4">
          <div><span className="font-semibold">🪪 Shipping Name:</span> {shippingDisplay.name}</div>
          <div><span className="font-semibold">📞 Phone:</span> {shippingDisplay.phone}</div>
          {/* Shipping Address Block */}
          <div className="col-span-2">
            <span className="font-semibold">📦 Shipping Address:</span>
            <div className="pl-2 mt-1">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-1 shadow-sm max-w-md">
                {shippingDisplay.addressFields.map((field, index) => (
                  <div key={index}>
                    <b>{field.label}:</b> {field.value}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div><span className="font-semibold">💳 Payment Mode:</span> {payment || 'N/A'}</div>
          <div><span className="font-semibold">🧾 Order ID:</span> #{order.orderId || 'N/A'}</div>
          <div><span className="font-semibold">📅 Date:</span> {formatDate(placedAt)}</div>
        </div>
        
        <div className="mb-2 text-sm"><b>🛍️ Products:</b></div>
        <ul className="mb-2 divide-y">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 py-2">
              {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />}
              <div>
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-gray-500">Qty: {item.quantity}{item.size && <> | Size: {item.size}</>}</div>
                <div className="text-xs">Price: {currency}{item.price}</div>
                <div className="text-xs">Subtotal: {currency}{item.price * item.quantity}</div>
              </div>
            </li>
          ))}
        </ul>
        
        {isTestOrder && (
          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Test Order</span>
        )}
        
        {/* Status Update Section */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Update Order Status</label>
          <div className="grid grid-cols-1 gap-2">
            {ORDER_STATUSES.map(statusOption => {
              const config = STATUS_CONFIG[statusOption];
              const IconComponent = config.icon;
              const isCurrentStatus = status === statusOption;
              
              return (
                <button
                  key={statusOption}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    isCurrentStatus 
                      ? 'bg-[#4D1E64] text-white border-[#4D1E64]' 
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onStatusChange(order._id, statusOption)}
                  disabled={isCurrentStatus}
                >
                  <IconComponent className={`w-4 h-4 ${isCurrentStatus ? 'text-white' : config.iconColor}`} />
                  <div className="text-left">
                    <div className="font-medium">{statusOption}</div>
                    <div className={`text-xs ${isCurrentStatus ? 'text-white/80' : 'text-gray-500'}`}>
                      {config.description}
                    </div>
                  </div>
                  {isCurrentStatus && (
                    <div className="ml-auto">
                      <FaCheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Payment Log Section */}
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2">Payment Log</h3>
          {order.phonepeTransactionId && (
            <div className="mb-1 text-xs text-gray-700">Transaction ID: <span className="font-mono">{order.phonepeTransactionId}</span></div>
          )}
          {order.amountPaid && (
            <div className="mb-1 text-xs text-gray-700">Amount Paid: <span className="font-mono">₹{order.amountPaid}</span></div>
          )}
          {order.paymentStatus && (
            <div className="mb-1 text-xs text-gray-700">Status: <span className="font-mono">{order.paymentStatus}</span></div>
          )}
          {order.paymentLog ? (
            <pre className="bg-gray-100 rounded p-2 text-xs max-h-48 overflow-auto border mt-2">
              {JSON.stringify(order.paymentLog, null, 2)}
            </pre>
          ) : (
            <div className="text-xs text-gray-500">No payment log available.</div>
          )}
        </div>
      </div>
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
        fetchOrders();
        toast.error('Backend error: ' + (response.data.message || 'Unknown error'));
        return;
      }
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Failed to update status: ' + (err.response?.data?.message || err.message));
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
  let filteredOrders = orders.filter(order => {
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders Management</h1>
        <p className="text-gray-600">Manage and track all customer orders with full lifecycle status support</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map(order => (
            <ModernOrderCard
              key={order._id}
              order={order}
              onView={setSelectedOrder}
              onStatusChange={updateStatus}
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