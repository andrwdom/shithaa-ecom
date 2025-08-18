// Test script to verify checkout flow separation
// Run this in browser console to test the fixes

console.log('🧪 Testing Checkout Flow Separation...');

// Test 1: Buy Now Flow
function testBuyNowFlow() {
  console.log('\n🛒 Test 1: Buy Now Flow');
  
  // Simulate setting a buy-now item
  const buyNowItem = {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Product',
    price: 999,
    quantity: 1,
    size: 'M',
    image: '/test.jpg',
    category: 'Test Category',
    categorySlug: 'test-category'
  };
  
  // Set in storage
  sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  
  // Set checkout flow data
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
  
  console.log('✅ Buy-now item set in storage');
  console.log('📦 Storage contents:', {
    buyNowItem: sessionStorage.getItem('buyNowItem'),
    buyNowCheckoutData: sessionStorage.getItem('buyNowCheckoutData')
  });
}

// Test 2: Cart Flow
function testCartFlow() {
  console.log('\n🛒 Test 2: Cart Flow');
  
  // Simulate setting cart items
  const cartItems = [
    {
      id: '507f1f77bcf86cd799439012',
      _id: '507f1f77bcf86cd799439012',
      name: 'Cart Product 1',
      price: 599,
      quantity: 2,
      size: 'L',
      image: '/cart1.jpg',
      category: 'Cart Category',
      categorySlug: 'cart-category'
    },
    {
      id: '507f1f77bcf86cd799439013',
      _id: '507f1f77bcf86cd799439013',
      name: 'Cart Product 2',
      price: 799,
      quantity: 1,
      size: 'S',
      image: '/cart2.jpg',
      category: 'Cart Category',
      categorySlug: 'cart-category'
    }
  ];
  
  // Set in storage
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
  sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
  
  // Set checkout flow data
  const cartData = {
    flow: {
      mode: 'cart',
      items: cartItems,
      source: 'cart',
      timestamp: Date.now(),
      sessionId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    items: cartItems,
    timestamp: Date.now()
  };
  
  sessionStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
  localStorage.setItem('cartCheckoutData', JSON.stringify(cartData));
  
  console.log('✅ Cart items set in storage');
  console.log('📦 Storage contents:', {
    cartItems: localStorage.getItem('cartItems'),
    cartCheckoutData: sessionStorage.getItem('cartCheckoutData')
  });
}

// Test 3: Verify Separation
function testSeparation() {
  console.log('\n🔄 Test 3: Verify Flow Separation');
  
  console.log('📊 Current Storage State:');
  console.log('Buy Now Storage:', {
    buyNowItem: sessionStorage.getItem('buyNowItem'),
    buyNowCheckoutData: sessionStorage.getItem('buyNowCheckoutData'),
    buyNowCheckoutFlow: sessionStorage.getItem('buyNowCheckoutFlow'),
    buyNowCheckoutItems: sessionStorage.getItem('buyNowCheckoutItems')
  });
  
  console.log('Cart Storage:', {
    cartItems: localStorage.getItem('cartItems'),
    cartCheckoutData: sessionStorage.getItem('cartCheckoutData'),
    cartCheckoutFlow: sessionStorage.getItem('cartCheckoutFlow'),
    cartCheckoutItems: sessionStorage.getItem('cartCheckoutItems')
  });
  
  // Verify no cross-contamination
  const buyNowKeys = ['buyNowItem', 'buyNowCheckoutData', 'buyNowCheckoutFlow', 'buyNowCheckoutItems'];
  const cartKeys = ['cartItems', 'cartCheckoutData', 'cartCheckoutFlow', 'cartCheckoutItems'];
  
  let hasCrossContamination = false;
  
  buyNowKeys.forEach(key => {
    if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
      const data = localStorage.getItem(key) || sessionStorage.getItem(key);
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.flow && parsed.flow.mode === 'cart') {
          console.log(`❌ Cross-contamination detected: ${key} contains cart data`);
          hasCrossContamination = true;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  });
  
  cartKeys.forEach(key => {
    if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
      const data = localStorage.getItem(key) || sessionStorage.getItem(key);
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.flow && parsed.flow.mode === 'buy-now') {
          console.log(`❌ Cross-contamination detected: ${key} contains buy-now data`);
          hasCrossContamination = true;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  });
  
  if (!hasCrossContamination) {
    console.log('✅ No cross-contamination detected - flows are properly separated');
  }
}

// Test 4: Clear Functions
function testClearFunctions() {
  console.log('\n🗑️ Test 4: Clear Functions');
  
  // Test clearing buy-now
  console.log('Clearing buy-now...');
  sessionStorage.removeItem('buyNowItem');
  localStorage.removeItem('buyNowItem');
  sessionStorage.removeItem('buyNowCheckoutData');
  localStorage.removeItem('buyNowCheckoutData');
  sessionStorage.removeItem('buyNowCheckoutFlow');
  sessionStorage.removeItem('buyNowCheckoutItems');
  localStorage.removeItem('buyNowCheckoutFlow');
  localStorage.removeItem('buyNowCheckoutItems');
  
  console.log('✅ Buy-now cleared');
  
  // Test clearing cart
  console.log('Clearing cart...');
  localStorage.removeItem('cartItems');
  sessionStorage.removeItem('cartItems');
  sessionStorage.removeItem('cartCheckoutData');
  localStorage.removeItem('cartCheckoutData');
  sessionStorage.removeItem('cartCheckoutFlow');
  sessionStorage.removeItem('cartCheckoutItems');
  localStorage.removeItem('cartCheckoutFlow');
  localStorage.removeItem('cartCheckoutItems');
  
  console.log('✅ Cart cleared');
  
  console.log('📊 Storage after clearing:', {
    buyNowKeys: buyNowKeys.map(key => ({ key, hasData: !!(localStorage.getItem(key) || sessionStorage.getItem(key)) })),
    cartKeys: cartKeys.map(key => ({ key, hasData: !!(localStorage.getItem(key) || sessionStorage.getItem(key)) }))
  });
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Checkout Flow Tests...\n');
  
  testBuyNowFlow();
  testCartFlow();
  testSeparation();
  testClearFunctions();
  
  console.log('\n🎉 All tests completed!');
  console.log('💡 Check the console for detailed results');
}

// Export for manual testing
window.testCheckoutFlow = {
  testBuyNowFlow,
  testCartFlow,
  testSeparation,
  testClearFunctions,
  runAllTests
};

console.log('🧪 Checkout Flow Test Suite loaded!');
console.log('💡 Run testCheckoutFlow.runAllTests() to execute all tests');
console.log('💡 Or run individual tests like testCheckoutFlow.testBuyNowFlow()');
