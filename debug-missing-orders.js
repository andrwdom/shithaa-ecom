const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PaymentSession = require('./backend/models/paymentSessionModel.js').default;
const orderModel = require('./backend/models/orderModel.js').default;
const CheckoutSession = require('./backend/models/CheckoutSession.js').default;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const debugMissingOrders = async () => {
  try {
    console.log('🔍 DEBUGGING MISSING ORDERS ISSUE\n');
    
    // 1. Check all payment sessions
    console.log('📊 PAYMENT SESSIONS ANALYSIS:');
    const paymentSessions = await PaymentSession.find({}).sort({ createdAt: -1 });
    console.log(`Total payment sessions: ${paymentSessions.length}`);
    
    paymentSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Payment Session ID: ${session._id}`);
      console.log(`   PhonePe Transaction ID: ${session.phonepeTransactionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Order ID: ${session.orderId || 'NOT SET'}`);
      console.log(`   Has orderPayload: ${!!session.orderPayload}`);
      console.log(`   Created: ${session.createdAt}`);
      
      if (session.orderPayload) {
        console.log(`   Order Payload Amount: ₹${session.orderPayload.total || session.orderPayload.totalAmount || 'N/A'}`);
        console.log(`   Order Payload Items: ${session.orderPayload.cartItems?.length || session.orderPayload.items?.length || 0}`);
      } else {
        console.log('   ⚠️  MISSING ORDER PAYLOAD!');
      }
    });
    
    // 2. Check all orders
    console.log('\n📊 ORDERS ANALYSIS:');
    const orders = await orderModel.find({}).sort({ createdAt: -1 });
    console.log(`Total orders: ${orders.length}`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ID: ${order.orderId || order._id}`);
      console.log(`   PhonePe Transaction ID: ${order.phonepeTransactionId || 'NOT SET'}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Order Status: ${order.orderStatus}`);
      console.log(`   Total Amount: ₹${order.total || order.totalAmount || 'N/A'}`);
      console.log(`   User Email: ${order.userInfo?.email || order.email || 'N/A'}`);
      console.log(`   Created: ${order.createdAt || order.placedAt}`);
    });
    
    // 3. Find payment sessions without corresponding orders
    console.log('\n🔍 MISSING ORDERS ANALYSIS:');
    const sessionsWithoutOrders = [];
    
    for (const session of paymentSessions) {
      if (session.status === 'success' || session.status === 'pending') {
        const correspondingOrder = await orderModel.findOne({
          phonepeTransactionId: session.phonepeTransactionId
        });
        
        if (!correspondingOrder) {
          sessionsWithoutOrders.push(session);
        }
      }
    }
    
    console.log(`\nFound ${sessionsWithoutOrders.length} payment sessions without corresponding orders:`);
    
    sessionsWithoutOrders.forEach((session, index) => {
      console.log(`\n${index + 1}. MISSING ORDER for Payment Session: ${session._id}`);
      console.log(`   PhonePe Transaction ID: ${session.phonepeTransactionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Has orderPayload: ${!!session.orderPayload}`);
      console.log(`   Created: ${session.createdAt}`);
      
      if (session.orderPayload) {
        console.log(`   Order Payload Amount: ₹${session.orderPayload.total || session.orderPayload.totalAmount || 'N/A'}`);
        console.log(`   Order Payload Items: ${session.orderPayload.cartItems?.length || session.orderPayload.items?.length || 0}`);
        console.log('   ✅ This session CAN be recovered by creating order from orderPayload');
      } else {
        console.log('   ❌ This session CANNOT be recovered - missing orderPayload');
      }
    });
    
    // 4. Check for recent successful payments without orders
    console.log('\n🔍 RECENT SUCCESSFUL PAYMENTS WITHOUT ORDERS:');
    const recentSessions = paymentSessions.filter(session => 
      session.status === 'success' && 
      new Date(session.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    );
    
    for (const session of recentSessions) {
      const order = await orderModel.findOne({
        phonepeTransactionId: session.phonepeTransactionId
      });
      
      if (!order) {
        console.log(`\n⚠️  RECENT MISSING ORDER:`);
        console.log(`   Payment Session: ${session._id}`);
        console.log(`   PhonePe Transaction: ${session.phonepeTransactionId}`);
        console.log(`   User: ${session.userEmail}`);
        console.log(`   Amount: ₹${session.orderData?.amount || 'N/A'}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Has orderPayload: ${!!session.orderPayload}`);
      }
    }
    
    // 5. Check checkout sessions
    console.log('\n📊 CHECKOUT SESSIONS ANALYSIS:');
    const checkoutSessions = await CheckoutSession.find({}).sort({ createdAt: -1 });
    console.log(`Total checkout sessions: ${checkoutSessions.length}`);
    
    const recentCheckoutSessions = checkoutSessions.filter(session => 
      new Date(session.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    console.log(`Recent checkout sessions (last 7 days): ${recentCheckoutSessions.length}`);
    
    recentCheckoutSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Checkout Session: ${session.sessionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Items: ${session.items?.length || 0}`);
      console.log(`   Total: ₹${session.total || 'N/A'}`);
      console.log(`   Created: ${session.createdAt}`);
    });
    
    console.log('\n✅ Debug analysis complete!');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

const main = async () => {
  await connectDB();
  await debugMissingOrders();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
};

main().catch(console.error);
