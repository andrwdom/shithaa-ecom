#!/bin/bash

echo "🚀 Deploying loungewear offer fix to production..."

# Set production path
PROD_PATH="/var/www/shithaa-ecom"

echo "📂 Backing up current cartController.js..."
sudo cp $PROD_PATH/backend/controllers/cartController.js $PROD_PATH/backend/controllers/cartController.js.backup

echo "📤 Copying fixed cartController.js to production..."
sudo cp backend/controllers/cartController.js $PROD_PATH/backend/controllers/

echo "🔧 Setting correct permissions..."
sudo chown www-data:www-data $PROD_PATH/backend/controllers/cartController.js
sudo chmod 644 $PROD_PATH/backend/controllers/cartController.js

echo "🔄 Restarting PM2 application..."
sudo pm2 restart shithaa

echo "⏳ Waiting for application to start..."
sleep 5

echo "✅ Deployment completed!"
echo ""
echo "📋 VERIFY THE FIX:"
echo "1. Check if server is running: sudo pm2 status"
echo "2. Check logs for syntax errors: sudo pm2 logs shithaa --lines 10"
echo "3. Test the loungewear offer with 2 items (should show ₹0 discount)"
echo ""
echo "🔍 If there are still issues, check the backup:"
echo "sudo cp $PROD_PATH/backend/controllers/cartController.js.backup $PROD_PATH/backend/controllers/cartController.js"
