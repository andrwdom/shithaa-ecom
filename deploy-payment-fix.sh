#!/bin/bash

echo "🚀 Deploying PhonePe payment verification fix to production..."

PROD_PATH="/var/www/shithaa-ecom"

echo "📂 Creating backups..."
sudo cp $PROD_PATH/backend/controllers/paymentController.js $PROD_PATH/backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/backend/controllers/refundController.js $PROD_PATH/backend/controllers/refundController.js.backup.$(date +%Y%m%d_%H%M%S)

echo "📤 Copying fixed files to production..."
sudo cp backend/controllers/paymentController.js $PROD_PATH/backend/controllers/
sudo cp backend/controllers/refundController.js $PROD_PATH/backend/controllers/

echo "🔧 Setting correct permissions..."
sudo chown www-data:www-data $PROD_PATH/backend/controllers/paymentController.js
sudo chown www-data:www-data $PROD_PATH/backend/controllers/refundController.js

sudo chmod 644 $PROD_PATH/backend/controllers/paymentController.js
sudo chmod 644 $PROD_PATH/backend/controllers/refundController.js

echo "🔄 Restarting backend service..."
sudo pm2 restart shithaa-backend

echo "⏳ Waiting for service to start..."
sleep 10

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent backend logs:"
sudo pm2 logs shithaa-backend --lines 10

echo ""
echo "✅ PAYMENT VERIFICATION FIX DEPLOYED!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "1. ✅ Payment verification: Added null check for PhonePe client"
echo "2. ✅ Refund controller: Added credential validation"
echo "3. ✅ Error handling: Proper error responses for missing credentials"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Try making a payment with 2 loungewear items"
echo "2. Verify payment completes successfully"
echo "3. Check that no failed orders are stored"
echo ""
echo "🔍 To monitor logs:"
echo "sudo pm2 logs shithaa-backend --follow"
echo ""
echo "🔍 If issues persist, check backups:"
echo "sudo cp $PROD_PATH/backend/controllers/paymentController.js.backup.* $PROD_PATH/backend/controllers/paymentController.js"
