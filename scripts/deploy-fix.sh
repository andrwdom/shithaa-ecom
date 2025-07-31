#!/bin/bash

# Quick deployment script to fix the product page error
echo "🚀 Deploying Product Page Fix"
echo "============================="

FRONTEND_DIR="/var/www/shithaa-ecom/frontend"

# Step 1: Navigate to frontend directory
echo "1. Navigating to frontend directory..."
cd $FRONTEND_DIR || {
    echo "❌ Failed to navigate to $FRONTEND_DIR"
    exit 1
}

# Step 2: Pull latest changes
echo ""
echo "2. Pulling latest changes..."
git pull origin main

# Step 3: Install dependencies (in case there are new ones)
echo ""
echo "3. Installing dependencies..."
npm install

# Step 4: Build the application
echo ""
echo "4. Building Next.js application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"

# Step 5: Fix permissions
echo ""
echo "5. Fixing file permissions..."
sudo chown -R www-data:www-data .next
sudo chmod -R 755 .next

# Step 6: Restart PM2 processes
echo ""
echo "6. Restarting PM2 processes..."
pm2 restart all

# Step 7: Check PM2 status
echo ""
echo "7. Checking PM2 status..."
pm2 status

# Step 8: Test the application
echo ""
echo "8. Testing the application..."
sleep 3

# Test homepage
echo "Testing homepage..."
HOMEPAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://shithaa.in)
if [ "$HOMEPAGE_STATUS" = "200" ]; then
    echo "✅ Homepage is working (Status: $HOMEPAGE_STATUS)"
else
    echo "⚠️  Homepage status: $HOMEPAGE_STATUS"
fi

# Test API
echo "Testing API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://shithaa.in/api/products?limit=1)
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API is working (Status: $API_STATUS)"
else
    echo "⚠️  API status: $API_STATUS"
fi

# Test a specific product page
echo "Testing product page..."
PRODUCT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://shithaa.in/product/687fb48c50f181c782d8207d)
if [ "$PRODUCT_STATUS" = "200" ]; then
    echo "✅ Product page is working (Status: $PRODUCT_STATUS)"
else
    echo "⚠️  Product page status: $PRODUCT_STATUS"
fi

echo ""
echo "🎉 Deployment completed!"
echo "======================="
echo "Please test the following:"
echo "1. Visit https://shithaa.in"
echo "2. Click on any product"
echo "3. Check browser console for errors"
echo ""
echo "If issues persist:"
echo "- Check PM2 logs: pm2 logs"
echo "- Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Run diagnostic: ./scripts/debug-product-page.sh"
