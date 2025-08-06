#!/bin/bash

echo "🚨 EMERGENCY FIX: Resolving SCFL00130 Duplicate Error"
echo "===================================================="

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

echo "🔧 Running immediate fix..."
node scripts/immediate-fix.js

echo "🔄 Restarting backend server..."
pm2 restart shitha-backend

echo "⏳ Waiting 3 seconds..."
sleep 3

echo "🧪 Testing API..."
curl -s http://localhost:4000/api/cors-test

echo "✅ Emergency fix completed!"
echo "💡 Try adding the product again in admin panel"