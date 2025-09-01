#!/bin/bash

echo "🚀 Deploying AGGRESSIVE loungewear offer fix to production..."

PROD_PATH="/var/www/shithaa-ecom"

echo "📂 Creating backups..."
sudo cp $PROD_PATH/backend/controllers/cartController.js $PROD_PATH/backend/controllers/cartController.js.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/frontend/components/cart-context.tsx $PROD_PATH/frontend/components/cart-context.tsx.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/frontend/app/checkout/OrderSummary.tsx $PROD_PATH/frontend/app/checkout/OrderSummary.tsx.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/frontend/app/checkout/CheckoutPage.tsx $PROD_PATH/frontend/app/checkout/CheckoutPage.tsx.backup.$(date +%Y%m%d_%H%M%S)
sudo cp $PROD_PATH/frontend/components/cart-sidebar.tsx $PROD_PATH/frontend/components/cart-sidebar.tsx.backup.$(date +%Y%m%d_%H%M%S)

echo "📤 Copying fixed files to production..."
sudo cp backend/controllers/cartController.js $PROD_PATH/backend/controllers/
sudo cp frontend/components/cart-context.tsx $PROD_PATH/frontend/components/
sudo cp frontend/app/checkout/OrderSummary.tsx $PROD_PATH/frontend/app/checkout/
sudo cp frontend/app/checkout/CheckoutPage.tsx $PROD_PATH/frontend/app/checkout/
sudo cp frontend/components/cart-sidebar.tsx $PROD_PATH/frontend/components/

echo "🔧 Setting correct permissions..."
sudo chown www-data:www-data $PROD_PATH/backend/controllers/cartController.js
sudo chown www-data:www-data $PROD_PATH/frontend/components/cart-context.tsx
sudo chown www-data:www-data $PROD_PATH/frontend/app/checkout/OrderSummary.tsx
sudo chown www-data:www-data $PROD_PATH/frontend/app/checkout/CheckoutPage.tsx
sudo chown www-data:www-data $PROD_PATH/frontend/components/cart-sidebar.tsx

sudo chmod 644 $PROD_PATH/backend/controllers/cartController.js
sudo chmod 644 $PROD_PATH/frontend/components/cart-context.tsx
sudo chmod 644 $PROD_PATH/frontend/app/checkout/OrderSummary.tsx
sudo chmod 644 $PROD_PATH/frontend/app/checkout/CheckoutPage.tsx
sudo chmod 644 $PROD_PATH/frontend/components/cart-sidebar.tsx

echo "🔄 Restarting services..."
sudo pm2 restart shithaa-backend
sudo pm2 restart shithaa-frontend

echo "⏳ Waiting for services to start..."
sleep 15

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent backend logs:"
sudo pm2 logs shithaa-backend --lines 5

echo ""
echo "✅ AGGRESSIVE FIX DEPLOYED!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "1. ✅ Backend: Disabled caching, enhanced logging"
echo "2. ✅ Frontend: Cache clearing, cache-busting"
echo "3. ✅ OrderSummary: Hard check for 3+ items"
echo "4. ✅ CheckoutPage: Force zero discount for < 3 items"
echo "5. ✅ CartSidebar: Hard check for 3+ items"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Clear localStorage: localStorage.clear()"
echo "3. Add exactly 2 loungewear items to cart"
echo "4. Go to checkout page"
echo "5. Verify NO discount is shown (₹0)"
echo ""
echo "🔍 To monitor logs:"
echo "sudo pm2 logs shithaa-backend --follow"
echo ""
echo "🔍 If issues persist, check backups:"
echo "sudo cp $PROD_PATH/backend/controllers/cartController.js.backup.* $PROD_PATH/backend/controllers/cartController.js"
