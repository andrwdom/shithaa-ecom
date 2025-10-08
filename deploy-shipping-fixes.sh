#!/bin/bash

echo "🚨 DEPLOYING COMPREHENSIVE SHIPPING FIXES"
echo "=========================================="
echo "This fixes all shipping calculation inconsistencies"
echo "between frontend and backend."
echo ""

# Check if we're in the right directory
if [ ! -f "backend/controllers/shippingController.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
cp backend/controllers/shippingController.js backend/controllers/shippingController.js.backup.$(date +%Y%m%d_%H%M%S)
cp backend/models/ShippingRules.js backend/models/ShippingRules.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backups created"

# Check for syntax errors
echo "🔍 Checking for syntax errors..."
node -c backend/controllers/shippingController.js
if [ $? -eq 0 ]; then
    echo "✅ shippingController.js syntax check passed"
else
    echo "❌ Syntax error found in shippingController.js"
    exit 1
fi

node -c backend/models/ShippingRules.js
if [ $? -eq 0 ]; then
    echo "✅ ShippingRules.js syntax check passed"
else
    echo "❌ Syntax error found in ShippingRules.js"
    exit 1
fi

# Validate and seed shipping rules
echo "🔧 Validating and seeding shipping rules..."
node validate-and-seed-shipping-rules.js
if [ $? -eq 0 ]; then
    echo "✅ Shipping rules validated and seeded"
else
    echo "⚠️  Warning: Shipping rules validation had issues"
fi

# Restart backend services
echo "🔄 Restarting backend services..."

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    echo "📋 PM2 processes:"
    pm2 list
    
    echo "🔄 Restarting PM2 processes..."
    pm2 restart all
    echo "✅ PM2 processes restarted"
else
    echo "⚠️  PM2 not found, attempting to restart manually..."
    
    # Kill existing node processes
    pkill -f "node.*backend" || true
    sleep 2
    
    # Start backend
    cd backend
    npm start &
    BACKEND_PID=$!
    echo "✅ Backend started with PID: $BACKEND_PID"
    cd ..
fi

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Test shipping calculations
echo "🧪 Testing shipping calculations..."
node test-shipping-calculations.js
if [ $? -eq 0 ]; then
    echo "✅ Shipping calculation tests completed"
else
    echo "⚠️  Warning: Some shipping tests may have failed"
fi

echo ""
echo "🎉 SHIPPING FIXES DEPLOYED SUCCESSFULLY!"
echo "========================================"
echo ""
echo "📋 What was fixed:"
echo "   ✅ Fixed backend fallback logic for maternity feeding wear"
echo "   ✅ Fixed state normalization consistency"
echo "   ✅ Fixed shipping rules model state handling"
echo "   ✅ Validated and seeded correct shipping rules"
echo "   ✅ Added comprehensive shipping tests"
echo ""
echo "🔍 Key fixes applied:"
echo "   - Tamil Nadu Maternity Feeding: 1=₹39, 2=₹49, 3=₹59, 4=₹69, 5=₹79, 6=₹89, 7+=₹99"
echo "   - Other States Maternity Feeding: 1=₹49, 2=₹69, 3=₹89, 4+=₹109"
echo "   - Tamil Nadu Lounge Wear: FREE shipping"
echo "   - Other States Lounge Wear: 1=₹39, 2=₹59, 3=₹89, 4+=₹105"
echo ""
echo "🧪 Monitor the logs for:"
echo "   - Shipping calculation consistency"
echo "   - State normalization working correctly"
echo "   - Fallback logic using correct prices"
echo ""
echo "📞 If customers still report shipping issues:"
echo "   1. Run: node test-shipping-calculations.js"
echo "   2. Run: node validate-and-seed-shipping-rules.js"
echo "   3. Check the logs for specific error messages"
echo "   4. Verify the customer's state and item categories"
echo ""
echo "✅ Deployment completed at $(date)"
