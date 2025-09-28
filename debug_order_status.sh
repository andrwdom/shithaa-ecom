#!/bin/bash

echo "🔍 DEBUGGING ORDER STATUS ISSUES"
echo "================================="

# Get the order ID from user input
read -p "Enter the order ID to debug: " ORDER_ID

if [ -z "$ORDER_ID" ]; then
    echo "❌ No order ID provided. Exiting."
    exit 1
fi

echo "🔍 Debugging Order ID: $ORDER_ID"
echo ""

# 1. Check order in database
echo "1️⃣ CHECKING ORDER IN DATABASE"
echo "=============================="
cd /var/www/shithaa-ecom
node -e "
const mongoose = require('mongoose');
const Order = require('./backend/models/Order');

async function checkOrder() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const order = await Order.findById('$ORDER_ID');
        if (order) {
            console.log('📋 ORDER FOUND:');
            console.log('ID:', order._id);
            console.log('Status:', order.status);
            console.log('Payment Status:', order.paymentStatus);
            console.log('Payment Method:', order.paymentMethod);
            console.log('Payment ID:', order.paymentId);
            console.log('Created:', order.createdAt);
            console.log('Updated:', order.updatedAt);
            console.log('Total Amount:', order.totalAmount);
            console.log('Customer:', order.customerName, order.customerEmail);
            console.log('PhonePe Payment ID:', order.phonepePaymentId);
            console.log('PhonePe Transaction ID:', order.phonepeTransactionId);
            console.log('PhonePe Status:', order.phonepeStatus);
            console.log('PhonePe Response:', JSON.stringify(order.phonepeResponse, null, 2));
        } else {
            console.log('❌ Order not found in database');
        }
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        process.exit(0);
    }
}
checkOrder();
"

echo ""

# 2. Check PM2 logs for this order
echo "2️⃣ CHECKING PM2 LOGS FOR ORDER $ORDER_ID"
echo "=========================================="
pm2 logs --lines 100 | grep -i "$ORDER_ID" || echo "No logs found for this order ID"

echo ""

# 3. Check recent payment callbacks
echo "3️⃣ CHECKING RECENT PAYMENT CALLBACKS"
echo "====================================="
pm2 logs --lines 200 | grep -i "callback\|payment\|phonepe" | tail -20

echo ""

# 4. Check webhook processor logs
echo "4️⃣ CHECKING WEBHOOK PROCESSOR LOGS"
echo "==================================="
pm2 logs shithaa-webhook-processor --lines 50

echo ""

# 5. Check backend logs for payment processing
echo "5️⃣ CHECKING BACKEND PAYMENT LOGS"
echo "================================="
pm2 logs shithaa-backend --lines 100 | grep -i "payment\|phonepe\|callback" | tail -20

echo ""

# 6. Check if there are any failed payment updates
echo "6️⃣ CHECKING FOR FAILED PAYMENT UPDATES"
echo "======================================="
cd /var/www/shithaa-ecom
node -e "
const mongoose = require('mongoose');
const Order = require('./backend/models/Order');

async function checkFailedUpdates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const orders = await Order.find({
            status: 'DRAFT',
            paymentStatus: 'PENDING',
            createdAt: { \$gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).sort({ createdAt: -1 }).limit(10);
        
        console.log('📋 RECENT DRAFT ORDERS (last 24h):');
        orders.forEach(order => {
            console.log(\`- \${order._id}: \${order.status}/\${order.paymentStatus} - \${order.customerEmail} - \${order.createdAt}\`);
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}
checkFailedUpdates();
"

echo ""

# 7. Check PhonePe webhook endpoint logs
echo "7️⃣ CHECKING PHONEPE WEBHOOK ENDPOINT"
echo "===================================="
pm2 logs shithaa-backend --lines 200 | grep -i "webhook\|phonepe.*callback" | tail -10

echo ""

# 8. Check for any error patterns
echo "8️⃣ CHECKING FOR ERROR PATTERNS"
echo "==============================="
pm2 logs --lines 500 | grep -i "error\|failed\|exception" | grep -i "payment\|order" | tail -10

echo ""

# 9. Check system resources
echo "9️⃣ CHECKING SYSTEM RESOURCES"
echo "============================="
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h
echo ""
echo "PM2 status:"
pm2 status

echo ""

# 10. Check if there are any stuck processes
echo "🔟 CHECKING FOR STUCK PROCESSES"
echo "==============================="
ps aux | grep -i "node\|pm2" | grep -v grep

echo ""
echo "✅ DEBUGGING COMPLETE!"
echo "====================="
echo "If you found the issue, please share the relevant logs."
echo "If not, run this script again with a different order ID."
