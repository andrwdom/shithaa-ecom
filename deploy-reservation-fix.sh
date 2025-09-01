#!/bin/bash

echo "🚀 Deploying reservation index fix to production..."

PROD_PATH="/var/www/shithaa-ecom"

echo "📂 Copying fix script to production..."
sudo cp fix-reservation-index.js $PROD_PATH/backend/

echo "🔧 Setting correct permissions..."
sudo chown www-data:www-data $PROD_PATH/backend/fix-reservation-index.js
sudo chmod 644 $PROD_PATH/backend/fix-reservation-index.js

echo "🔧 Running reservation index fix..."
cd $PROD_PATH/backend
sudo -u www-data node fix-reservation-index.js

echo "🔄 Restarting backend service..."
sudo pm2 restart shithaa-backend

echo "⏳ Waiting for service to start..."
sleep 10

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent backend logs:"
sudo pm2 logs shithaa-backend --lines 5

echo ""
echo "✅ RESERVATION INDEX FIX DEPLOYED!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "1. ✅ Removed problematic idempotencyKey_1 index"
echo "2. ✅ Recreated proper reservation indexes"
echo "3. ✅ Fixed null value constraint issue"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Try creating a checkout session with 2 loungewear items"
echo "2. Verify no more 'duplicate key error' occurs"
echo "3. Check that stock reservation works properly"
echo ""
echo "🔍 To monitor logs:"
echo "sudo pm2 logs shithaa-backend --follow"
echo ""
echo "🔍 If issues persist, check the fix script output above"
