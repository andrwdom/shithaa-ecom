#!/bin/bash

echo "🔧 Fixing loungewear offer logic on production..."

PROD_PATH="/var/www/shithaa-ecom"
CART_CONTROLLER="$PROD_PATH/backend/controllers/cartController.js"

echo "📂 Creating backup..."
sudo cp $CART_CONTROLLER $CART_CONTROLLER.backup.$(date +%Y%m%d_%H%M%S)

echo "🔍 Current loungewear offer logic check..."
if grep -q "if (loungewearCategoryItems.length < 3)" $CART_CONTROLLER; then
    echo "✅ Logic fix is already present"
else
    echo "❌ Logic fix is missing - will add it"
fi

echo ""
echo "🔧 Adding enhanced logging..."
# Add debug logging to the calculateLoungewearCategoryOffer function
sudo sed -i 's/function calculateLoungewearCategoryOffer(loungewearCategoryItems) {/function calculateLoungewearCategoryOffer(loungewearCategoryItems) {\n    console.log(`🔧 CRITICAL DEBUG: calculateLoungewearCategoryOffer called with ${loungewearCategoryItems.length} items`);\n    console.log(`🔧 CRITICAL DEBUG: Items:`, loungewearCategoryItems.map(item => `${item.name} (${item.size}) - ₹${item.originalPrice}`));/' $CART_CONTROLLER

echo "🔄 Restarting backend..."
sudo pm2 restart shithaa-backend

echo "⏳ Waiting for restart..."
sleep 5

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent logs:"
sudo pm2 logs shithaa-backend --lines 5

echo ""
echo "✅ Fix completed!"
echo ""
echo "🧪 TESTING:"
echo "1. Add 2 loungewear items to cart"
echo "2. Go to checkout"
echo "3. Check logs for debug messages: sudo pm2 logs shithaa-backend --lines 20"
echo "4. Verify discount is ₹0"
