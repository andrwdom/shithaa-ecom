import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha-maternity',
  testUserId: 'test-user-123',
  testProductId: 'test-product-123'
};

// Test data
const TEST_PRODUCT = {
  _id: TEST_CONFIG.testProductId,
  name: 'Test Product',
  price: 499,
  sizes: [
    { size: 'S', stock: 5 },
    { size: 'M', stock: 3 },
    { size: 'L', stock: 2 }
  ]
};

const TEST_USER = {
  _id: TEST_CONFIG.testUserId,
  cartData: {}
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Add item within stock limit',
    operation: 'add',
    size: 'M',
    quantity: 2,
    expectedStock: 1,
    shouldSucceed: true
  },
  {
    name: 'Add item exceeding stock limit',
    operation: 'add',
    size: 'M',
    quantity: 4,
    expectedStock: 3,
    shouldSucceed: false
  },
  {
    name: 'Update quantity within stock limit',
    operation: 'update',
    size: 'S',
    quantity: 3,
    expectedStock: 2,
    shouldSucceed: true
  },
  {
    name: 'Update quantity exceeding stock limit',
    operation: 'update',
    size: 'S',
    quantity: 6,
    expectedStock: 5,
    shouldSucceed: false
  },
  {
    name: 'Add multiple items to same size',
    operation: 'add_multiple',
    size: 'L',
    quantities: [1, 1],
    expectedStock: 0,
    shouldSucceed: true
  },
  {
    name: 'Add item to out of stock size',
    operation: 'add',
    size: 'L',
    quantity: 1,
    expectedStock: 0,
    shouldSucceed: false
  }
];

class StockValidationTester {
  constructor() {
    this.db = null;
    this.client = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(TEST_CONFIG.mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✅ Disconnected from MongoDB');
    }
  }

  async setupTestData() {
    try {
      // Clear existing test data
      await this.db.collection('products').deleteOne({ _id: TEST_CONFIG.testProductId });
      await this.db.collection('users').deleteOne({ _id: TEST_CONFIG.testUserId });

      // Insert test product
      await this.db.collection('products').insertOne(TEST_PRODUCT);
      console.log('✅ Test product created');

      // Insert test user
      await this.db.collection('users').insertOne(TEST_USER);
      // console.log('✅ Test user created');

      return true;
    } catch (error) {
      console.error('❌ Failed to setup test data:', error);
      return false;
    }
  }

  async testCartOperation(scenario) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    
    try {
      let result;
      
      switch (scenario.operation) {
        case 'add':
          result = await this.testAddToCart(scenario.size, scenario.quantity);
          break;
        case 'update':
          result = await this.testUpdateCart(scenario.size, scenario.quantity);
          break;
        case 'add_multiple':
          result = await this.testAddMultipleItems(scenario.size, scenario.quantities);
          break;
        default:
          throw new Error(`Unknown operation: ${scenario.operation}`);
      }

      // Verify stock levels
      const currentStock = await this.getCurrentStock(scenario.size);
      console.log(`📊 Current stock for size ${scenario.size}: ${currentStock}`);

      if (scenario.shouldSucceed) {
        if (currentStock === scenario.expectedStock) {
          console.log('✅ Test PASSED - Stock validation working correctly');
        } else {
          console.log(`❌ Test FAILED - Expected stock: ${scenario.expectedStock}, Got: ${currentStock}`);
        }
      } else {
        if (currentStock === TEST_PRODUCT.sizes.find(s => s.size === scenario.size).stock) {
          console.log('✅ Test PASSED - Stock validation prevented invalid operation');
        } else {
          console.log('❌ Test FAILED - Stock validation failed to prevent invalid operation');
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ Test ERROR: ${error.message}`);
      return null;
    }
  }

  async testAddToCart(size, quantity) {
    const url = `${process.env.API_URL || 'http://localhost:4000'}/api/cart/add`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': 'test-token'
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.testUserId,
        itemId: TEST_CONFIG.testProductId,
        size,
        quantity
      })
    });

    const result = await response.json();
    console.log(`📤 Add to cart response:`, result);
    
    return { success: response.ok, data: result };
  }

  async testUpdateCart(size, quantity) {
    const url = `${process.env.API_URL || 'http://localhost:4000'}/api/cart/update`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': 'test-token'
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.testUserId,
        itemId: TEST_CONFIG.testProductId,
        size,
        quantity
      })
    });

    const result = await response.json();
    console.log(`📤 Update cart response:`, result);
    
    return { success: response.ok, data: result };
  }

  async testAddMultipleItems(size, quantities) {
    let success = true;
    for (const quantity of quantities) {
      const result = await this.testAddToCart(size, quantity);
      if (!result.success) {
        success = false;
        break;
      }
    }
    return { success };
  }

  async getCurrentStock(size) {
    const product = await this.db.collection('products').findOne({ _id: TEST_CONFIG.testProductId });
    const sizeObj = product.sizes.find(s => s.size === size);
    return sizeObj ? sizeObj.stock : 0;
  }

  async runAllTests() {
    console.log('🚀 Starting Stock Validation Tests...\n');
    
    try {
      await this.connect();
      
      if (!(await this.setupTestData())) {
        throw new Error('Failed to setup test data');
      }

      let passedTests = 0;
      let totalTests = TEST_SCENARIOS.length;

      for (const scenario of TEST_SCENARIOS) {
        const result = await this.testCartOperation(scenario);
        if (result && result.success === scenario.shouldSucceed) {
          passedTests++;
        }
      }

      console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
      
      if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Stock validation is working correctly.');
      } else {
        console.log('⚠️  Some tests failed. Please review the implementation.');
      }

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new StockValidationTester();
  tester.runAllTests();
}

export default StockValidationTester; 