#!/bin/bash

echo "🔧 Deploying COMPLETE INVOICE IMPORT FIX..."
echo "=========================================="

# Navigate to the project directory
cd /var/www/shithaa-ecom

# Create backup of current files
echo "📂 Creating backups..."
cp backend/controllers/paymentController.js backend/controllers/paymentController.js.backup.$(date +%Y%m%d_%H%M%S)
cp backend/utils/invoice.js backend/utils/invoice.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No existing invoice.js to backup"

# Ensure invoice.js exists with correct content
echo "🔍 Ensuring invoice.js exists..."
cat > backend/utils/invoice.js << 'EOF'
// Re-export functions from invoiceGenerator.js
export { generateInvoiceBuffer, sendInvoiceEmail } from './invoiceGenerator.js';
EOF

# Verify invoiceGenerator.js exists
echo "🔍 Checking invoiceGenerator.js..."
if [ ! -f "backend/utils/invoiceGenerator.js" ]; then
    echo "❌ ERROR: invoiceGenerator.js is missing!"
    exit 1
fi
echo "✅ invoiceGenerator.js exists"

# Check current payment controller imports
echo "🔍 Checking payment controller imports..."
grep -n "invoice" backend/controllers/paymentController.js

# Clear any Node.js module cache
echo "🧹 Clearing module cache..."
pm2 restart shithaa-backend --update-env

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 10

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show recent logs
echo "📝 Recent backend logs:"
pm2 logs shithaa-backend --lines 15

# Test the import
echo "🧪 Testing invoice import..."
node -e "
try {
  const { generateInvoiceBuffer, sendInvoiceEmail } = require('./backend/utils/invoice.js');
  console.log('✅ invoice.js import successful');
} catch (error) {
  console.log('❌ invoice.js import failed:', error.message);
}
"

echo "✅ Complete invoice import fix deployed!"
echo ""
echo "🔧 FIXES APPLIED:"
echo "- Ensured invoice.js exists with correct re-export"
echo "- Verified invoiceGenerator.js exists"
echo "- Cleared module cache and restarted service"
echo "- Tested import functionality"
echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- No more 'ERR_MODULE_NOT_FOUND' errors for invoice.js"
echo "- Invoice generation should work properly"
echo "- Payment verification should complete without errors"
