const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const productModel = require('./backend/models/productModel.js');
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

const diagnoseAndFix = async () => {
  try {
    console.log('🔍 Diagnosing offer and order issues...\n');
    
    // 1. Check loungewear products and their categories
    console.log('📊 Checking loungewear products...');
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    });
    
    console.log(`Found ${loungewearProducts.length} loungewear products:`);
    loungewearProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - Category: ${product.categorySlug} - Price: ₹${product.price}`);
    });
    
    // 2. Check recent orders (last 2 hours)
    console.log('\n📊 Checking recent orders...');
    const recentOrders = await orderModel.find({
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${recentOrders.length} orders in the last 2 hours:`);
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId || order._id}`);
      console.log(`   Amount: ₹${order.totalAmount || order.total || 0}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Order Status: ${order.orderStatus}`);
      console.log(`   Stock Confirmed: ${order.stockConfirmed || false}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log('   ---');
    });
    
    // 3. Check recent payment sessions
    console.log('\n💳 Checking recent payment sessions...');
    const recentPaymentSessions = await PaymentSession.find({
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${recentPaymentSessions.length} payment sessions in the last 2 hours:`);
    recentPaymentSessions.forEach((session, index) => {
      console.log(`${index + 1}. Session ID: ${session.sessionId}`);
      console.log(`   Amount: ₹${session.orderData?.amount || 0}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Stock Reserved: ${session.stockReserved || false}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log('   ---');
    });
    
    // 4. Check for orders with amount ₹2088
    console.log('\n🔍 Looking for orders with amount ₹2088...');
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
        console.log(`   Stock Confirmed: ${order.stockConfirmed || false}`);
        console.log(`   Created: ${order.createdAt}`);
        console.log(`   Items: ${order.cartItems?.length || order.items?.length || 0}`);
      });
    } else {
      console.log('❌ No orders found with amount ₹2088');
    }
    
    // 5. Check for failed payment sessions
    console.log('\n❌ Checking for failed payment sessions...');
    const failedSessions = await PaymentSession.find({
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    if (failedSessions.length > 0) {
      console.log(`Found ${failedSessions.length} failed payment sessions:`);
      failedSessions.forEach((session, index) => {
        console.log(`${index + 1}. Session ID: ${session.sessionId}`);
        console.log(`   Amount: ₹${session.orderData?.amount || 0}`);
        console.log(`   Error: ${session.error || 'Unknown error'}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ No failed payment sessions found');
    }
    
    // 6. Test the offer calculation
    console.log('\n🧪 Testing offer calculation...');
    const testItems = [
      { name: 'Navy blue with fish print feeding lounge wear', originalPrice: 450, size: 'L' },
      { name: 'Black glitter zipless feeding lounge wear', originalPrice: 450, size: 'XL' },
      { name: 'Purple with flower print feeding lounge wear', originalPrice: 450, size: 'XL' }
    ];
    
    // Mock offer calculation
    const originalTotal = testItems.reduce((sum, item) => sum + item.originalPrice, 0);
    const offerTotal = 1299; // 3 for ₹1299
    const discount = originalTotal - offerTotal;
    
    console.log(`Test scenario: 3 loungewear items @ ₹450 each`);
    console.log(`Original total: ₹${originalTotal}`);
    console.log(`Offer total: ₹${offerTotal}`);
    console.log(`Expected discount: ₹${discount}`);
    console.log(`Should apply offer: ${testItems.length >= 3 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
};

const main = async () => {
  await connectDB();
  await diagnoseAndFix();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
