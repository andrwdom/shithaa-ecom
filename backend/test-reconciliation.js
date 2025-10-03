/**
 * TEST RECONCILIATION JOB
 * 
 * This script tests the draft reconciliation job by:
 * 1. Creating a test draft order
 * 2. Running the reconciliation job
 * 3. Verifying the results
 */

import mongoose from 'mongoose';
import orderModel from './models/orderModel.js';
import reconciliationJob from './jobs/reconcileDrafts.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function testReconciliation() {
  console.log('🧪 Testing Draft Reconciliation Job');
  console.log('==================================');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db');
    console.log('✅ Connected to MongoDB');

    // 1. Create a test draft order
    const testOrder = await orderModel.create({
      orderId: `TEST_RECONCILE_${Date.now()}`,
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      phonepeTransactionId: `TXN_TEST_${Date.now()}`,
      cartItems: [{
        productId: new mongoose.Types.ObjectId(),
        name: 'Test Product',
        price: 1000,
        quantity: 1,
        size: 'M'
      }],
      userInfo: {
        email: 'test@example.com',
        name: 'Test User'
      },
      shippingInfo: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '9999999999',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India'
      },
      orderSummary: { total: 1000 },
      paymentMethod: 'PhonePe',
      createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    });

    console.log(`📋 Created test draft order: ${testOrder.orderId}`);

    // 2. Start the reconciliation job
    console.log('🔄 Starting reconciliation job...');
    reconciliationJob.start();

    // 3. Wait for reconciliation to run
    console.log('⏳ Waiting for reconciliation to process...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    // 4. Check the order status
    const updatedOrder = await orderModel.findById(testOrder._id);
    console.log('📊 Order status after reconciliation:', {
      orderId: updatedOrder.orderId,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      cancelledAt: updatedOrder.cancelledAt,
      cancellationReason: updatedOrder.cancellationReason
    });

    // 5. Stop the reconciliation job
    reconciliationJob.stop();
    console.log('🛑 Reconciliation job stopped');

    // 6. Clean up test order
    await orderModel.findByIdAndDelete(testOrder._id);
    console.log('🧹 Test order cleaned up');

    console.log('✅ Reconciliation test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the test
testReconciliation();
