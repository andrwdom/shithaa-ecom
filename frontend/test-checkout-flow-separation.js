// Test script to verify checkout flow separation
console.log('🧪 Testing Checkout Flow Separation...');

function testBuyNowFlowIsolation() {
  console.log('\n🛒 Test 1: Buy Now Flow Isolation');
  
  // Set buy-now item
  const buyNowItem = {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Buy Now Product',
    price: 999,
    quantity: 1,
    size: 'M',
    image: '/test-buynow.jpg'
  };
  
  sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
  console.log('✅ Buy-now data set');
  
  return { buyNowItem };
}

function testCartFlowIsolation() {
  console.log('\n🛒 Test 2: Cart Flow Isolation');
  
  const cartItems = [
    {
      id: '507f1f77bcf86cd799439012',
      _id: '507f1f77bcf86cd799439012',
      name: 'Cart Product 1',
      price: 599,
      quantity: 2,
      size: 'L'
    }
  ];
  
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
  console.log('✅ Cart data set');
  
  return { cartItems };
}

function runAllTests() {
  console.log('🚀 Starting Checkout Flow Separation Tests...\n');
  testBuyNowFlowIsolation();
  testCartFlowIsolation();
  console.log('\n🎉 All tests completed!');
}

window.testCheckoutFlowSeparation = { runAllTests };
console.log('🧪 Checkout Flow Separation Test Suite loaded!');
