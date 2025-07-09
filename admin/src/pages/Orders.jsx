import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  'Out for delivery': 'bg-purple-100 text-purple-800',
  Packing: 'bg-yellow-100 text-yellow-800',
  Shipped: 'bg-green-100 text-green-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_METHODS = ['All', 'COD', 'Online'];
const ORDER_STATUSES = ['All', 'Pending', 'Packing', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'];

function formatDate(date) {
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
  );
}

function OrderCard({ order, onView, userNameCache, fetchUserName }) {
  // Prefer new structured fields
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  const shipping = order.shippingInfo || order.address;
  const name = shipping?.name || order.shippingInfo?.fullName || order.customerName;
  const email = shipping?.email || order.shippingInfo?.email || order.email;
  const phone = shipping?.phone || order.shippingInfo?.phone || order.phone;
  const total = order.totalAmount || order.total || order.totalPrice;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  const isTestOrder = order.isTestOrder || payment === 'test-paid';

  // Fallback: fetch display name if missing or matches email
  const [displayName, setDisplayName] = useState(userInfo.name && userInfo.name.trim() && userInfo.name !== userInfo.email ? userInfo.name : '');
  useEffect(() => {
    if (!displayName && userInfo.email) {
      if (userNameCache[userInfo.email]) {
        setDisplayName(userNameCache[userInfo.email]);
      } else {
        fetchUserName(userInfo.email).then(name => {
          if (name) setDisplayName(name);
        });
      }
    }
  }, [userInfo.email, userInfo.name, displayName, userNameCache, fetchUserName]);

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col gap-2">
      {/* Google Authenticated User Info */}
      <div className="rounded px-3 py-2 mb-2 bg-gray-100 border border-gray-200 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="font-semibold">👤 User:</span>
          <span>{displayName || userInfo.email || 'Unknown User'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 flex-row">
          <span className="font-semibold">📧 Email:</span>
          <span
            className="truncate max-w-[160px] block"
            title={userInfo.email}
            style={{ lineHeight: '1.2' }}
          >
            {userInfo.email}
          </span>
        </div>
      </div>
      {/* Shipping Info */}
      <div className="flex items-center justify-between">
        <div className="font-bold text-lg text-gray-800 truncate">🚚 {name}</div>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
        <span>📞 <b>{phone}</b></span>
        <span>📬 <b>{shipping?.address || [shipping?.line1, shipping?.city, shipping?.state, shipping?.country, shipping?.pincode].filter(Boolean).join(', ')}</b></span>
      </div>
      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
        <span>💸 Total: <b>{currency}{total}</b></span>
        <span>📅 Date: <b>{formatDate(placedAt)}</b></span>
      </div>
      {isTestOrder && (
        <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Test Order</span>
      )}
      <button
        className="mt-2 w-full py-2 rounded bg-theme-400 text-white font-semibold hover:bg-theme-500 transition"
        onClick={() => onView(order)}
      >
        View Details
      </button>
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onStatusChange }) {
  if (!order) return null;
  // Prefer new structured fields
  const userInfo = order.userInfo || { name: order.customerName, email: order.email };
  // Fix: Always display a username, fallback to email or 'Unknown User' if missing
  const displayName = userInfo.name && userInfo.name.trim() ? userInfo.name : (userInfo.email || 'Unknown User');
  const shipping = order.shippingInfo || order.address;
  const items = order.items || order.cartItems || [];
  const total = order.totalAmount || order.total || order.totalPrice;
  const payment = order.paymentStatus || order.paymentMethod;
  const status = order.orderStatus || order.status || order.paymentStatus;
  const placedAt = order.createdAt || order.placedAt;
  const coupon = order.couponUsed?.code || order.discount?.appliedCouponCode;
  const discount = order.couponUsed?.discount || order.discount?.value || 0;
  const isTestOrder = order.isTestOrder || payment === 'test-paid';
  // Address robust join
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
  // Total robust
  const totalAmount = order.totalAmount || order.totalPrice || order.total || order.orderSummary?.total || 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-2 p-6 relative animate-fadeIn">
        <button className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-2">Order Details</h2>
        {/* Google Authenticated User Info */}
        <div className="rounded px-3 py-2 mb-3 bg-gray-100 border border-gray-200 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-semibold">👤 User:</span>
            <span>{displayName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-semibold">📧 Email:</span>
            <span>{userInfo.email}</span>
          </div>
        </div>
        {/* Shipping Info */}
        <div className="mb-2 text-sm"><b>🚚 Shipping Name:</b> {shipping?.name || shipping?.fullName || order.customerName}</div>
        <div className="mb-2 text-sm"><b>📞 Phone:</b> {shipping?.phone || order.phone}</div>
        <div className="mb-2 text-sm"><b>📬 Address:</b> {address}</div>
        <div className="mb-2 text-sm"><b>💸 Total Amount:</b> {currency}{totalAmount}</div>
        <div className="mb-2 text-sm"><b>📅 Order Date:</b> {formatDate(placedAt)}</div>
        {coupon && (
          <div className="mb-2 text-sm text-green-700 font-semibold"><b>🔖 Coupon:</b> {coupon} <span className="ml-2">(Discount: {discount})</span></div>
        )}
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
  const [printOrder, setPrintOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const printRef = useRef();
  const navigate = useNavigate();
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [lastApiResponse, setLastApiResponse] = useState(null);
  // Cache for user display names
  const [userNameCache, setUserNameCache] = useState({});
  // Helper to fetch display name from backend
  const fetchUserName = async (email) => {
    if (!email) return '';
    if (userNameCache[email]) return userNameCache[email];
    try {
      const res = await axios.get(`${backendUrl}/api/users/public-profile?email=${encodeURIComponent(email)}`);
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
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search);
    const matchesPayment = paymentFilter === 'All' || order.paymentMethod === paymentFilter;
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesPayment && matchesStatus;
  });

  return (
    <div className="max-w-2xl mx-auto px-2 pb-8">
      <div className="bg-gray-100 p-2 mb-2 rounded text-xs">
        <b>Debug Panel</b><br />
        <div>Token: {token ? token.slice(0, 8) + '...' : 'None'}</div>
        <div>Endpoint: {backendUrl}/api/orders</div>
        <div>Last API Response: <pre style={{maxHeight: 100, overflow: 'auto'}}>{JSON.stringify(lastApiResponse, null, 2)}</pre></div>
      </div>
      <div className="sticky top-0 z-10 bg-gray-50 pt-4 pb-2 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <input
            className="flex-1 px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-theme-400"
            placeholder="Search by name or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-theme-400"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
          >
            {PAYMENT_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-theme-400"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {ORDER_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>
      {loading && <div className="text-center py-8 text-gray-400">Loading orders...</div>}
      {apiError && <div className="text-center py-8 text-red-500">Error: {apiError}</div>}
      {!loading && !apiError && orders.length === 0 && <div className="text-center py-8 text-yellow-500">No orders found.</div>}
      {!loading && !apiError && filteredOrders.length === 0 && <div className="text-center py-8 text-gray-400">No orders found.</div>}
      {!loading && !apiError && filteredOrders.length > 0 && (
        filteredOrders.slice(0, 10).map(order => (
          <OrderCard key={order._id} order={order} onView={setSelectedOrder} userNameCache={userNameCache} fetchUserName={fetchUserName} />
        ))
      )}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateStatus}
        />
      )}
      {printOrder && (
        <div className='fixed inset-0 bg-white z-[9999] flex items-center justify-center print:block'>
          <Invoice ref={printRef} order={printOrder} />
        </div>
      )}
    </div>
  )
}

export default Orders