/**
 * CRITICAL TEST: Concurrent Reservation Race Condition
 * 
 * This test verifies that the atomic stock operations prevent overselling
 * when multiple users try to reserve the same product simultaneously.
 * 
 * BEFORE FIX: Both users can reserve 10 units (overselling by 10)
 * AFTER FIX: Only ONE user should succeed
 */

import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';
import { reserveStockAtomic } from './backend/utils/atomicStockOperations.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function setupTestProduct() {
  await mongoose.connect(MONGODB_URI);
  
  // Create or update test product
  const testProduct = await productModel.findOneAndUpdate(
    { customId: 'TEST-CONCURRENT-001' },
    {
      customId: 'TEST-CONCURRENT-001',
      name: 'Test Product for Concurrent Reservation',
      price: 100,
      description: 'Test product',
      images: ['test.jpg'],
      category: 'Test',
      categorySlug: 'test',
      sizes: [
        {
          size: 'M',
          stock: 10,        // Only 10 units available
          reserved: 0
        }
      ],
      inStock: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  
  console.log('✅ Test product created:', {
    _id: testProduct._id,
    customId: testProduct.customId,
    stock: testProduct.sizes[0].stock,
    reserved: testProduct.sizes[0].reserved
  });
  
  return testProduct._id;
}

async function testConcurrentReservation(productId) {
  console.log('\n🧪 TEST: Concurrent Reservation (Race Condition)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Before test: Check initial stock
  const before = await productModel.findById(productId);
  console.log('📊 Initial Stock:', {
    stock: before.sizes[0].stock,
    reserved: before.sizes[0].reserved,
    available: before.sizes[0].stock - before.sizes[0].reserved
  });
  
  // Launch 2 concurrent reservations for 10 units each
  // Both users trying to reserve the LAST 10 units simultaneously
  console.log('\n🚀 Launching 2 concurrent reservations (10 units each)...');
  
  const startTime = Date.now();
  
  const results = await Promise.allSettled([
    // User A: trying to reserve 10 units
    reserveStockAtomic(productId, 'M', 10, { correlationId: 'user-A' }),
    
    // User B: trying to reserve 10 units (same time)
    reserveStockAtomic(productId, 'M', 10, { correlationId: 'user-B' })
  ]);
  
  const duration = Date.now() - startTime;
  
  // After test: Check final stock
  const after = await productModel.findById(productId);
  
  // Analyze results
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;
  
  console.log('\n📊 Test Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`✅ Successful reservations: ${successCount}`);
  console.log(`❌ Failed reservations: ${failureCount}`);
  
  console.log('\n📦 Final Stock State:');
  console.log({
    stock: after.sizes[0].stock,
    reserved: after.sizes[0].reserved,
    available: after.sizes[0].stock - after.sizes[0].reserved
  });
  
  // Detailed results
  console.log('\n🔍 Detailed Results:');
  results.forEach((result, index) => {
    const user = index === 0 ? 'User A' : 'User B';
    if (result.status === 'fulfilled') {
      console.log(`  ${user}: ✅ SUCCESS - Reserved 10 units`);
    } else {
      console.log(`  ${user}: ❌ FAILED - ${result.reason.message}`);
    }
  });
  
  // Validation
  console.log('\n🎯 Validation:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const checks = [
    {
      name: 'Only ONE reservation should succeed',
      pass: successCount === 1 && failureCount === 1,
      expected: 'Success: 1, Failed: 1',
      actual: `Success: ${successCount}, Failed: ${failureCount}`
    },
    {
      name: 'Stock should be 0 (10 reserved)',
      pass: after.sizes[0].stock === 0,
      expected: 0,
      actual: after.sizes[0].stock
    },
    {
      name: 'Reserved should be 10',
      pass: after.sizes[0].reserved === 10,
      expected: 10,
      actual: after.sizes[0].reserved
    },
    {
      name: 'No overselling (stock >= 0)',
      pass: after.sizes[0].stock >= 0,
      expected: '>= 0',
      actual: after.sizes[0].stock
    },
    {
      name: 'Reserved never exceeds original stock',
      pass: after.sizes[0].reserved <= before.sizes[0].stock,
      expected: `<= ${before.sizes[0].stock}`,
      actual: after.sizes[0].reserved
    }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    const status = check.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${check.name}`);
    console.log(`       Expected: ${check.expected}, Actual: ${check.actual}`);
    if (!check.pass) allPassed = false;
  });
  
  console.log('\n' + '━'.repeat(50));
  if (allPassed) {
    console.log('✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
    console.log('The atomic operations successfully prevented overselling.');
  } else {
    console.log('❌ ❌ ❌ TEST FAILED! ❌ ❌ ❌');
    console.log('CRITICAL: Race condition detected - overselling is possible!');
  }
  console.log('━'.repeat(50));
  
  return allPassed;
}

async function testHighConcurrency(productId) {
  console.log('\n🧪 TEST: High Concurrency (10 simultaneous users)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Reset test product
  await productModel.findByIdAndUpdate(productId, {
    'sizes.0.stock': 20,
    'sizes.0.reserved': 0
  });
  
  console.log('📊 Initial Stock: 20 units, Reserved: 0');
  console.log('🚀 Launching 10 users, each trying to reserve 5 units (total: 50 units)...');
  console.log('   Expected: 4 succeed (20 units), 6 fail');
  
  const startTime = Date.now();
  
  // 10 users trying to reserve 5 units each (total demand: 50 units)
  // Only 20 units available, so only 4 should succeed
  const promises = Array.from({ length: 10 }, (_, i) =>
    reserveStockAtomic(productId, 'M', 5, { correlationId: `user-${i}` })
  );
  
  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  
  const after = await productModel.findById(productId);
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;
  
  console.log('\n📊 Test Results:');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`✅ Successful reservations: ${successCount} (total: ${successCount * 5} units)`);
  console.log(`❌ Failed reservations: ${failureCount}`);
  console.log(`📦 Final stock: ${after.sizes[0].stock}`);
  console.log(`📦 Reserved: ${after.sizes[0].reserved}`);
  
  const allPassed = 
    successCount === 4 &&
    failureCount === 6 &&
    after.sizes[0].stock === 0 &&
    after.sizes[0].reserved === 20;
  
  if (allPassed) {
    console.log('✅ HIGH CONCURRENCY TEST PASSED!');
  } else {
    console.log('❌ HIGH CONCURRENCY TEST FAILED!');
  }
  
  return allPassed;
}

async function testLargeOrder(productId) {
  console.log('\n🧪 TEST: Large Order (20 items in cart)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Create 20 test products
  const products = [];
  for (let i = 0; i < 20; i++) {
    const product = await productModel.findOneAndUpdate(
      { customId: `TEST-LARGE-${i}` },
      {
        customId: `TEST-LARGE-${i}`,
        name: `Test Product ${i}`,
        price: 100,
        description: 'Test',
        images: ['test.jpg'],
        category: 'Test',
        categorySlug: 'test',
        sizes: [{
          size: 'M',
          stock: 10,
          reserved: 0
        }],
        inStock: true
      },
      { upsert: true, new: true }
    );
    products.push(product._id);
  }
  
  console.log(`📦 Created 20 products with 10 units each`);
  console.log('🚀 Reserving 1 unit from each product...');
  
  const startTime = Date.now();
  
  // Reserve 1 unit from each product
  const promises = products.map(pid =>
    reserveStockAtomic(pid, 'M', 1, { correlationId: 'large-order' })
  );
  
  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  
  console.log('\n📊 Test Results:');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`✅ Successful reservations: ${successCount}/20`);
  console.log(`❌ Failed reservations: ${20 - successCount}`);
  
  const allPassed = successCount === 20 && duration < 30000;
  
  if (allPassed) {
    console.log('✅ LARGE ORDER TEST PASSED!');
  } else {
    console.log('❌ LARGE ORDER TEST FAILED!');
    if (duration >= 30000) {
      console.log('⚠️  WARNING: Transaction timeout risk (took > 30s)');
    }
  }
  
  // Cleanup
  await productModel.deleteMany({ customId: /^TEST-LARGE-/ });
  
  return allPassed;
}

async function runAllTests() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 STOCK MANAGEMENT ATOMIC OPERATIONS TEST SUITE');
    console.log('='.repeat(50));
    
    const productId = await setupTestProduct();
    
    const test1 = await testConcurrentReservation(productId);
    const test2 = await testHighConcurrency(productId);
    const test3 = await testLargeOrder(productId);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Test 1 - Concurrent Reservation: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 - High Concurrency:       ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 - Large Order:            ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (test1 && test2 && test3) {
      console.log('\n✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅');
      console.log('Your stock management system is working correctly!');
    } else {
      console.log('\n❌ ❌ ❌ SOME TESTS FAILED! ❌ ❌ ❌');
      console.log('Please review the atomic operations implementation.');
    }
    console.log('='.repeat(50) + '\n');
    
    // Cleanup
    await productModel.deleteOne({ customId: 'TEST-CONCURRENT-001' });
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run tests
runAllTests();

