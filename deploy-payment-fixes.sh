#!/bin/bash

echo "🚀 Deploying PAYMENT FIXES to production..."
echo "=========================================="

# Create backups
echo "📂 Creating backups..."
cp /var/www/shithaa-ecom/backend/controllers/paymentController.js /var/www/shithaa-ecom/backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)
cp /var/www/shithaa-ecom/backend/controllers/orderController.js /var/www/shithaa-ecom/backend/controllers/orderController.js.backup.$(date +%Y%m%d_%H%M%S)
cp /var/www/shithaa-ecom/backend/scripts/reconcilePhonePeOrders.js /var/www/shithaa-ecom/backend/scripts/reconcilePhonePeOrders.js.backup.$(date +%Y%m%d_%H%M%S)

# Copy fixed files
echo "📤 Copying fixed files to production..."
cp backend/controllers/paymentController.js /var/www/shithaa-ecom/backend/controllers/paymentController.js
cp backend/controllers/orderController.js /var/www/shithaa-ecom/backend/controllers/orderController.js
cp backend/scripts/reconcilePhonePeOrders.js /var/www/shithaa-ecom/backend/scripts/reconcilePhonePeOrders.js
cp backend/utils/invoice.js /var/www/shithaa-ecom/backend/utils/invoice.js

# Set correct permissions
echo "🔧 Setting correct permissions..."
chmod 644 /var/www/shithaa-ecom/backend/controllers/paymentController.js
chmod 644 /var/www/shithaa-ecom/backend/controllers/orderController.js
chmod 644 /var/www/shithaa-ecom/backend/scripts/reconcilePhonePeOrders.js
chmod 644 /var/www/shithaa-ecom/backend/utils/invoice.js

# Restart backend service
echo "🔄 Restarting backend service..."
cd /var/www/shithaa-ecom
pm2 restart shithaa-backend

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show recent logs
echo "📝 Recent backend logs:"
pm2 logs shithaa-backend --lines 10

echo "✅ Payment fixes deployed successfully!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "1. ✅ PhonePe payment verification: Fixed getOrderStatus/getStatus method compatibility"
echo "2. ✅ Stock confirmation: Enhanced product ID field handling"
echo "3. ✅ Invoice module: Created missing invoice.js file"
echo "4. ✅ Error handling: Improved error messages and logging"
echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- PhonePe payment verification should work without 'getStatus' errors"
echo "- Stock confirmation should work for all order item formats"
echo "- Invoice generation should work without module errors"
echo "- Better error messages for debugging"
