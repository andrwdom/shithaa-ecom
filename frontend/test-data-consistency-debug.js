// Test script to debug data consistency between ProductPreviewSection and OrderSummary
// Run this in browser console to test the fix

console.log('🧪 Testing Data Consistency Debug...');

// Test 1: Simulate the exact scenario from the screenshot
function testScreenshotScenario() {
  console.log('\n🖼️ Test 1: Simulate Screenshot Scenario');
  
  // Clear any existing data
  sessionStorage.clear();
  localStorage.clear();
  
  // Set buy-now item (Delta Crepe Feeding Maxi, ₹699)
  const buyNowItem = {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    name: 'Delta Crepe Feeding Maxi',
    price: 699,
    quantity: 1,
    size: 'L',
    image: '/test-buynow.jpg'
  };
  
  // Set buy-now data
  sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  
  console.log('✅ Buy-now item set:', buyNowItem);
  
  // Calculate expected values
  const expectedSubtotal = buyNowItem.price * buyNowItem.quantity; // 699 * 1 = 699
  const expectedShipping = 0; // Free shipping
  const expectedTotal = expectedSubtotal + expectedShipping; // 699 + 0 = 699
  
  console.log('📊 Expected values:', {
    subtotal: expectedSubtotal,
    shipping: expectedShipping,
    total: expectedTotal
  });
  
  return { buyNowItem, expectedSubtotal, expectedShipping, expectedTotal };
}

// Test 2: Check what's actually in storage
function checkStorageContents() {
  console.log('\n📦 Test 2: Check Storage Contents');
  
  const buyNowItem = sessionStorage.getItem('buyNowItem');
  const buyNowItemLocal = localStorage.getItem('buyNowItem');
  const cartItems = localStorage.getItem('cartItems');
  const cartItemsSession = sessionStorage.getItem('cartItems');
  
  console.log('📊 Storage contents:', {
    sessionStorage: {
      buyNowItem: buyNowItem ? JSON.parse(buyNowItem) : null,
      cartItems: cartItemsSession ? JSON.parse(cartItemsSession) : null
    },
    localStorage: {
      buyNowItem: buyNowItemLocal ? JSON.parse(buyNowItemLocal) : null,
      cartItems: cartItems ? JSON.parse(cartItems) : null
    }
  });
  
  return { buyNowItem, buyNowItemLocal, cartItems, cartItemsSession };
}

// Test 3: Simulate the displayItems calculation logic
function testDisplayItemsCalculation() {
  console.log('\n🧮 Test 3: Simulate DisplayItems Calculation Logic');
  
  // Simulate the exact logic from CheckoutPage
  const isBuyNowMode = true; // Since we're testing buy-now scenario
  const checkoutItems = sessionStorage.getItem('buyNowItem') ? [JSON.parse(sessionStorage.getItem('buyNowItem'))] : [];
  const cartItems = localStorage.getItem('cartItems') ? JSON.parse(localStorage.getItem('cartItems')) : [];
  
  const displayItems = isBuyNowMode ? checkoutItems : cartItems;
  const displayMode = isBuyNowMode ? 'buy-now' : 'cart';
  
  console.log('📊 DisplayItems calculation:', {
    isBuyNowMode,
    checkoutItems: checkoutItems?.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, subtotal: item.price * item.quantity })),
    cartItems: cartItems?.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, subtotal: item.price * item.quantity })),
    displayItems: displayItems?.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, subtotal: item.price * item.quantity })),
    displayMode,
    displayItemsSource: isBuyNowMode ? 'checkoutItems (buy-now)' : 'cartItems (cart)',
    displayItemsTotal: displayItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
  });
  
  return { displayItems, displayMode, displayItemsTotal: displayItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0 };
}

// Test 4: Simulate OrderSummary calculation
function testOrderSummaryCalculation() {
  console.log('\n🧮 Test 4: Simulate OrderSummary Calculation');
  
  const displayItems = sessionStorage.getItem('buyNowItem') ? [JSON.parse(sessionStorage.getItem('buyNowItem'))] : [];
  
  if (displayItems.length > 0) {
    // Simulate exactly what OrderSummary now does
    const itemSubtotal = displayItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = 0; // Free shipping
    const total = itemSubtotal + shipping;
    
    console.log('📊 OrderSummary calculation:', {
      displayItems: displayItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, subtotal: item.price * item.quantity })),
      itemSubtotal,
      shipping,
      total
    });
    
    // Verify calculation is correct
    const expectedSubtotal = 699; // 699 * 1
    if (itemSubtotal === expectedSubtotal) {
      console.log('✅ OrderSummary calculation is correct');
    } else {
      console.log('❌ OrderSummary calculation is wrong:', { expected: expectedSubtotal, actual: itemSubtotal });
    }
    
    return { itemSubtotal, shipping, total };
  } else {
    console.log('❌ No displayItems found for OrderSummary calculation');
    return null;
  }
}

// Test 5: Check for data contamination
function checkDataContamination() {
  console.log('\n🔍 Test 5: Check for Data Contamination');
  
  const buyNowItem = sessionStorage.getItem('buyNowItem');
  const cartItems = localStorage.getItem('cartItems');
  
  if (buyNowItem && cartItems) {
    try {
      const buyNow = JSON.parse(buyNowItem);
      const cart = JSON.parse(cartItems);
      
      console.log('📦 Buy-now data:', buyNow);
      console.log('📦 Cart data:', cart);
      
      // Check if there's any overlap or contamination
      const buyNowNames = [buyNow.name];
      const cartNames = cart.map(item => item.name);
      
      const overlap = buyNowNames.filter(name => cartNames.includes(name));
      
      if (overlap.length > 0) {
        console.log('❌ Data contamination detected: Overlapping product names:', overlap);
      } else {
        console.log('✅ No data contamination: Buy-now and cart have different products');
      }
      
      // Check if the ₹1210 value might be coming from cart
      const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      console.log('📊 Cart total:', cartTotal);
      
      if (cartTotal === 1210) {
        console.log('🔍 Found potential source of ₹1210: Cart total');
      }
      
    } catch (error) {
      console.error('❌ Error checking data contamination:', error);
    }
  } else {
    console.log('📊 No data contamination possible - missing data');
  }
}

// Test 6: Clear test data
function clearTestData() {
  console.log('\n🗑️ Test 6: Clear Test Data');
  
  // Clear all test data
  sessionStorage.removeItem('buyNowItem');
  localStorage.removeItem('buyNowItem');
  localStorage.removeItem('cartItems');
  sessionStorage.removeItem('cartItems');
  
  console.log('✅ Test data cleared');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Data Consistency Debug Tests...\n');
  
  testScreenshotScenario();
  checkStorageContents();
  testDisplayItemsCalculation();
  testOrderSummaryCalculation();
  checkDataContamination();
  clearTestData();
  
  console.log('\n🎉 All tests completed!');
  console.log('💡 Check the console for detailed results');
  console.log('💡 Look for any discrepancies in the data flow!');
}

// Export for manual testing
window.testDataConsistencyDebug = {
  testScreenshotScenario,
  checkStorageContents,
  testDisplayItemsCalculation,
  testOrderSummaryCalculation,
  checkDataContamination,
  clearTestData,
  runAllTests
};

console.log('🧪 Data Consistency Debug Test Suite loaded!');
console.log('💡 Run testDataConsistencyDebug.runAllTests() to execute all tests');
console.log('💡 Or run individual tests like testDataConsistencyDebug.testScreenshotScenario()');
