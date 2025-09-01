#!/bin/bash

echo "🔧 Deploying INVOICE IMPORT FIX..."
echo "=================================="

# Create backup
echo "📂 Creating backup..."
cp /var/www/shithaa-ecom/backend/controllers/paymentController.js /var/www/shithaa-ecom/backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)

# Copy fixed file
echo "📤 Copying fixed payment controller..."
cp backend/controllers/paymentController.js /var/www/shithaa-ecom/backend/controllers/paymentController.js

# Set correct permissions
echo "🔧 Setting correct permissions..."
chmod 644 /var/www/shithaa-ecom/backend/controllers/paymentController.js

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

echo "✅ Invoice import fix deployed successfully!"
echo ""
echo "🔧 FIX APPLIED:"
echo "- Fixed dynamic imports in paymentController.js to use invoiceGenerator.js directly"
echo "- Removed dependency on the invoice.js wrapper file"
echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- No more 'ERR_MODULE_NOT_FOUND' errors for invoice.js"
echo "- Invoice generation should work properly"
echo "- Payment verification should complete without errors"
