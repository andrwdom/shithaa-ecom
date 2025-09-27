import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Shield,
  ShoppingCart,
  CreditCard
} from 'lucide-react';

const MaintenanceToggle = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch maintenance status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/maintenance/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch status');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle maintenance mode
  const toggleMaintenance = async (mode, action) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          action,
          reason: `Toggled via admin panel at ${new Date().toLocaleString()}`
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh status after toggle
        await fetchStatus();
      } else {
        setError(data.message || 'Failed to toggle maintenance mode');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  if (!status) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Maintenance Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isMaintenanceActive = status.maintenanceMode || status.disableCheckout || status.disablePayments;
  const isFullMaintenance = status.maintenanceMode;
  const isCheckoutDisabled = status.disableCheckout;
  const isPaymentsDisabled = status.disablePayments;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Maintenance Control
          {isMaintenanceActive && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              ACTIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Current Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full Maintenance */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <div>
                  <p className="font-medium">Full Maintenance</p>
                  <p className="text-sm text-gray-500">Blocks all operations</p>
                </div>
              </div>
              <Badge variant={isFullMaintenance ? "destructive" : "secondary"}>
                {isFullMaintenance ? "ON" : "OFF"}
              </Badge>
            </div>

            {/* Checkout Disabled */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5" />
                <div>
                  <p className="font-medium">Checkout Disabled</p>
                  <p className="text-sm text-gray-500">Blocks checkout only</p>
                </div>
              </div>
              <Badge variant={isCheckoutDisabled ? "destructive" : "secondary"}>
                {isCheckoutDisabled ? "ON" : "OFF"}
              </Badge>
            </div>

            {/* Payments Disabled */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                <div>
                  <p className="font-medium">Payments Disabled</p>
                  <p className="text-sm text-gray-500">Blocks payments only</p>
                </div>
              </div>
              <Badge variant={isPaymentsDisabled ? "destructive" : "secondary"}>
                {isPaymentsDisabled ? "ON" : "OFF"}
              </Badge>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Server Time:</span> {status.serverTime}
            </div>
            <div>
              <span className="font-medium">Uptime:</span> {Math.floor(status.uptime / 60)} minutes
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(status.timestamp).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <Badge variant={isMaintenanceActive ? "destructive" : "default"} className="ml-2">
                {isMaintenanceActive ? "MAINTENANCE" : "OPERATIONAL"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Emergency Actions */}
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Emergency Actions</h4>
              <div className="space-y-2">
                <Button
                  onClick={() => toggleMaintenance('MAINTENANCE_MODE', 'enable')}
                  disabled={loading || isFullMaintenance}
                  variant="destructive"
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Enable Full Maintenance
                </Button>
                <Button
                  onClick={() => toggleMaintenance('DISABLE_CHECKOUT', 'enable')}
                  disabled={loading || isCheckoutDisabled}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Disable Checkout Only
                </Button>
                <Button
                  onClick={() => toggleMaintenance('DISABLE_PAYMENTS', 'enable')}
                  disabled={loading || isPaymentsDisabled}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Disable Payments Only
                </Button>
              </div>
            </div>

            {/* Recovery Actions */}
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Recovery Actions</h4>
              <div className="space-y-2">
                <Button
                  onClick={() => toggleMaintenance('MAINTENANCE_MODE', 'disable')}
                  disabled={loading || !isMaintenanceActive}
                  variant="default"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Disable All Maintenance
                </Button>
                <Button
                  onClick={() => toggleMaintenance('DISABLE_CHECKOUT', 'disable')}
                  disabled={loading || !isCheckoutDisabled}
                  variant="outline"
                  className="w-full border-green-200 text-green-600 hover:bg-green-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Re-enable Checkout
                </Button>
                <Button
                  onClick={() => toggleMaintenance('DISABLE_PAYMENTS', 'disable')}
                  disabled={loading || !isPaymentsDisabled}
                  variant="outline"
                  className="w-full border-green-200 text-green-600 hover:bg-green-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Re-enable Payments
                </Button>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={fetchStatus}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Warning Messages */}
        {isMaintenanceActive && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Maintenance Mode Active!</strong> Users will see maintenance messages. 
              Remember to disable maintenance mode when the issue is fixed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceToggle;
