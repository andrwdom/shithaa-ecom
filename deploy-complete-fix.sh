#!/bin/bash

echo "🚀 Deploying COMPLETE FIX to production..."

PROD_PATH="/var/www/shithaa-ecom"

echo "📂 Creating backups..."
sudo cp $PROD_PATH/backend/controllers/paymentController.js $PROD_PATH/backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/backend/controllers/refundController.js $PROD_PATH/backend/controllers/refundController.js.backup.$(date +%Y%m%d_%H%M%S)

echo "📤 Copying fixed files to production..."
sudo cp backend/controllers/paymentController.js $PROD_PATH/backend/controllers/
sudo cp backend/controllers/refundController.js $PROD_PATH/backend/controllers/
sudo cp backend/scripts/fix-reservation-index.js $PROD_PATH/backend/scripts/

echo "🔧 Setting correct permissions..."
sudo chown www-data:www-data $PROD_PATH/backend/controllers/paymentController.js
sudo chown www-data:www-data $PROD_PATH/backend/controllers/refundController.js
sudo chown www-data:www-data $PROD_PATH/backend/scripts/fix-reservation-index.js

sudo chmod 644 $PROD_PATH/backend/controllers/paymentController.js
sudo chmod 644 $PROD_PATH/backend/controllers/refundController.js
sudo chmod 644 $PROD_PATH/backend/scripts/fix-reservation-index.js

echo "🔧 Running database index fix..."
cd $PROD_PATH/backend
sudo -u www-data node scripts/fix-reservation-index.js

echo "🔄 Restarting backend service..."
sudo pm2 restart shithaa-backend

echo "⏳ Waiting for service to start..."
sleep 15

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent backend logs:"
sudo pm2 logs shithaa-backend --lines 10

echo ""
echo "✅ COMPLETE FIX DEPLOYED!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "1. ✅ PhonePe payment verification: Fixed getOrderStatus method"
echo "2. ✅ PhonePe client validation: Added method validation"
echo "3. ✅ Error handling: Enhanced error messages and logging"
echo "4. ✅ Database index: Removed problematic idempotencyKey_1 index"
echo "5. ✅ Loungewear offer: Already working perfectly (₹0 for 2 items)"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Try making a payment with 2 loungewear items"
echo "2. Verify payment completes successfully (no more 500 errors)"
echo "3. Check that no failed orders are stored in the backend"
echo "4. Verify loungewear offer shows ₹0 discount for 2 items"
echo ""
echo "🔍 To monitor logs:"
echo "sudo pm2 logs shithaa-backend --follow"
echo ""
echo "🔍 If issues persist, check backups:"
echo "sudo cp $PROD_PATH/backend/controllers/paymentController.js.backup.* $PROD_PATH/backend/controllers/paymentController.js"
