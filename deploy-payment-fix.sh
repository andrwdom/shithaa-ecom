#!/bin/bash

echo "🔧 Deploying payment verification fix..."

# Navigate to backend directory
cd backend

# Restart the backend service
echo "🔄 Restarting backend service..."
pm2 restart shithaa-backend

# Check if the service is running
echo "✅ Checking backend status..."
pm2 status shithaa-backend

echo "🎉 Payment verification fix deployed successfully!"
echo ""
echo "The fix includes:"
echo "- Added orderPayload field to PaymentSession schema"
echo "- Added safety checks for undefined orderPayload"
echo "- Fixed order creation in payment verification, callback, and webhook"
echo ""
echo "You can now test placing an order again."