import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { backendUrl } from '../App';

const Orders = ({ token, setToken }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/orders');
      
      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        toast.error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        setToken('');
        navigate('/');
      }
      toast.error(error.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await api.post('/api/orders/status', {
        orderId,
        status
      });

      if (response.data.success) {
        toast.success(`Order status updated to ${status}`);
        fetchOrders();
      } else {
        toast.error(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Orders Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div key={order._id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold">Order #{order.orderId}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {order.status}
              </span>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Customer: {order.customerName}</p>
              <p className="text-sm text-gray-600">Total: ₹{order.totalAmount}</p>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setSelectedOrder(order)}
                className="text-blue-600 hover:text-blue-800"
              >
                View Details
              </button>
              <select
                value={order.status}
                onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Order Information</h3>
                <p>Order ID: {selectedOrder.orderId}</p>
                <p>Status: {selectedOrder.status}</p>
                <p>Date: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                <p>Total Amount: ₹{selectedOrder.totalAmount}</p>
              </div>

              <div>
                <h3 className="font-semibold">Customer Information</h3>
                <p>Name: {selectedOrder.customerName}</p>
                <p>Email: {selectedOrder.email}</p>
                <p>Phone: {selectedOrder.phone}</p>
              </div>

              <div>
                <h3 className="font-semibold">Items</h3>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
