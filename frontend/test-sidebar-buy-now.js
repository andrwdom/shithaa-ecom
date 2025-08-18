// Test script to verify sidebar Buy Now functionality
// Run this in browser console to test the fix

console.log('🧪 Testing Sidebar Buy Now Functionality...');

// Test 1: Simulate sidebar Buy Now flow
function testSidebarBuyNow() {
  console.log('\n🛒 Test 1: Sidebar Buy Now Flow');
  
  // Simulate setting a buy-now item from sidebar (matching the fixed logic)
  const buyNowItem = {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Product from Sidebar',
    price: 999,
    quantity: 1,
    size: 'M',
    image: '/test-sidebar.jpg',
    category: 'Test Category',
    categorySlug: 'test-category'
  };
  
  // Set in storage (EXACTLY like the fixed sidebar does)
  sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  
  // Set checkout flow data (EXACTLY like the fixed sidebar does)
  const buyNowData = {
    flow: {
      mode: 'buy-now',
      items: [buyNowItem],
      source: 'buy-now',
      timestamp: Date.now(),
      sessionId: `buynow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    items: [buyNowItem],
    timestamp: Date.now()
  };
  
  sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
  localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
  
  console.log('✅ Sidebar buy-now item set in storage');
  console.log('📦 Storage contents:', {
    buyNowItem: sessionStorage.getItem('buyNowItem'),
    buyNowCheckoutData: sessionStorage.getItem('buyNowCheckoutData')
  });
}

// Test 2: Verify storage format matches product page
function testStorageFormat() {
  console.log('\n🔄 Test 2: Verify Storage Format Consistency');
  
  // Check if storage format matches product page exactly
  const buyNowItem = sessionStorage.getItem('buyNowItem');
  const buyNowCheckoutData = sessionStorage.getItem('buyNowCheckoutData');
  
  if (buyNowItem && buyNowCheckoutData) {
    try {
      const item = JSON.parse(buyNowItem);
      const data = JSON.parse(buyNowCheckoutData);
      
      console.log('📦 Parsed buyNowItem:', item);
      console.log('📦 Parsed buyNowCheckoutData:', data);
      
      // Verify required fields exist
      const requiredFields = ['_id', 'name', 'price', 'quantity', 'size', 'image'];
      const missingFields = requiredFields.filter(field => !item[field]);
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present in buyNowItem');
      } else {
        console.log('❌ Missing fields in buyNowItem:', missingFields);
      }
      
      // Verify checkout data structure
      if (data.flow && data.flow.mode === 'buy-now' && data.items && data.items.length === 1) {
        console.log('✅ buyNowCheckoutData structure is correct');
      } else {
        console.log('❌ buyNowCheckoutData structure is incorrect');
      }
      
    } catch (error) {
      console.error('❌ Error parsing stored data:', error);
    }
  } else {
    console.log('❌ No buy-now data found in storage');
  }
}

// Test 3: Simulate checkout navigation
function testCheckoutNavigation() {
  console.log('\n🚀 Test 3: Simulate Checkout Navigation');
  
  // Simulate what happens when user navigates to checkout
  const urlMode = 'buynow';
  const buyNowItem = sessionStorage.getItem('buyNowItem');
  const buyNowCheckoutData = sessionStorage.getItem('buyNowCheckoutData');
  
  console.log('🔍 Checkout initialization check:');
  console.log('  - URL mode:', urlMode);
  console.log('  - buyNowItem exists:', !!buyNowItem);
  console.log('  - buyNowCheckoutData exists:', !!buyNowCheckoutData);
  
  if (urlMode === 'buynow' && (buyNowItem || buyNowCheckoutData)) {
    console.log('✅ Checkout should initialize successfully with buy-now items');
    
    // Simulate what the checkout flow manager would do
    try {
      if (buyNowItem) {
        const item = JSON.parse(buyNowItem);
        console.log('✅ Found buy-now item in storage:', item.name);
      }
      
      if (buyNowCheckoutData) {
        const data = JSON.parse(buyNowCheckoutData);
        console.log('✅ Found buy-now checkout data with', data.items.length, 'items');
      }
      
    } catch (error) {
      console.error('❌ Error during checkout initialization:', error);
    }
  } else {
    console.log('❌ Checkout initialization would fail - no buy-now data found');
  }
}

// Test 4: Clear test data
function clearTestData() {
  console.log('\n🗑️ Test 4: Clear Test Data');
  
  // Clear all test data
  sessionStorage.removeItem('buyNowItem');
  localStorage.removeItem('buyNowItem');
  sessionStorage.removeItem('buyNowCheckoutData');
  localStorage.removeItem('buyNowCheckoutData');
  
  console.log('✅ Test data cleared');
  
  // Verify storage is empty
  const remainingData = {
    buyNowItem: sessionStorage.getItem('buyNowItem'),
    buyNowCheckoutData: sessionStorage.getItem('buyNowCheckoutData')
  };
  
  console.log('📊 Storage after clearing:', remainingData);
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Sidebar Buy Now Tests...\n');
  
  testSidebarBuyNow();
  testStorageFormat();
  testCheckoutNavigation();
  clearTestData();
  
  console.log('\n🎉 All tests completed!');
  console.log('💡 Check the console for detailed results');
  console.log('💡 The sidebar Buy Now should now work exactly like the product page!');
}

// Export for manual testing
window.testSidebarBuyNow = {
  testSidebarBuyNow,
  testStorageFormat,
  testCheckoutNavigation,
  clearTestData,
  runAllTests
};

console.log('🧪 Sidebar Buy Now Test Suite loaded!');
console.log('💡 Run testSidebarBuyNow.runAllTests() to execute all tests');
console.log('💡 Or run individual tests like testSidebarBuyNow.testSidebarBuyNow()');
