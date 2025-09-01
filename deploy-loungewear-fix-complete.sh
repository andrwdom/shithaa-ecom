#!/bin/bash

echo "🚀 Deploying complete loungewear offer fix to production..."

PROD_PATH="/var/www/shithaa-ecom"

echo "📂 Creating backups..."
sudo cp $PROD_PATH/backend/controllers/cartController.js $PROD_PATH/backend/controllers/cartController.js.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/frontend/components/cart-context.tsx $PROD_PATH/frontend/components/cart-context.tsx.backup.$(date +%Y%m%d_%H%M%S)

echo "📤 Copying fixed files to production..."
sudo cp backend/controllers/cartController.js $PROD_PATH/backend/controllers/
sudo cp frontend/components/cart-context.tsx $PROD_PATH/frontend/components/

echo "🔧 Setting correct permissions..."
sudo chown www-data:www-data $PROD_PATH/backend/controllers/cartController.js
sudo chown www-data:www-data $PROD_PATH/frontend/components/cart-context.tsx
sudo chmod 644 $PROD_PATH/backend/controllers/cartController.js
sudo chmod 644 $PROD_PATH/frontend/components/cart-context.tsx

echo "🔄 Restarting services..."
sudo pm2 restart shithaa-backend
sudo pm2 restart shithaa-frontend

echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent backend logs:"
sudo pm2 logs shithaa-backend --lines 5

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Clear your browser cache (Ctrl+Shift+R)"
echo "2. Add exactly 2 loungewear items to cart"
echo "3. Go to checkout page"
echo "4. Verify discount shows ₹0 (not ₹2)"
echo ""
echo "🔍 To monitor logs:"
echo "sudo pm2 logs shithaa-backend --follow"
echo ""
echo "🔍 If issues persist, check backups:"
echo "sudo cp $PROD_PATH/backend/controllers/cartController.js.backup.* $PROD_PATH/backend/controllers/cartController.js"
