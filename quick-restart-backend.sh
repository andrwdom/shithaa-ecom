#!/bin/bash

echo "🔄 Quick restart of backend service..."

# Navigate to project directory
cd /var/www/shithaa-ecom

# Restart the backend
pm2 restart shithaa-backend

# Wait a moment
sleep 2

# Check status
pm2 status shithaa-backend

echo "✅ Backend restarted successfully!"
echo "📋 Test the checkout flow now to see if the stock reservation issue is fixed."
