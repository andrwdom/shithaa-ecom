#!/bin/bash

# Quick fix script for frontend PM2 issue
echo "🔧 Quick fix for frontend PM2 issue..."

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

# Make start script executable
chmod +x start.sh

# Go back to project root
cd ..

# Stop and delete the problematic frontend process
echo "🛑 Stopping problematic frontend process..."
pm2 stop shithaa-frontend 2>/dev/null
pm2 delete shithaa-frontend 2>/dev/null

# Start fresh using the ecosystem config
echo "🚀 Starting frontend with fresh configuration..."
pm2 start ecosystem.config.js --only shithaa-frontend

# Wait a moment and check status
sleep 5
echo "📊 Frontend status:"
pm2 list | grep shithaa-frontend

# Check if it's running
if pm2 list | grep -q "shithaa-frontend.*online"; then
    echo "✅ Frontend is now running successfully!"
else
    echo "❌ Frontend still has issues. Checking logs..."
    pm2 logs shithaa-frontend --lines 10
fi
