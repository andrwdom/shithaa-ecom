import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import MaintenanceToggle from '../components/MaintenanceToggle';

const Dashboard = ({ token }) => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    pendingOrders: 0,
    recentOrders: [],
    systemHealth: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders
      const ordersResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://shithaa.in'}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.data || [];

      // Fetch products
      const productsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://shithaa.in'}/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!productsResponse.ok) {
        throw new Error('Failed to fetch products');
      }

      const productsData = await productsResponse.json();
      const products = productsData.data || [];

      // Fetch system health
      const healthResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://shithaa.in'}/api/monitoring/health`);
      let systemHealth = null;
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        systemHealth = healthData.data;
      }

      // Calculate stats
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
      const totalProducts = products.length;
      const pendingOrders = orders.filter(order => 
        order.status === 'Pending' || order.orderStatus === 'Pending'
      ).length;

      // Get recent orders (last 5)
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setStats({
        totalOrders,
        totalRevenue,
        totalProducts,
        pendingOrders,
        recentOrders,
        systemHealth
      });

    } catch (err) {
      setError(err.message);
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your e-commerce system</p>
        </div>
        <Button onClick={fetchDashboardData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">Error: {error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              All time orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Health Alert */}
      {stats.systemHealth && (
        <Card className={stats.systemHealth.status === 'CRITICAL' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {stats.systemHealth.status === 'CRITICAL' ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              System Health
              <Badge variant={stats.systemHealth.status === 'CRITICAL' ? 'destructive' : 'default'}>
                {stats.systemHealth.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Recent Orders:</span> {stats.systemHealth.recent.orders}
              </div>
              <div>
                <span className="font-medium">Missing Orders:</span> 
                <Badge variant={stats.systemHealth.recent.missingOrders > 0 ? 'destructive' : 'default'} className="ml-2">
                  {stats.systemHealth.recent.missingOrders}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Payment Sessions:</span> {stats.systemHealth.recent.sessions}
              </div>
            </div>
            {stats.systemHealth.recent.missingOrders > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-800 font-medium">⚠️ Critical: {stats.systemHealth.recent.missingOrders} missing orders detected!</p>
                <p className="text-red-600 text-sm">Run the recovery script immediately.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maintenance Toggle */}
      <MaintenanceToggle />

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No orders found</p>
          ) : (
            <div className="space-y-4">
              {stats.recentOrders.map((order, index) => (
                <div key={order._id || index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Order #{order.orderId || order._id}</p>
                      <p className="text-sm text-gray-500">
                        {order.userInfo?.email || order.email || 'Unknown user'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{order.total || order.totalAmount || 0}</p>
                    <Badge variant={
                      order.status === 'Delivered' ? 'default' :
                      order.status === 'Shipped' ? 'default' :
                      order.status === 'Processing' ? 'default' :
                      'secondary'
                    }>
                      {order.status || order.orderStatus || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
