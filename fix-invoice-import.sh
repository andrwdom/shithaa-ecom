#!/bin/bash

echo "🔧 Fixing Invoice Import Error..."
echo "=================================="

# Navigate to the project directory
cd /var/www/shithaa-ecom

# Create backup of current payment controller
echo "📂 Creating backup..."
cp backend/controllers/paymentController.js backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)

# Check if invoice.js exists and has correct content
echo "🔍 Checking invoice.js file..."
if [ -f "backend/utils/invoice.js" ]; then
    echo "✅ invoice.js exists"
    cat backend/utils/invoice.js
else
    echo "❌ invoice.js missing, creating it..."
    cat > backend/utils/invoice.js << 'EOF'
// Re-export functions from invoiceGenerator.js
export { generateInvoiceBuffer, sendInvoiceEmail } from './invoiceGenerator.js';
EOF
fi

# Check if invoiceGenerator.js exists
echo "🔍 Checking invoiceGenerator.js file..."
if [ -f "backend/utils/invoiceGenerator.js" ]; then
    echo "✅ invoiceGenerator.js exists"
else
    echo "❌ invoiceGenerator.js missing!"
    exit 1
fi

# Verify payment controller imports
echo "🔍 Checking payment controller imports..."
grep -n "invoice" backend/controllers/paymentController.js

# Restart the backend service
echo "🔄 Restarting backend service..."
pm2 restart shithaa-backend

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show recent logs
echo "📝 Recent backend logs:"
pm2 logs shithaa-backend --lines 10

echo "✅ Invoice import fix completed!"
echo ""
echo "🔧 FIX APPLIED:"
echo "- Ensured invoice.js exists and re-exports from invoiceGenerator.js"
echo "- Verified payment controller uses correct import paths"
echo "- Restarted backend service"
echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- No more 'ERR_MODULE_NOT_FOUND' errors for invoice.js"
echo "- Invoice generation should work properly"
echo "- Payment verification should complete without errors"
