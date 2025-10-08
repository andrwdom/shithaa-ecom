#!/bin/bash

echo "🚨 DEPLOYING CRITICAL PHONEPE SDK FIX"
echo "======================================"
echo "This fixes the HTTP 500 error preventing payments from starting"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/controllers/paymentController.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
BACKUP_FILE="backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)"
cp backend/controllers/paymentController.js "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Check for syntax errors
echo "🔍 Checking for syntax errors..."
node -c backend/controllers/paymentController.js
if [ $? -eq 0 ]; then
    echo "✅ Syntax check passed"
else
    echo "❌ Syntax error found"
    exit 1
fi

# Restart backend service
echo "🔄 Restarting backend service..."
pm2 restart shithaa-backend

# Wait for service to stabilize
echo "⏳ Waiting for service to stabilize..."
sleep 5

# Check if service is running
pm2 list | grep shithaa-backend

echo ""
echo "🎉 PHONEPE SDK FIX DEPLOYED!"
echo "============================"
echo ""
echo "📋 What was fixed:"
echo "   ✅ Fixed PhonePe SDK method call (phonepeClient.pay() → phonePeSDK.pay())"
echo "   ✅ Using correct SDK wrapper with proper initialization"
echo "   ✅ Fixed response handling for SDK wrapper"
echo ""
echo "🧪 Try making a purchase now - it should work!"
echo ""
echo "✅ Deployment completed at $(date)"
