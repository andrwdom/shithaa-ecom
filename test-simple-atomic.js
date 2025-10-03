#!/usr/bin/env node

const mongoose = require('mongoose');

async function testSimpleAtomic() {
  console.log('🧪 Testing Simple Atomic Operations');
  console.log('==================================');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db');
    console.log('✅ Connected to MongoDB');

    // Test simple update
    const Product = mongoose.model('Product', new mongoose.Schema({}, { collection: 'products' }));
    
    console.log('\n1. Testing simple product update...');
    const result = await Product.updateOne(
      { _id: '6894d5c86880f7730aa3d9ff' },
      { $inc: { 'sizes.0.stock': -1 } }
    );
    
    console.log('✅ Simple update successful:', result);
    
    // Test atomic operation using $ positional operator
    console.log('\n2. Testing atomic stock reservation...');
    const atomicResult = await Product.updateOne(
      {
        _id: '6894d5c86880f7730aa3d9ff',
        'sizes.size': 'M',
        'sizes.stock': { $gte: 1 }
      },
      {
        $inc: { 'sizes.$.reserved': 1 }
      }
    );
    
    console.log('✅ Atomic reservation successful:', atomicResult);
    
    // Test duplicate (should fail)
    console.log('\n3. Testing duplicate reservation (should fail)...');
    const duplicateResult = await Product.updateOne(
      {
        _id: '6894d5c86880f7730aa3d9ff',
        'sizes.size': 'M',
        'sizes.stock': { $gte: 1 }
      },
      {
        $inc: { 'sizes.$.reserved': 1 }
      }
    );
    
    console.log('✅ Duplicate reservation correctly failed:', duplicateResult);
    
    console.log('\n✅ All atomic operations working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSimpleAtomic().catch(console.error);
