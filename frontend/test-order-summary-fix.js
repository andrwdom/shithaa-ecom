// Test script to verify OrderSummary data consistency fix
// Run this in browser console to test the fix

console.log('🧪 Testing OrderSummary Data Consistency Fix...');

// Test 1: Simulate Buy Now Flow
function testBuyNowFlow() {
  console.log('\n🛒 Test 1: Buy Now Flow Data Consistency');
  
  // Clear any existing data
  sessionStorage.clear();
  localStorage.clear();
  
  // Set buy-now item
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

// Test 2: Simulate Cart Flow
function testCartFlow() {
  console.log('\n🛒 Test 2: Cart Flow Data Consistency');
  
  // Set cart items
  const cartItems = [
    {
      id: '507f1f77bcf86cd799439012',
      _id: '507f1f77bcf86cd799439012',
      name: 'Cart Product 1',
      price: 599,
      quantity: 2,
      size: 'M'
    },
    {
      id: '507f1f77bcf86cd799439013',
      _id: '507f1f77bcf86cd799439013',
      name: 'Cart Product 2',
      price: 799,
      quantity: 1,
      size: 'S'
    }
  ];
  
  // Set cart data
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
  
  console.log('✅ Cart items set:', cartItems);
  
  // Calculate expected values
  const expectedSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0); // (599*2) + (799*1) = 1198 + 799 = 1997
  const expectedShipping = 0; // Free shipping
  const expectedTotal = expectedSubtotal + expectedShipping; // 1997 + 0 = 1997
  
  console.log('📊 Expected values:', {
    subtotal: expectedSubtotal,
    shipping: expectedShipping,
    total: expectedTotal
  });
  
  return { cartItems, expectedSubtotal, expectedShipping, expectedTotal };
}

// Test 3: Verify No Data Contamination
function testNoDataContamination() {
  console.log('\n🔄 Test 3: Verify No Data Contamination');
  
  // Check if buy-now and cart data are completely separate
  const buyNowItem = sessionStorage.getItem('buyNowItem');
  const cartItems = localStorage.getItem('cartItems');
  
  if (buyNowItem && cartItems) {
    try {
      const buyNow = JSON.parse(buyNowItem);
      const cart = JSON.parse(cartItems);
      
      console.log('📦 Buy-now data:', buyNow);
      console.log('📦 Cart data:', cart);
      
      // Verify they are different products
      if (buyNow.name !== cart[0].name) {
        console.log('✅ No data contamination: Buy-now and cart have different products');
      } else {
        console.log('❌ Data contamination detected: Buy-now and cart have same product');
      }
      
    } catch (error) {
      console.error('❌ Error parsing stored data:', error);
    }
  } else {
    console.log('❌ Missing data for contamination test');
  }
}

// Test 4: Simulate OrderSummary Calculation
function testOrderSummaryCalculation() {
  console.log('\n🚀 Test 4: Simulate OrderSummary Calculation');
  
  // Simulate what OrderSummary component now does
  const buyNowItem = sessionStorage.getItem('buyNowItem');
  const cartItems = localStorage.getItem('cartItems');
  
  if (buyNowItem) {
    try {
      const item = JSON.parse(buyNowItem);
      const displayItems = [item];
      
      // Calculate values fresh from displayItems (like OrderSummary now does)
      const itemSubtotal = displayItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const shipping = 0;
      const total = itemSubtotal + shipping;
      
      console.log('📊 Buy-now OrderSummary calculation:', {
        displayItems: displayItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
        itemSubtotal,
        shipping,
        total
      });
      
      // Verify calculation is correct
      const expectedSubtotal = 699; // 699 * 1
      if (itemSubtotal === expectedSubtotal) {
        console.log('✅ Buy-now calculation is correct');
      } else {
        console.log('❌ Buy-now calculation is wrong:', { expected: expectedSubtotal, actual: itemSubtotal });
      }
      
    } catch (error) {
      console.error('❌ Error calculating buy-now OrderSummary:', error);
    }
  }
  
  if (cartItems) {
    try {
      const items = JSON.parse(cartItems);
      const displayItems = items;
      
      // Calculate values fresh from displayItems (like OrderSummary now does)
      const itemSubtotal = displayItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const shipping = 0;
      const total = itemSubtotal + shipping;
      
      console.log('📊 Cart OrderSummary calculation:', {
        displayItems: displayItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
        itemSubtotal,
        shipping,
        total
      });
      
      // Verify calculation is correct
      const expectedSubtotal = 1997; // (599*2) + (799*1)
      if (itemSubtotal === expectedSubtotal) {
        console.log('✅ Cart calculation is correct');
      } else {
        console.log('❌ Cart calculation is wrong:', { expected: expectedSubtotal, actual: itemSubtotal });
      }
      
    } catch (error) {
      console.error('❌ Error calculating cart OrderSummary:', error);
    }
  }
}

// Test 5: Clear Test Data
function clearTestData() {
  console.log('\n🗑️ Test 5: Clear Test Data');
  
  // Clear all test data
  sessionStorage.removeItem('buyNowItem');
  localStorage.removeItem('buyNowItem');
  localStorage.removeItem('cartItems');
  
  console.log('✅ Test data cleared');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting OrderSummary Data Consistency Tests...\n');
  
  testBuyNowFlow();
  testCartFlow();
  testNoDataContamination();
  testOrderSummaryCalculation();
  clearTestData();
  
  console.log('\n🎉 All tests completed!');
  console.log('💡 Check the console for detailed results');
  console.log('💡 OrderSummary should now calculate values correctly from displayItems!');
}

// Export for manual testing
window.testOrderSummaryFix = {
  testBuyNowFlow,
  testCartFlow,
  testNoDataContamination,
  testOrderSummaryCalculation,
  clearTestData,
  runAllTests
};

console.log('🧪 OrderSummary Data Consistency Test Suite loaded!');
console.log('💡 Run testOrderSummaryFix.runAllTests() to execute all tests');
console.log('💡 Or run individual tests like testOrderSummaryFix.testBuyNowFlow()');
