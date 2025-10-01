import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  Database,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Package
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://shithaa.in';

const Dashboard = ({ token }) => {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [circuitBreakers, setCircuitBreakers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch all monitoring data
  const fetchMonitoringData = async () => {
    try {
      // Fetch health
      const healthRes = await fetch(`${API_URL}/api/health`);
      const healthData = await healthRes.json();
      setHealth(healthData);

      // Fetch metrics
      try {
        const metricsRes = await fetch(`${API_URL}/api/system-monitoring/metrics`);
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
      } catch (e) {
        console.log('Metrics not available');
      }

      // Fetch alerts
      try {
        const alertsRes = await fetch(`${API_URL}/api/system-monitoring/alerts`);
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.activeAlerts || []);
        }
      } catch (e) {
        console.log('Alerts not available');
      }

      // Fetch circuit breakers
      try {
        const cbRes = await fetch(`${API_URL}/api/system-monitoring/circuit-breakers`);
        if (cbRes.ok) {
          const cbData = await cbRes.json();
          setCircuitBreakers(cbData);
        }
      } catch (e) {
        console.log('Circuit breakers not available');
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Monitoring fetch error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchMonitoringData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status) => {
    if (status === 'ok' || status === 'healthy' || status === 'CLOSED') return 'text-green-500 bg-green-50';
    if (status === 'warning' || status === 'degraded' || status === 'HALF_OPEN') return 'text-yellow-500 bg-yellow-50';
    return 'text-red-500 bg-red-50';
  };

  const getStatusIcon = (status) => {
    if (status === 'ok' || status === 'healthy' || status === 'CLOSED') return <CheckCircle className="h-5 w-5" />;
    if (status === 'warning' || status === 'degraded' || status === 'HALF_OPEN') return <AlertTriangle className="h-5 w-5" />;
    return <XCircle className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading monitoring system...</span>
        </div>
      </div>
    );
  }

  const overallStatus = health?.status || 'unknown';
  const healthScore = health?.monitoring?.healthScore || 0;

  return (
    <div className="space-y-4 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">Real-time health and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Resume'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alerts.filter(a => a.severity === 'critical').length > 0 && (
        <Alert className="border-red-500 bg-red-50 animate-pulse">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 font-medium">
            🚨 {alerts.filter(a => a.severity === 'critical').length} CRITICAL ISSUE(S) REQUIRE IMMEDIATE ATTENTION!
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Status */}
        <Card className={`border-2 ${getStatusColor(overallStatus)}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Overall Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={getStatusColor(overallStatus)}>
                {getStatusIcon(overallStatus)}
              </div>
              <div>
                <div className="text-2xl font-bold uppercase">{overallStatus}</div>
                <div className="text-sm text-gray-500">Health Score: {healthScore}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{health?.database || 'unknown'}</span>
              <Badge variant={health?.database === 'connected' ? 'default' : 'destructive'}>
                {health?.database === 'connected' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Redis Cache */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Redis Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{health?.redis || 'unknown'}</span>
              <Badge variant={health?.redis === 'connected' ? 'default' : 'destructive'}>
                {health?.redis === 'connected' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Server Uptime */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Server className="h-4 w-4" />
              Server Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.uptime ? Math.floor(health.uptime / 3600) + 'h' : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              {health?.uptime ? Math.floor((health.uptime % 3600) / 60) + 'm' : ''}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Server Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">RSS Memory</div>
              <div className="text-2xl font-bold">{health?.memory?.rss || 0} MB</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Heap Used</div>
              <div className="text-2xl font-bold">{health?.memory?.heapUsed || 0} MB</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Heap Total</div>
              <div className="text-2xl font-bold">{health?.memory?.heapTotal || 0} MB</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">External</div>
              <div className="text-2xl font-bold">{health?.memory?.external || 0} MB</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="font-semibold">{alert.type}</span>
                      </div>
                      <div className="mt-2 text-sm">
                        {JSON.stringify(alert.context, null, 2)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Alerts - All Good! */}
      {alerts.length === 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              All Systems Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-600">No active alerts. Everything is running smoothly! 🎉</p>
          </CardContent>
        </Card>
      )}

      {/* Circuit Breakers Status */}
      {circuitBreakers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Circuit Breakers
              <Badge variant="outline" className="ml-2">
                Protection Systems
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(circuitBreakers).map(([name, status]) => (
                <div
                  key={name}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(status.state)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{name}</span>
                    <Badge
                      variant={status.state === 'CLOSED' ? 'default' : status.state === 'HALF_OPEN' ? 'warning' : 'destructive'}
                    >
                      {status.state}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Health: {status.healthScore || 0}%</div>
                    <div>Failures: {status.failureCount || 0}/{status.failureThreshold || 5}</div>
                    {status.metrics?.totalRequests && (
                      <div className="text-xs text-gray-500">
                        Requests: {status.metrics.totalRequests}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Business Metrics (Live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(metrics).slice(0, 9).map(([key, metric]) => (
                <div key={key} className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">{key}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">{metric.count || 0}</span>
                    {metric.average && (
                      <span className="text-sm text-gray-500">
                        avg: {Math.round(metric.average)}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={fetchMonitoringData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${API_URL}/api/health`, '_blank')}
            >
              <Activity className="h-4 w-4 mr-2" />
              Raw Health
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${API_URL}/api/system-monitoring/metrics`, '_blank')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Metrics
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${API_URL}/api/cache/stats`, '_blank')}
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Cache Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="border-gray-300 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs font-mono text-gray-500 space-y-1">
            <div>Environment: {health?.environment || 'unknown'}</div>
            <div>API URL: {API_URL}</div>
            <div>Last Update: {lastUpdate.toISOString()}</div>
            <div>Auto Refresh: {autoRefresh ? 'Enabled (30s)' : 'Disabled'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
