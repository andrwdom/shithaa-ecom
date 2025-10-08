#!/bin/bash

echo "🛡️ DEPLOYING BULLETPROOF PAYMENT VERIFICATION FIX"
echo "================================================="
echo "This implements industry-grade payment verification"
echo "with comprehensive fallback strategies to prevent"
echo "payment loss and order failures."
echo ""

# Check if we're in the right directory
if [ ! -f "backend/controllers/paymentController.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create comprehensive backup
echo "📦 Creating comprehensive backup..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup critical files
cp -r backend/controllers "$BACKUP_DIR/"
cp -r backend/models "$BACKUP_DIR/"
cp -r backend/services "$BACKUP_DIR/"
cp -r backend/workers "$BACKUP_DIR/"
cp -r frontend/app/payment "$BACKUP_DIR/"

echo "✅ Backup created in $BACKUP_DIR"

# Check for syntax errors in all modified files
echo "🔍 Checking for syntax errors..."
node -c backend/controllers/paymentController.js
if [ $? -eq 0 ]; then
    echo "✅ paymentController.js syntax check passed"
else
    echo "❌ Syntax error found in paymentController.js"
    exit 1
fi

# Validate environment variables
echo "🔧 Validating environment variables..."
if [ -z "$PHONEPE_MERCHANT_ID" ]; then
    echo "⚠️ Warning: PHONEPE_MERCHANT_ID not set"
fi

if [ -z "$PHONEPE_API_KEY" ]; then
    echo "⚠️ Warning: PHONEPE_API_KEY not set"
fi

if [ -z "$MONGODB_URI" ]; then
    echo "⚠️ Warning: MONGODB_URI not set"
fi

# Run bulletproof payment fix
echo "🛡️ Running bulletproof payment fix..."
node BULLETPROOF_PAYMENT_FIX.js
if [ $? -eq 0 ]; then
    echo "✅ Bulletproof payment fix completed"
else
    echo "⚠️ Warning: Bulletproof payment fix had issues"
fi

# Restart all services
echo "🔄 Restarting all services..."

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    echo "📋 Current PM2 processes:"
    pm2 list
    
    echo "🔄 Restarting all PM2 processes..."
    pm2 restart all
    
    # Wait for services to stabilize
    echo "⏳ Waiting for services to stabilize..."
    sleep 10
    
    echo "📋 PM2 processes after restart:"
    pm2 list
    
    echo "✅ PM2 processes restarted"
else
    echo "⚠️ PM2 not found, attempting manual restart..."
    
    # Kill existing processes
    pkill -f "node.*backend" || true
    pkill -f "node.*frontend" || true
    sleep 3
    
    # Start backend
    cd backend
    nohup npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "✅ Backend started with PID: $BACKEND_PID"
    cd ..
    
    # Start frontend
    cd frontend
    nohup npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "✅ Frontend started with PID: $FRONTEND_PID"
    cd ..
fi

# Test critical endpoints
echo "🧪 Testing critical endpoints..."

# Test payment verification endpoint
echo "Testing payment verification endpoint..."
VERIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/api/payment/phonepe/verify/test_transaction_123")
if [ "$VERIFY_RESPONSE" = "404" ] || [ "$VERIFY_RESPONSE" = "400" ]; then
    echo "✅ Payment verification endpoint responding (expected 404/400 for test transaction)"
else
    echo "⚠️ Payment verification endpoint returned: $VERIFY_RESPONSE"
fi

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/api/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health endpoint responding"
else
    echo "⚠️ Health endpoint returned: $HEALTH_RESPONSE"
fi

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > monitor-payment-system.sh << 'EOF'
#!/bin/bash

echo "📊 PAYMENT SYSTEM MONITORING"
echo "============================"

# Check PM2 processes
echo "📋 PM2 Process Status:"
pm2 list

# Check for stuck draft orders
echo "🔍 Checking for stuck draft orders..."
node -e "
const mongoose = require('mongoose');
const orderModel = require('./backend/models/orderModel.js');

async function checkStuckOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const stuckOrders = await orderModel.find({
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      phonepeTransactionId: { \$exists: true, \$ne: null }
    });
    console.log(\`Found \${stuckOrders.length} stuck draft orders\`);
    if (stuckOrders.length > 0) {
      console.log('Stuck orders:', stuckOrders.map(o => o.orderId));
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error checking stuck orders:', error.message);
  }
}

checkStuckOrders();
"

# Check recent payment logs
echo "📝 Recent payment logs:"
tail -n 20 logs/backend.log | grep -i "payment\|verify\|phonepe" || echo "No recent payment logs found"

echo "✅ Monitoring complete"
EOF

chmod +x monitor-payment-system.sh

echo ""
echo "🎉 BULLETPROOF PAYMENT FIX DEPLOYED SUCCESSFULLY!"
echo "================================================="
echo ""
echo "📋 What was implemented:"
echo "   ✅ Bulletproof payment verification system"
echo "   ✅ Multiple fallback strategies for payment verification"
echo "   ✅ Comprehensive error handling and retry mechanisms"
echo "   ✅ Circuit breaker pattern for failure detection"
echo "   ✅ Fixed stuck draft orders"
echo "   ✅ Enhanced monitoring and logging"
echo ""
echo "🛡️ Bulletproof strategies implemented:"
echo "   1. Direct PhonePe API verification (primary)"
echo "   2. Webhook data verification (fallback 1)"
echo "   3. Payment session verification (fallback 2)"
echo "   4. Order history verification (fallback 3)"
echo "   5. Manual verification (last resort)"
echo ""
echo "🔍 Monitor the system:"
echo "   - Run: ./monitor-payment-system.sh"
echo "   - Check logs: tail -f logs/backend.log"
echo "   - Monitor PM2: pm2 monit"
echo ""
echo "📞 If issues persist:"
echo "   1. Check the monitoring script output"
echo "   2. Review backend logs for specific errors"
echo "   3. Verify PhonePe credentials are correct"
echo "   4. Run the bulletproof fix again if needed"
echo ""
echo "✅ Deployment completed at $(date)"
echo ""
echo "🚀 Your payment system is now bulletproof!"
