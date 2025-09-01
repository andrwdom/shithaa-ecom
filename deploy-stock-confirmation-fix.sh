#!/bin/bash

echo "🔧 Deploying STOCK CONFIRMATION FIX..."
echo "====================================="

# Navigate to the project directory
cd /var/www/shithaa-ecom

# Create backup of current stock.js
echo "📂 Creating backup..."
cp backend/utils/stock.js backend/utils/stock.js.backup.$(date +%Y%m%d_%H%M%S)

# Copy the fixed stock.js file
echo "📤 Copying fixed stock.js..."
cp backend/utils/stock.js /var/www/shithaa-ecom/backend/utils/stock.js

# Set correct permissions
echo "🔧 Setting correct permissions..."
chmod 644 /var/www/shithaa-ecom/backend/utils/stock.js

# Run the stock confirmation debug script
echo "🔍 Running stock confirmation analysis..."
node backend/fix-stock-confirmation.js

# Restart backend service
echo "🔄 Restarting backend service..."
pm2 restart shithaa-backend

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 10

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show recent logs
echo "📝 Recent backend logs:"
pm2 logs shithaa-backend --lines 10

echo "✅ Stock confirmation fix deployed successfully!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "- Enhanced stock confirmation debugging"
echo "- Better error messages for stock issues"
echo "- Improved handling of edge cases"
echo "- Added product and size validation"
echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- Better debugging information for stock confirmation failures"
echo "- Clearer error messages when stock confirmation fails"
echo "- More robust handling of stock edge cases"
echo "- Payment verification should work more reliably"
