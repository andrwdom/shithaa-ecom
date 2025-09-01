#!/bin/bash

echo "🚀 Deploying Stock Fix Complete..."

# Navigate to project directory
cd /var/www/shithaa-ecom

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Check if the size field was added to cartItems schema
echo "🔍 Verifying cartItems schema fix..."
if grep -q "size: String" backend/models/orderModel.js; then
    echo "✅ Size field found in cartItems schema"
else
    echo "❌ Size field NOT found in cartItems schema"
    exit 1
fi

# Restart the backend
echo "🔄 Restarting backend..."
pm2 restart shithaa-backend

# Wait a moment for restart
sleep 3

# Check if backend is running
echo "🔍 Checking backend status..."
pm2 status shithaa-backend

# Clear logs to see fresh output
echo "🧹 Clearing old logs..."
pm2 flush shithaa-backend

echo "✅ Stock fix deployment complete!"
echo "🎯 The cartItems schema now includes the size field"
echo "📝 Test a new payment to verify the fix"
