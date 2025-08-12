// Simple cart test script
console.log('Testing cart functionality...')

// Test localStorage
const testCart = [
  {
    id: 'test-product-1',
    _id: 'test-product-1',
    name: 'Test Product',
    price: 100,
    quantity: 2,
    size: 'M',
    image: '/placeholder.svg',
    category: 'Test Category'
  }
]

// Test localStorage operations
console.log('Setting test cart in localStorage...')
localStorage.setItem('cartItems', JSON.stringify(testCart))

console.log('Reading from localStorage...')
const stored = localStorage.getItem('cartItems')
console.log('Stored cart:', stored)

const parsed = JSON.parse(stored)
console.log('Parsed cart:', parsed)
console.log('Cart items count:', parsed.length)

// Test cart state management
let cartItems = []
cartItems = [...cartItems, ...testCart]
console.log('Updated cart items:', cartItems)

// Test adding another item
const newItem = {
  id: 'test-product-2',
  _id: 'test-product-2',
  name: 'Test Product 2',
  price: 150,
  quantity: 1,
  size: 'L',
  image: '/placeholder.svg',
  category: 'Test Category'
}

cartItems = [...cartItems, newItem]
console.log('Cart after adding new item:', cartItems)
console.log('Final cart count:', cartItems.length)

// Save to localStorage
localStorage.setItem('cartItems', JSON.stringify(cartItems))
console.log('Cart saved to localStorage')

// Verify
const finalStored = localStorage.getItem('cartItems')
const finalParsed = JSON.parse(finalStored)
console.log('Final verification - Cart items count:', finalParsed.length) 