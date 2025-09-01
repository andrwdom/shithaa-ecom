#!/bin/bash

echo "🔍 Checking production server status..."

PROD_PATH="/var/www/shithaa-ecom"

echo ""
echo "📊 PM2 Status:"
sudo pm2 status

echo ""
echo "📝 Recent Error Logs (last 15 lines):"
sudo tail -15 $PROD_PATH/backend/logs/backend-err-12.log

echo ""
echo "📝 Recent Output Logs (last 10 lines):"
sudo tail -10 $PROD_PATH/backend/logs/backend-out-12.log

echo ""
echo "🔧 Syntax Check on Production cartController.js:"
sudo node -c $PROD_PATH/backend/controllers/cartController.js
if [ $? -eq 0 ]; then
    echo "✅ No syntax errors detected"
else
    echo "❌ Syntax errors found!"
fi

echo ""
echo "📅 Last Modified Time of cartController.js:"
sudo ls -la $PROD_PATH/backend/controllers/cartController.js

echo ""
echo "💡 NEXT STEPS:"
echo "1. If syntax errors exist, run: bash deploy-loungewear-fix.sh"
echo "2. If PM2 is not running, restart: sudo pm2 restart shithaa"
echo "3. Test the loungewear offer with 2 items"
