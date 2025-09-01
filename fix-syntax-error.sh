#!/bin/bash

echo "🔧 Fixing syntax error on production server..."

PROD_PATH="/var/www/shithaa-ecom"
BACKUP_FILE="$PROD_PATH/backend/controllers/cartController.js.backup"
CURRENT_FILE="$PROD_PATH/backend/controllers/cartController.js"

echo "📂 Creating backup..."
sudo cp $CURRENT_FILE $BACKUP_FILE

echo "🔍 Checking for syntax errors..."
sudo node -c $CURRENT_FILE
if [ $? -eq 0 ]; then
    echo "✅ No syntax errors detected in current file"
    echo "🔍 The error might be in a different file or cached module"
else
    echo "❌ Syntax errors found in current file"
fi

echo ""
echo "🔄 Restarting PM2 processes..."
sudo pm2 restart shithaa-backend
sudo pm2 restart shithaa-frontend

echo "⏳ Waiting for restart..."
sleep 10

echo ""
echo "📊 Checking PM2 status..."
sudo pm2 status

echo ""
echo "📝 Recent error logs..."
sudo pm2 logs shithaa-backend --lines 5

echo ""
echo "✅ Fix attempt completed!"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Try adding 2 loungewear items to cart"
echo "2. Go to checkout page"
echo "3. Verify discount shows ₹0 (not ₹2)"
echo ""
echo "🔍 If still having issues, check all logs:"
echo "sudo pm2 logs --lines 20"
