#!/bin/bash

echo "🔧 QUICK FIX - Resolving Duplicate Product IDs"
echo "=============================================="

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

echo "📦 Running duplicate product fix..."
node scripts/fix-duplicate-products.js

echo "🔄 Restarting backend server..."
pm2 restart shitha-backend

echo "⏳ Waiting 5 seconds for server to start..."
sleep 5

echo "🔍 Checking server status..."
pm2 status

echo "🧪 Testing backend API..."
curl -s http://localhost:4000/api/cors-test

echo "✅ Duplicate product fix completed!"
echo "🌐 Test the website: https://shithaa.in" 