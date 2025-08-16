#!/bin/bash

# Fixed Admin Panel PM2 Start Script
echo "🚀 Starting Admin Panel with PM2 (Fixed Configuration)..."

# Navigate to admin directory
cd /var/www/shithaa-ecom/admin

# Stop and delete existing admin panel process if it exists
if pm2 list | grep -q "admin-panel"; then
    echo "🔄 Stopping existing admin panel process..."
    pm2 stop admin-panel
    pm2 delete admin-panel
fi

echo "🚀 Starting new admin panel process with proper network binding..."
# Start with explicit host binding
pm2 start npm --name "admin-panel" -- run dev -- --host 0.0.0.0

# Save PM2 configuration
pm2 save

echo "✅ Admin panel started with proper network binding!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs admin-panel"
echo "🛑 Stop: pm2 stop admin-panel"

# Wait a moment for the process to start
sleep 3

# Test if it's accessible
echo "🧪 Testing admin panel accessibility..."
if curl -s http://localhost:5174 > /dev/null; then
    echo "✅ Admin panel is accessible locally"
else
    echo "❌ Admin panel is NOT accessible locally"
fi

# Check if it's listening on all interfaces
echo "🌐 Checking network binding..."
if netstat -tlnp | grep :5174 | grep -q "0.0.0.0"; then
    echo "✅ Admin panel is listening on all interfaces (0.0.0.0:5174)"
else
    echo "❌ Admin panel is NOT listening on all interfaces"
fi
