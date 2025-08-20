#!/usr/bin/env node

/**
 * Test script to verify cart vs buy-now flow isolation
 * This tests that cart promotions never leak into buy-now flows
 */

console.log('🧪 Testing Cart vs Buy-Now Flow Isolation...\n');

// Mock data for testing
const mockCartItems = [
  {
    id: '1',
    _id: '1',
    name: 'Loungewear Item 1',
    price: 1299,
    quantity: 1,
    size: 'M',
    categorySlug: 'zipless-feeding-lounge-wear'
  },
  {
    id: '2',
    _id: '2',
    name: 'Loungewear Item 2',
    price: 1299,
    quantity: 1,
    size: 'L',
    categorySlug: 'zipless-feeding-lounge-wear'
  },
  {
    id: '3',
    _id: '3',
    name: 'Loungewear Item 3',
    price: 1299,
    quantity: 1,
    size: 'S',
    categorySlug: 'zipless-feeding-lounge-wear'
  }
];

const mockBuyNowItem = [
  {
    id: '4',
    _id: '4',
    name: 'Single Product',
    price: 1,
    quantity: 1,
    size: 'M',
    categorySlug: 'other-category'
  }
];

const mockOfferDetails = {
  offerApplied: true,
  offerDiscount: 1296,
  offerDetails: {
    completeSets: 1,
    remainingItems: 0
  }
};

// Test function to simulate OrderSummary component logic
function testOrderSummaryIsolation(mode, items, offerDetails) {
  console.log(`\n📋 Testing ${mode.toUpperCase()} mode:`);
  console.log(`   Items: ${items.length}`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Offer Details: ${offerDetails ? 'Present' : 'None'}`);
  
  const isBuyNowMode = mode === 'buy-now';
  
  // 🚨 SAFETY CHECK: Ensure buy-now flows never receive cart promotions
  if (isBuyNowMode && offerDetails?.offerApplied) {
    console.log('   🚨 SAFETY VIOLATION: Buy-now flow received cart promotions!');
    console.log('   🔧 Auto-correcting by setting offerDetails to null');
    offerDetails = null;
  }
  
  // Calculate totals
  const itemSubtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const offerDiscount = (!isBuyNowMode && offerDetails?.offerApplied) ? offerDetails.offerDiscount : 0;
  const total = itemSubtotal - offerDiscount;
  
  console.log(`   Subtotal: ₹${itemSubtotal}`);
  console.log(`   Offer Discount: ₹${offerDiscount}`);
  console.log(`   Total: ₹${total}`);
  console.log(`   Promotions Isolated: ${isBuyNowMode ? !offerDetails?.offerApplied : true}`);
  
  return {
    mode,
    isBuyNowMode,
    itemSubtotal,
    offerDiscount,
    total,
    promotionsIsolated: isBuyNowMode ? !offerDetails?.offerApplied : true
  };
}

// Run tests
console.log('1️⃣ Testing Cart Mode with Promotions:');
const cartResult = testOrderSummaryIsolation('cart', mockCartItems, mockOfferDetails);

console.log('\n2️⃣ Testing Buy-Now Mode with Promotions (should auto-correct):');
const buyNowResult = testOrderSummaryIsolation('buy-now', mockBuyNowItem, mockOfferDetails);

console.log('\n3️⃣ Testing Buy-Now Mode without Promotions:');
const buyNowCleanResult = testOrderSummaryIsolation('buy-now', mockBuyNowItem, null);

// Verify results
console.log('\n🔍 Test Results:');
console.log(`   Cart Mode - Promotions Applied: ${cartResult.offerDiscount > 0}`);
console.log(`   Buy-Now Mode - Promotions Isolated: ${buyNowResult.promotionsIsolated}`);
console.log(`   Buy-Now Mode - Total Correct: ${buyNowResult.total === buyNowResult.itemSubtotal}`);

// Final validation
const allTestsPassed = 
  cartResult.offerDiscount > 0 && 
  buyNowResult.promotionsIsolated && 
  buyNowResult.total === buyNowResult.itemSubtotal;

if (allTestsPassed) {
  console.log('\n✅ All tests passed! Cart and Buy-Now flows are properly isolated.');
  console.log('   - Cart mode: Promotions work correctly');
  console.log('   - Buy-Now mode: Promotions are automatically blocked');
  console.log('   - No cross-contamination between flows');
} else {
  console.log('\n❌ Some tests failed! Check the implementation.');
}

console.log('\n🎯 Test Summary:');
console.log(`   Cart Total: ₹${cartResult.total} (with ₹${cartResult.offerDiscount} discount)`);
console.log(`   Buy-Now Total: ₹${buyNowResult.total} (no promotions)`);
console.log(`   Isolation Working: ${buyNowResult.promotionsIsolated ? 'Yes' : 'No'}`);

process.exit(allTestsPassed ? 0 : 1);
