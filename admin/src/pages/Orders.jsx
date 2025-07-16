import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaEnvelope, FaTruck, FaPhone, FaMapMarkerAlt, FaMoneyBill, FaCalendarAlt, FaBox, FaTag, FaSearch, FaFilter, FaClock, FaCheckCircle, FaTimesCircle, FaShippingFast, FaDollarSign } from 'react-icons/fa';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  'Out for delivery': 'bg-purple-100 text-purple-800',
  Packing: 'bg-yellow-100 text-yellow-800',
  Shipped: 'bg-green-100 text-green-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const ORDER_STATUSES = ['All', 'Pending', 'Packing', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'];

function formatDate(date) {
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
  );
}

// Dashboard Summary Cards
const DashboardSummary = ({ orders }) => {
  const today = new Date().toDateString();
  
  const pendingOrders = orders.filter(order => {
    const status = order.orderStatus || order.status || order.paymentStatus;
    return status === 'Pending' || status === 'Packing';
  }).length;
  
  const shippedOrders = orders.filter(order => {
    const status = order.orderStatus || order.status || order.paymentStatus;
    return status === 'Shipped' || status === 'Out for delivery';
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Pending Orders</p>
            <h2 className="text-lg font-bold text-gray-900">{pendingOrders}</h2>
          </div>
          <FaClock className="w-5 h-5 text-yellow-500" />
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Shipped Orders</p>
            <h2 className="text-lg font-bold text-gray-900">{shippedOrders}</h2>
          </div>
          <FaShippingFast className="w-5 h-5 text-blue-500" />
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Delivered Orders</p>
            <h2 className="text-lg font-bold text-gray-900">{deliveredOrders}</h2>
          </div>
          <FaCheckCircle className="w-5 h-5 text-green-500" />
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Revenue Today</p>
            <h2 className="text-lg font-bold text-gray-900">{currency}{revenueToday.toFixed(2)}</h2>
          </div>
          <FaDollarSign className="w-5 h-5 text-green-500" />
        </div>
      </div>
    </div>
  );
};

// Segmented Toggle Group for Status
const StatusToggleGroup = ({ value, onChange }) => {
  const options = [
    { label: 'All', value: 'All' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Shipped', value: 'Shipped' },
    { label: 'Delivered', value: 'Delivered' },
  ];
  return (
    <div className="mb-4 flex gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-[#4D1E64] ${
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

const PAYMENT_METHODS = ['All', 'COD', 'Prepaid', 'Razorpay', 'Stripe'];
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
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 px-2 py-3">
        {/* Search Input */}
        <div className="w-full md:w-[260px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or phone"
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
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
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

// Modern Responsive Order Card
const ModernOrderCard = ({ order, onView, onStatusChange }) => {
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  const shipping = order.shippingAddress || order.shippingInfo || order.address;
  const name = shipping?.name || shipping?.fullName || order.customerName;
  const email = shipping?.email || order.shippingInfo?.email || order.email;
  const phone = shipping?.phone || order.shippingInfo?.phone || order.phone;
  const total = order.totalAmount || order.total || order.totalPrice;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  // --- Address fields ---
  const addressLines = shipping && shipping.addressLine1 ? [
    shipping.addressLine1,
    shipping.addressLine2,
    shipping.city,
    shipping.state,
    shipping.postalCode,
    shipping.country
  ].filter(Boolean) : [
    shipping?.line1,
    shipping?.line2,
    shipping?.city,
    shipping?.state,
    shipping?.pincode,
    shipping?.country
  ].filter(Boolean);
  const isTestOrder = order.isTestOrder || payment === 'test-paid';

  // Dropdown for status change
  const [showDropdown, setShowDropdown] = useState(false);
  const statusOptions = [
    { label: '✅ Delivered', value: 'Delivered' },
    { label: '🚚 Shipped', value: 'Shipped' },
    { label: '❌ Cancelled', value: 'Cancelled' },
  ];

  return (
    <div className="p-4 shadow-md rounded-xl flex flex-col gap-2 bg-white border border-gray-100">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-bold text-sm">#{order._id?.slice(-6) || 'N/A'} - {name}</p>
          <p className="text-xs text-gray-500">📧 {email}</p>
          <p className="text-xs text-gray-500">📞 {phone}</p>
          <p className="text-xs text-gray-500">📍 {addressLines.map((line, i) => <span key={i}>{line}{i < addressLines.length - 1 ? ', ' : ''}</span>)}</p>
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
      </div>
      <div className="text-xs text-gray-600 mt-2">
        <p>💳 {payment || 'N/A'} | ₹{total}</p>
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
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-20">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => { setShowDropdown(false); onStatusChange(order._id, opt.value); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function OrderDetailsModal({ order, onClose, onStatusChange }) {
  if (!order) return null;
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  const displayName = userInfo.name && userInfo.name.trim() ? userInfo.name : (userInfo.email || 'Unknown User');
  const shipping = order.shippingAddress || order.shippingInfo || order.address;
  const items = order.items || order.cartItems || [];
  const total = order.totalAmount || order.total || order.totalPrice;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  const coupon = order.couponUsed?.code || order.discount?.appliedCouponCode;
  const discount = order.couponUsed?.discount || order.discount?.value || 0;
  const isTestOrder = order.isTestOrder || payment === 'test-paid';
  // --- Address fields ---
  const hasShippingAddress = !!order.shippingAddress;
  const addressFields = shipping && shipping.addressLine1 ? [
    { label: 'Address Line 1', value: shipping.addressLine1 },
    { label: 'Address Line 2', value: shipping.addressLine2 },
    { label: 'City', value: shipping.city },
    { label: 'State', value: shipping.state },
    { label: 'Pincode', value: shipping.postalCode },
    { label: 'Country', value: shipping.country }
  ] : [
    { label: 'Address Line 1', value: shipping?.line1 },
    { label: 'Address Line 2', value: shipping?.line2 },
    { label: 'City', value: shipping?.city },
    { label: 'State', value: shipping?.state },
    { label: 'Pincode', value: shipping?.pincode },
    { label: 'Country', value: shipping?.country }
  ];
  // Total robust
  const totalAmount = order.totalAmount || order.totalPrice || order.total || order.orderSummary?.total || 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-2 py-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-auto p-4 sm:p-6 relative animate-fadeIn">
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
        {/* User Info Box */}
        <div className="bg-gray-100 p-3 rounded-md flex flex-col gap-1 text-sm mb-4">
          <p className="flex items-center gap-2">
            <FaUser className="w-4 h-4" /> <span className="font-medium">{displayName}</span>
          </p>
          <p className="flex items-center gap-2">
            <FaEnvelope className="w-4 h-4" /> {userInfo.email}
          </p>
          </div>
        {/* Shipping + Payment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4 mb-4">
          <div><span className="font-semibold">🪪 Shipping Name:</span> {shipping?.name || shipping?.fullName || order.customerName}</div>
          <div><span className="font-semibold">📞 Phone:</span> {shipping?.phone || order.phone}</div>
          {/* Shipping Address Block */}
          <div className="col-span-2">
            <span className="font-semibold">📦 Shipping Address:</span>
            <div className="pl-2 mt-1">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-1 shadow-sm max-w-md">
                {hasShippingAddress ? (
                  <>
                    {order.shippingAddress.addressLine1 && <div className="font-medium text-gray-900">{order.shippingAddress.addressLine1}</div>}
                    {order.shippingAddress.addressLine2 && <div className="text-gray-700">{order.shippingAddress.addressLine2}</div>}
                    <div className="flex gap-2 text-gray-700">
                      <span>{order.shippingAddress.city}</span>
                      <span>,</span>
                      <span>{order.shippingAddress.state}</span>
                    </div>
                    <div className="text-gray-700">Pincode: <span className="font-semibold">{order.shippingAddress.postalCode}</span></div>
                    <div className="text-gray-700">Country: <span className="font-semibold">{order.shippingAddress.country}</span></div>
                  </>
                ) : (
                  // Fallback for legacy orders
                  <>
                    {shipping?.line1 && <div className="font-medium text-gray-900">{shipping.line1}</div>}
                    {shipping?.line2 && <div className="text-gray-700">{shipping.line2}</div>}
                    <div className="flex gap-2 text-gray-700">
                      <span>{shipping?.city}</span>
                      <span>,</span>
                      <span>{shipping?.state}</span>
                    </div>
                    <div className="text-gray-700">Pincode: <span className="font-semibold">{shipping?.pincode}</span></div>
                    <div className="text-gray-700">Country: <span className="font-semibold">{shipping?.country}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div><span className="font-semibold">💳 Payment Mode:</span> {payment || 'N/A'}</div>
          <div><span className="font-semibold">🧾 Order ID:</span> #{order._id?.slice(-6) || 'N/A'}</div>
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
        <div className="mb-2">
          <label className="block mb-1 font-medium">Update Status</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={status}
            onChange={e => onStatusChange(order._id, e.target.value)}
          >
            {ORDER_STATUSES.filter(s => s !== 'All').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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
      // If 404, fallback to email and 'Unknown User'
      if (err.response && err.response.status === 404) {
        setUserNameCache(prev => ({ ...prev, [email]: 'Unknown User' }));
        return 'Unknown User';
      }
      // ignore other errors
    }
    return '';
  };

  useEffect(() => {
    console.log('Orders.jsx loaded');
  }, []);

  useEffect(() => {
    console.log('Orders component mounted');
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
        await fetchOrders();
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
      console.log("Sending token for status update:", token);
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
        toast.success('Order status updated');
        return;
      } else {
        // If the UI updates, still show success
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
    return ['Order Placed', 'Packing'].includes(status);
  };

  const getOrderStatusStyles = (status) => {
    switch (status) {
      case 'Cancelled':
        return 'border-red-200 bg-red-50';
      case 'Delivered':
        return 'border-green-200';
      case 'Shipped':
        return 'border-blue-200';
      default:
        return 'border-gray-200';
    }
  };

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Delivered':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Shipped':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Out for delivery':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Packing':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const name = order.customerName || '';
    const phone = order.phone || '';
    const orderId = order._id || '';
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search) ||
      orderId.toLowerCase().includes(search.toLowerCase());
    
    const status = order.status || order.orderStatus || order.paymentStatus;
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    // Date range filter
    const orderDate = new Date(order.createdAt || order.placedAt);
    const inDateRange = (!dateRange.start || orderDate >= new Date(dateRange.start)) &&
      (!dateRange.end || orderDate <= new Date(dateRange.end + 'T23:59:59'));
    // Payment method filter
    const matchesPayment = paymentMethod === 'All' || (order.paymentMethod || '').toLowerCase().includes(paymentMethod.toLowerCase());
    return matchesSearch && matchesStatus && inDateRange && matchesPayment;
  })
  .sort((a, b) => {
    const dateA = new Date(a.createdAt || a.placedAt);
    const dateB = new Date(b.createdAt || b.placedAt);
    return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders Management</h1>
        <p className="text-gray-600">Manage and track all customer orders</p>
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
      <StatusToggleGroup value={statusFilter} onChange={setStatusFilter} />

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