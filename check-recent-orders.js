const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const orderModel = require('./backend/models/orderModel.js');
const PaymentSession = require('./backend/models/paymentSessionModel.js');
const CheckoutSession = require('./backend/models/CheckoutSession.js');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkRecentOrders = async () => {
  try {
    console.log('🔍 Checking recent orders and payment sessions...\n');
    
    // Check recent orders (last 24 hours)
    const recentOrders = await orderModel.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📊 Found ${recentOrders.length} orders in the last 24 hours:\n`);
    
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId || order._id}`);
      console.log(`   Customer: ${order.customerName || order.userInfo?.name || 'Unknown'}`);
      console.log(`   Email: ${order.email || order.userInfo?.email || 'Unknown'}`);
      console.log(`   Amount: ₹${order.totalAmount || order.total || order.totalPrice || 0}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Order Status: ${order.orderStatus}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Stock Confirmed: ${order.stockConfirmed || false}`);
      console.log(`   Created: ${order.createdAt || order.placedAt}`);
      console.log(`   Items: ${order.cartItems?.length || order.items?.length || 0} items`);
      if (order.cartItems && order.cartItems.length > 0) {
        order.cartItems.forEach(item => {
          console.log(`     - ${item.name} (${item.size}) x${item.quantity} - ₹${item.price}`);
        });
      }
      console.log('   ---');
    });
    
    // Check recent payment sessions
    const recentPaymentSessions = await PaymentSession.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n💳 Found ${recentPaymentSessions.length} payment sessions in the last 24 hours:\n`);
    
    recentPaymentSessions.forEach((session, index) => {
      console.log(`${index + 1}. Session ID: ${session.sessionId}`);
      console.log(`   PhonePe Transaction ID: ${session.phonepeTransactionId}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Amount: ₹${session.orderData?.amount || 0}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Stock Reserved: ${session.stockReserved || false}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log(`   Items: ${session.orderData?.cartItems?.length || 0} items`);
      if (session.orderData?.cartItems && session.orderData.cartItems.length > 0) {
        session.orderData.cartItems.forEach(item => {
          console.log(`     - ${item.name} (${item.size}) x${item.quantity} - ₹${item.price}`);
        });
      }
      console.log('   ---');
    });
    
    // Check recent checkout sessions
    const recentCheckoutSessions = await CheckoutSession.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n🛒 Found ${recentCheckoutSessions.length} checkout sessions in the last 24 hours:\n`);
    
    recentCheckoutSessions.forEach((session, index) => {
      console.log(`${index + 1}. Session ID: ${session.sessionId}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Amount: ₹${session.total || 0}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log(`   Items: ${session.items?.length || 0} items`);
      if (session.items && session.items.length > 0) {
        session.items.forEach(item => {
          console.log(`     - ${item.name} (${item.size}) x${item.quantity} - ₹${item.price}`);
        });
      }
      console.log('   ---');
    });
    
    // Look for specific order with ₹2088
    console.log('\n🔍 Looking for orders with amount ₹2088...\n');
    const targetOrders = await orderModel.find({
      $or: [
        { totalAmount: 2088 },
        { total: 2088 },
        { totalPrice: 2088 }
      ]
    }).sort({ createdAt: -1 });
    
    if (targetOrders.length > 0) {
      console.log(`Found ${targetOrders.length} orders with amount ₹2088:`);
      targetOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order.orderId || order._id}`);
        console.log(`   Payment Status: ${order.paymentStatus}`);
        console.log(`   Order Status: ${order.orderStatus}`);
        console.log(`   Created: ${order.createdAt || order.placedAt}`);
      });
    } else {
      console.log('No orders found with amount ₹2088');
    }
    
  } catch (error) {
    console.error('❌ Error checking orders:', error);
  }
};

const main = async () => {
  await connectDB();
  await checkRecentOrders();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
