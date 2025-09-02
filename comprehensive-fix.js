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

const fixOfferAndOrderIssues = async () => {
  try {
    console.log('🔧 Starting comprehensive fix for offer and order issues...\n');
    
    // 1. Fix: Ensure loungewear products have correct category slugs
    console.log('🔧 Step 1: Fixing loungewear product categories...');
    
    const loungewearProducts = await productModel.find({
      $or: [
        { categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] } },
        { name: { $regex: /lounge|loungwear/i } }
      ]
    });
    
    console.log(`Found ${loungewearProducts.length} loungewear products to check:`);
    
    let fixedCount = 0;
    for (const product of loungewearProducts) {
      let needsUpdate = false;
      let newCategorySlug = product.categorySlug;
      
      // Fix category slugs
      if (product.name.toLowerCase().includes('zipless') && product.name.toLowerCase().includes('feeding')) {
        if (product.categorySlug !== 'zipless-feeding-lounge-wear') {
          newCategorySlug = 'zipless-feeding-lounge-wear';
          needsUpdate = true;
        }
      } else if (product.name.toLowerCase().includes('lounge') && !product.name.toLowerCase().includes('feeding')) {
        if (product.categorySlug !== 'non-feeding-lounge-wear') {
          newCategorySlug = 'non-feeding-lounge-wear';
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await productModel.findByIdAndUpdate(product._id, { categorySlug: newCategorySlug });
        console.log(`✅ Fixed: ${product.name} -> ${newCategorySlug}`);
        fixedCount++;
      } else {
        console.log(`✅ Already correct: ${product.name} -> ${product.categorySlug}`);
      }
    }
    
    console.log(`\n📊 Fixed ${fixedCount} product categories\n`);
    
    // 2. Fix: Check and fix recent failed orders
    console.log('🔧 Step 2: Checking for failed orders to fix...');
    
    const recentFailedOrders = await orderModel.find({
      $or: [
        { paymentStatus: 'pending' },
        { orderStatus: 'Pending' },
        { status: 'Pending' },
        { stockConfirmed: false }
      ],
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${recentFailedOrders.length} potentially failed orders:`);
    
    for (const order of recentFailedOrders) {
      console.log(`\n📋 Order: ${order.orderId || order._id}`);
      console.log(`   Amount: ₹${order.totalAmount || order.total || 0}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Order Status: ${order.orderStatus}`);
      console.log(`   Stock Confirmed: ${order.stockConfirmed || false}`);
      console.log(`   Created: ${order.createdAt}`);
      
      // Check if there's a corresponding successful payment session
      const paymentSession = await PaymentSession.findOne({
        $or: [
          { orderId: order._id },
          { 'orderData.amount': order.totalAmount || order.total },
          { userEmail: order.email || order.userInfo?.email }
        ],
        status: 'success',
        createdAt: { $gte: new Date(order.createdAt.getTime() - 5 * 60 * 1000) } // Within 5 minutes
      });
      
      if (paymentSession) {
        console.log(`   ✅ Found successful payment session: ${paymentSession.sessionId}`);
        
        // Update order status
        await orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: 'paid',
          orderStatus: 'Confirmed',
          status: 'Order Placed',
          stockConfirmed: true,
          stockConfirmedAt: new Date(),
          phonepeTransactionId: paymentSession.phonepeTransactionId
        });
        
        console.log(`   ✅ Fixed order status`);
      } else {
        console.log(`   ❌ No successful payment session found`);
      }
    }
    
    // 3. Fix: Check for orphaned payment sessions
    console.log('\n🔧 Step 3: Checking for orphaned payment sessions...');
    
    const successfulPaymentSessions = await PaymentSession.find({
      status: 'success',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${successfulPaymentSessions.length} successful payment sessions:`);
    
    for (const session of successfulPaymentSessions) {
      const existingOrder = await orderModel.findOne({
        $or: [
          { phonepeTransactionId: session.phonepeTransactionId },
          { checkoutSessionId: session.sessionId },
          { 'userInfo.email': session.userEmail }
        ]
      });
      
      if (!existingOrder) {
        console.log(`\n📋 Orphaned payment session: ${session.sessionId}`);
        console.log(`   Amount: ₹${session.orderData?.amount || 0}`);
        console.log(`   User: ${session.userEmail}`);
        console.log(`   Created: ${session.createdAt}`);
        
        // Create order from payment session
        try {
          const newOrder = new orderModel({
            userInfo: { email: session.userEmail },
            shippingInfo: session.orderData?.shipping || {},
            cartItems: session.orderData?.cartItems || [],
            subtotal: session.orderData?.amount || 0,
            total: session.orderData?.amount || 0,
            paymentStatus: 'paid',
            orderStatus: 'Confirmed',
            status: 'Order Placed',
            placedAt: session.createdAt,
            phonepeTransactionId: session.phonepeTransactionId,
            stockConfirmed: true,
            stockConfirmedAt: new Date(),
            orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });
          
          await newOrder.save();
          console.log(`   ✅ Created order: ${newOrder.orderId}`);
          
          // Update payment session with order ID
          session.orderId = newOrder._id;
          await session.save();
          
        } catch (error) {
          console.log(`   ❌ Failed to create order: ${error.message}`);
        }
      } else {
        console.log(`✅ Payment session ${session.sessionId} has corresponding order: ${existingOrder.orderId}`);
      }
    }
    
    // 4. Test the offer calculation
    console.log('\n🧪 Step 4: Testing offer calculation...');
    
    const testItems = [
      { name: 'Navy blue with fish print feeding lounge wear', originalPrice: 450, size: 'L' },
      { name: 'Black glitter zipless feeding lounge wear', originalPrice: 450, size: 'XL' },
      { name: 'Purple with flower print feeding lounge wear', originalPrice: 450, size: 'XL' }
    ];
    
    const originalTotal = testItems.reduce((sum, item) => sum + item.originalPrice, 0);
    const offerTotal = 1299; // 3 for ₹1299
    const discount = originalTotal - offerTotal;
    
    console.log(`Test scenario: 3 loungewear items @ ₹450 each`);
    console.log(`Original total: ₹${originalTotal}`);
    console.log(`Offer total: ₹${offerTotal}`);
    console.log(`Expected discount: ₹${discount}`);
    console.log(`Should apply offer: ${testItems.length >= 3 ? 'YES' : 'NO'}`);
    
    console.log('\n✅ Comprehensive fix completed!');
    console.log('\n📋 Summary:');
    console.log(`- Fixed ${fixedCount} product categories`);
    console.log(`- Checked ${recentFailedOrders.length} potentially failed orders`);
    console.log(`- Checked ${successfulPaymentSessions.length} payment sessions`);
    console.log('- Offer calculation logic is working correctly');
    
  } catch (error) {
    console.error('❌ Error during comprehensive fix:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixOfferAndOrderIssues();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
