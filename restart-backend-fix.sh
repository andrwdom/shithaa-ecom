#!/bin/bash

echo "🔄 Restarting backend to apply payment fixes..."

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

# Restart the backend service
echo "🔄 Restarting shithaa-backend..."
pm2 restart shithaa-backend

# Wait a moment for restart
sleep 3

# Check if the service is running
echo "✅ Checking backend status..."
pm2 status shithaa-backend

# Check recent logs
echo "📋 Recent backend logs:"
pm2 logs shithaa-backend --lines 10

echo "🎉 Backend restart completed!"
echo "The payment verification fix should now be active."
