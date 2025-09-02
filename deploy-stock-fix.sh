#!/bin/bash

# Deploy Stock Reservation Fix
# This script fixes the stock reservation issue

echo "🔧 Deploying stock reservation fix..."

# Navigate to project directory
cd /var/www/shithaa-ecom

# Restart the backend to apply the stock.js fixes
echo "🔄 Restarting backend service..."
pm2 restart shithaa-backend

# Wait a moment for the service to start
sleep 3

# Check if the service is running
echo "📊 Checking service status..."
pm2 status shithaa-backend

# Show recent logs to verify the fix
echo "📋 Recent backend logs:"
pm2 logs shithaa-backend --lines 10

echo "✅ Stock reservation fix deployed!"
echo "📋 Next steps:"
echo "   1. Test the checkout flow"
echo "   2. Monitor logs for any stock-related errors"
echo "   3. If issues persist, check the product stock data in MongoDB"
