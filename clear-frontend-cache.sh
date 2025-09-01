#!/bin/bash

echo "🧹 Clearing frontend cache and forcing fresh API calls..."

# Clear PM2 cache
echo "🔄 Clearing PM2 cache..."
sudo pm2 flush

# Restart backend to clear any module cache
echo "🔄 Restarting backend to clear module cache..."
sudo pm2 restart shithaa-backend

# Wait for restart
echo "⏳ Waiting for restart..."
sleep 5

# Check status
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "🧪 TESTING STEPS:"
echo "1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Add exactly 2 loungewear items to cart"
echo "3. Go to checkout page"
echo "4. Check if discount shows ₹0 (not ₹2)"
echo ""
echo "📋 Monitor logs in real-time:"
echo "sudo pm2 logs shithaa-backend --follow"
echo ""
echo "🔍 If still having issues, test the API directly:"
echo "bash test-cart-calculation.sh"
