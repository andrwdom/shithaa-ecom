import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentSession from './models/paymentSessionModel.js';
import orderModel from './models/orderModel.js';
import CheckoutSession from './models/CheckoutSession.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const investigateSep26Payment = async () => {
  try {
    console.log('🔍 INVESTIGATING PAYMENT ON SEPTEMBER 26, 2025 9:50 PM\n');
    
    // Target time: September 26, 2025 9:50 PM IST
    const targetDate = new Date('2025-09-26T21:50:00.000Z'); // 9:50 PM IST = 4:20 PM UTC
    const startTime = new Date('2025-09-26T21:45:00.000Z'); // 5 minutes before
    const endTime = new Date('2025-09-26T21:55:00.000Z'); // 5 minutes after
    
    console.log(`Target time: ${targetDate.toISOString()}`);
    console.log(`Search window: ${startTime.toISOString()} to ${endTime.toISOString()}\n`);
    
    // 1. Search for payment sessions around that time
    console.log('📊 PAYMENT SESSIONS AROUND TARGET TIME:');
    const paymentSessions = await PaymentSession.find({
      createdAt: {
        $gte: startTime,
        $lte: endTime
      }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${paymentSessions.length} payment sessions in time window`);
    
    paymentSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Payment Session ID: ${session._id}`);
      console.log(`   PhonePe Transaction ID: ${session.phonepeTransactionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Order ID: ${session.orderId || 'NOT SET'}`);
      console.log(`   Has orderPayload: ${!!session.orderPayload}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log(`   Updated: ${session.updatedAt}`);
      
      if (session.orderPayload) {
        console.log(`   Order Payload Amount: ₹${session.orderPayload.total || session.orderPayload.totalAmount || 'N/A'}`);
        console.log(`   Order Payload Items: ${session.orderPayload.cartItems?.length || session.orderPayload.items?.length || 0}`);
        console.log(`   User Info: ${JSON.stringify(session.orderPayload.userInfo || session.orderPayload.shippingInfo || {})}`);
      }
    });
    
    // 2. Search for orders around that time
    console.log('\n📊 ORDERS AROUND TARGET TIME:');
    const orders = await orderModel.find({
      $or: [
        { createdAt: { $gte: startTime, $lte: endTime } },
        { placedAt: { $gte: startTime, $lte: endTime } },
        { paidAt: { $gte: startTime, $lte: endTime } }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${orders.length} orders in time window`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ID: ${order.orderId || order._id}`);
      console.log(`   PhonePe Transaction ID: ${order.phonepeTransactionId || 'NOT SET'}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Order Status: ${order.orderStatus}`);
      console.log(`   Total Amount: ₹${order.total || order.totalAmount || 'N/A'}`);
      console.log(`   User Email: ${order.userInfo?.email || order.email || 'N/A'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Placed: ${order.placedAt}`);
      console.log(`   Paid At: ${order.paidAt || 'N/A'}`);
    });
    
    // 3. Search for checkout sessions around that time
    console.log('\n📊 CHECKOUT SESSIONS AROUND TARGET TIME:');
    const checkoutSessions = await CheckoutSession.find({
      createdAt: {
        $gte: startTime,
        $lte: endTime
      }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${checkoutSessions.length} checkout sessions in time window`);
    
    checkoutSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. Checkout Session: ${session.sessionId}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Items: ${session.items?.length || 0}`);
      console.log(`   Total: ₹${session.total || 'N/A'}`);
      console.log(`   Created: ${session.createdAt}`);
    });
    
    // 4. Check for successful payments without orders
    console.log('\n🔍 SUCCESSFUL PAYMENTS WITHOUT ORDERS:');
    const successfulSessions = paymentSessions.filter(session => session.status === 'success');
    
    for (const session of successfulSessions) {
      const correspondingOrder = await orderModel.findOne({
        phonepeTransactionId: session.phonepeTransactionId
      });
      
      if (!correspondingOrder) {
        console.log(`\n⚠️  MISSING ORDER for successful payment:`);
        console.log(`   Payment Session: ${session._id}`);
        console.log(`   PhonePe Transaction: ${session.phonepeTransactionId}`);
        console.log(`   User: ${session.userEmail}`);
        console.log(`   Amount: ₹${session.orderData?.amount || session.orderPayload?.total || 'N/A'}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Has orderPayload: ${!!session.orderPayload}`);
        
        if (session.orderPayload) {
          console.log(`   Order Payload Details:`);
          console.log(`     - User Info: ${JSON.stringify(session.orderPayload.userInfo || {})}`);
          console.log(`     - Shipping Info: ${JSON.stringify(session.orderPayload.shippingInfo || {})}`);
          console.log(`     - Cart Items: ${JSON.stringify(session.orderPayload.cartItems || [])}`);
          console.log(`     - Total: ₹${session.orderPayload.total || 'N/A'}`);
        }
      }
    }
    
    // 5. Search for any activity in a broader time window (1 hour before and after)
    console.log('\n🔍 BROADER TIME WINDOW SEARCH (1 hour before and after):');
    const broadStartTime = new Date('2025-09-26T20:50:00.000Z'); // 1 hour before
    const broadEndTime = new Date('2025-09-26T22:50:00.000Z'); // 1 hour after
    
    const broadPaymentSessions = await PaymentSession.find({
      createdAt: {
        $gte: broadStartTime,
        $lte: broadEndTime
      }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${broadPaymentSessions.length} payment sessions in broader window`);
    
    const broadOrders = await orderModel.find({
      $or: [
        { createdAt: { $gte: broadStartTime, $lte: broadEndTime } },
        { placedAt: { $gte: broadStartTime, $lte: broadEndTime } },
        { paidAt: { $gte: broadStartTime, $lte: broadEndTime } }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${broadOrders.length} orders in broader window`);
    
    // 6. Check for any webhook data around that time
    console.log('\n🔍 CHECKING FOR WEBHOOK DATA:');
    try {
      const RawWebhook = (await import('./models/RawWebhook.js')).default;
      const webhooks = await RawWebhook.find({
        createdAt: {
          $gte: startTime,
          $lte: endTime
        }
      }).sort({ createdAt: -1 });
      
      console.log(`Found ${webhooks.length} webhooks in time window`);
      
      webhooks.forEach((webhook, index) => {
        console.log(`\n${index + 1}. Webhook ID: ${webhook._id}`);
        console.log(`   Provider: ${webhook.provider}`);
        console.log(`   Processed: ${webhook.processed}`);
        console.log(`   Created: ${webhook.createdAt}`);
        console.log(`   Raw Data Preview: ${JSON.stringify(webhook.raw).substring(0, 200)}...`);
      });
    } catch (error) {
      console.log('Could not check webhook data:', error.message);
    }
    
    console.log('\n✅ Investigation complete!');
    
  } catch (error) {
    console.error('❌ Investigation error:', error);
  }
};

const main = async () => {
  await connectDB();
  await investigateSep26Payment();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
};

main().catch(console.error);
