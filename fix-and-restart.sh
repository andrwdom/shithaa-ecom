#!/bin/bash

echo "🔧 Restarting server with loungewear offer fix..."

# Navigate to project directory
cd /d/Productivity/Client\ Sites/Shitha-v3/shithaa-ecom-V3

# Kill any existing PM2 processes
pm2 kill

# Start fresh
pm2 start ecosystem.config.js

echo "✅ Server restarted with fresh state"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Clear your cart completely"
echo "2. Add exactly 2 'test11' items (size S)"
echo "3. Go to checkout page"
echo "4. Check the console logs for our debug messages"
echo "5. Verify that discount shows ₹0 (not ₹2)"
echo ""
echo "📋 To check logs: pm2 logs shithaa --lines 30"
