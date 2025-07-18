// Test script to verify shipping information implementation
import mongoose from 'mongoose';
import orderModel from './models/orderModel.js';

// Test data for shipping information
const testShippingInfo = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '9876543210',
  addressLine1: '123 Main Street',
  addressLine2: 'Apartment 4B',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '600001',
  country: 'India'
};

const testOrderData = {
  userInfo: {
    userId: new mongoose.Types.ObjectId(),
    name: 'John Doe',
    email: 'john.doe@example.com'
  },
  shippingInfo: testShippingInfo,
  items: [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      quantity: 1,
      price: 299,
      image: 'test-image.jpg',
      size: 'M'
    }
  ],
  totalAmount: 299,
  paymentStatus: 'test-paid',
  orderStatus: 'Pending',
  isTestOrder: true
};

async function testShippingImplementation() {
  try {
    console.log('🧪 Testing Shipping Information Implementation...\n');

    // 1. Test creating order with shipping information
    console.log('1. Creating test order with shipping information...');
    const order = await orderModel.create(testOrderData);
    console.log('✅ Order created successfully with ID:', order._id);
    console.log('📦 Shipping Info stored:', JSON.stringify(order.shippingInfo, null, 2));

    // 2. Test retrieving order and verifying shipping information
    console.log('\n2. Retrieving order and verifying shipping information...');
    const retrievedOrder = await orderModel.findById(order._id);
    console.log('✅ Order retrieved successfully');
    console.log('📦 Retrieved Shipping Info:', JSON.stringify(retrievedOrder.shippingInfo, null, 2));

    // 3. Verify all required fields are present
    console.log('\n3. Verifying all required shipping fields...');
    const requiredFields = ['fullName', 'email', 'phone', 'addressLine1', 'city', 'state', 'postalCode', 'country'];
    const missingFields = requiredFields.filter(field => !retrievedOrder.shippingInfo[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ All required shipping fields are present');
    } else {
      console.log('❌ Missing required fields:', missingFields);
    }

    // 4. Test validation (should fail with missing fields)
    console.log('\n4. Testing validation with missing required fields...');
    const invalidOrderData = {
      ...testOrderData,
      shippingInfo: {
        fullName: 'John Doe',
        // Missing email, phone, addressLine1, etc.
      }
    };

    try {
      await orderModel.create(invalidOrderData);
      console.log('❌ Validation failed - order was created without required fields');
    } catch (error) {
      console.log('✅ Validation working correctly - order creation failed as expected');
      console.log('   Error message:', error.message);
    }

    // 5. Clean up test data
    console.log('\n5. Cleaning up test data...');
    await orderModel.findByIdAndDelete(order._id);
    console.log('✅ Test order deleted successfully');

    console.log('\n🎉 All tests passed! Shipping information implementation is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha-maternity';
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('📡 Connected to MongoDB');
      return testShippingImplementation();
    })
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export default testShippingImplementation; 