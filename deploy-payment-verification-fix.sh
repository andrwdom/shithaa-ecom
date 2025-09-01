#!/bin/bash

echo "🔧 Deploying payment verification response format fix..."

PROD_PATH="/var/www/shithaa-ecom"
BACKUP_DIR="$PROD_PATH/backups/$(date +%Y%m%d_%H%M%S)"

echo "📂 Creating backup directory..."
sudo mkdir -p $BACKUP_DIR

echo "📋 Creating backup of payment controller..."
sudo cp $PROD_PATH/backend/controllers/paymentController.js $BACKUP_DIR/paymentController.js.backup

echo "🔧 Applying payment verification response format fix..."
# Copy the fixed payment controller
sudo cp backend/controllers/paymentController.js $PROD_PATH/backend/controllers/paymentController.js

echo "🔄 Restarting backend..."
sudo pm2 restart shithaa-backend

echo "⏳ Waiting for restart..."
sleep 5

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent logs:"
sudo pm2 logs shithaa-backend --lines 10

echo ""
echo "✅ Payment verification fix deployed!"
echo ""
echo "🧪 TESTING:"
echo "1. Make a test payment"
echo "2. Check if payment success page shows correctly"
echo "3. Verify no more payment failed pages for successful payments"
echo ""
echo "📋 Changes made:"
echo "- Fixed response format in verifyPhonePePayment endpoint"
echo "- Added 'data' field to all error responses"
echo "- Ensured frontend receives payment status in expected format"
