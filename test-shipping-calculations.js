#!/usr/bin/env node

/**
 * COMPREHENSIVE SHIPPING CALCULATION TEST SCRIPT
 * Tests all shipping scenarios to ensure consistency between frontend and backend
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load environment variables from backend/.env
function loadEnv() {
  const envPath = path.join(process.cwd(), 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value.trim();
      }
    });
  }
}

loadEnv();

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Test scenarios
const testScenarios = [
  // Tamil Nadu - Maternity Feeding Wear
  {
    name: 'Tamil Nadu - 1 Maternity Feeding Item',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 1 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 39,
    expectedMessage: '₹39 shipping for 1 maternity feeding item'
  },
  {
    name: 'Tamil Nadu - 2 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 2 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 49,
    expectedMessage: '₹49 shipping for 2 maternity feeding items'
  },
  {
    name: 'Tamil Nadu - 3 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 3 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 59,
    expectedMessage: '₹59 shipping for 3 maternity feeding items'
  },
  {
    name: 'Tamil Nadu - 4 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 4 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 69,
    expectedMessage: '₹69 shipping for 4 maternity feeding items'
  },
  {
    name: 'Tamil Nadu - 5 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 5 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 79,
    expectedMessage: '₹79 shipping for 5 maternity feeding items'
  },
  {
    name: 'Tamil Nadu - 6 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 6 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 89,
    expectedMessage: '₹89 shipping for 6 maternity feeding items'
  },
  {
    name: 'Tamil Nadu - 7+ Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 7 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 99,
    expectedMessage: '₹99 shipping for 7 maternity feeding items'
  },
  
  // Other States - Maternity Feeding Wear
  {
    name: 'Other States - 1 Maternity Feeding Item',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 1 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 49,
    expectedMessage: '₹49 shipping for 1 maternity feeding item'
  },
  {
    name: 'Other States - 2 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 2 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 69,
    expectedMessage: '₹69 shipping for 2 maternity feeding items'
  },
  {
    name: 'Other States - 3 Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 3 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 89,
    expectedMessage: '₹89 shipping for 3 maternity feeding items'
  },
  {
    name: 'Other States - 4+ Maternity Feeding Items',
    items: [{ _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 4 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 109,
    expectedMessage: '₹109 shipping for 4 maternity feeding items'
  },
  
  // Tamil Nadu - Lounge Wear (Free)
  {
    name: 'Tamil Nadu - 1 Lounge Wear Item (Free)',
    items: [{ _id: 'test1', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 1 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 0,
    expectedMessage: 'Free shipping for 1 item within Tamil Nadu!'
  },
  {
    name: 'Tamil Nadu - 3 Lounge Wear Items (Free)',
    items: [{ _id: 'test1', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 3 }],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 0,
    expectedMessage: 'Free shipping for 3 items within Tamil Nadu!'
  },
  
  // Other States - Lounge Wear (Paid)
  {
    name: 'Other States - 1 Lounge Wear Item',
    items: [{ _id: 'test1', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 1 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 39,
    expectedMessage: '₹39 shipping for 1 item'
  },
  {
    name: 'Other States - 2 Lounge Wear Items',
    items: [{ _id: 'test1', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 2 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 59,
    expectedMessage: '₹59 shipping for 2 items'
  },
  {
    name: 'Other States - 3 Lounge Wear Items',
    items: [{ _id: 'test1', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 3 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 89,
    expectedMessage: '₹89 shipping for 3 items'
  },
  {
    name: 'Other States - 4+ Lounge Wear Items',
    items: [{ _id: 'test1', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 4 }],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 105,
    expectedMessage: '₹105 shipping for 4+ items'
  },
  
  // Mixed Cart Scenarios
  {
    name: 'Tamil Nadu - Mixed Cart (2 Maternity + 2 Lounge)',
    items: [
      { _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 2 },
      { _id: 'test2', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 2 }
    ],
    shippingInfo: { state: 'Tamil Nadu' },
    expectedCost: 49,
    expectedMessage: '₹49 shipping for 2 maternity feeding items, 2 lounge wear items free'
  },
  {
    name: 'Other States - Mixed Cart (1 Maternity + 1 Lounge)',
    items: [
      { _id: 'test1', category: 'Maternity Feeding Wear', categorySlug: 'maternity-feeding-wear', quantity: 1 },
      { _id: 'test2', category: 'Zipless Feeding Lounge Wear', categorySlug: 'zipless-feeding-lounge-wear', quantity: 1 }
    ],
    shippingInfo: { state: 'Karnataka' },
    expectedCost: 88, // 49 + 39
    expectedMessage: '₹88 shipping for 2 items' // This will be calculated as total items
  }
];

async function testShippingCalculation(scenario) {
  try {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    
    // Test backend API
    const response = await fetch('http://localhost:4000/api/shipping/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: scenario.items,
        shippingInfo: scenario.shippingInfo
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`API Error: ${result.message}`);
    }
    
    const { shippingCost, shippingMessage } = result.data;
    
    // Check if results match expectations
    const costMatch = shippingCost === scenario.expectedCost;
    const messageMatch = shippingMessage.includes(scenario.expectedMessage.split('₹')[1]?.split(' ')[0] || '0');
    
    if (costMatch && messageMatch) {
      console.log(`✅ PASS: Cost ₹${shippingCost}, Message: "${shippingMessage}"`);
      return { success: true, scenario: scenario.name };
    } else {
      console.log(`❌ FAIL: Expected ₹${scenario.expectedCost}, Got ₹${shippingCost}`);
      console.log(`   Expected Message: "${scenario.expectedMessage}"`);
      console.log(`   Actual Message: "${shippingMessage}"`);
      return { success: false, scenario: scenario.name, expected: scenario.expectedCost, actual: shippingCost };
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { success: false, scenario: scenario.name, error: error.message };
  }
}

async function main() {
  console.log('🧪 COMPREHENSIVE SHIPPING CALCULATION TEST');
  console.log('==========================================');
  
  await connectDB();
  
  try {
    const results = [];
    
    for (const scenario of testScenarios) {
      const result = await testShippingCalculation(scenario);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.scenario}: ${result.error || `Expected ₹${result.expected}, Got ₹${result.actual}`}`);
      });
    }
    
    if (passed === results.length) {
      console.log('\n🎉 ALL TESTS PASSED! Shipping calculations are working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the shipping logic.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test suite
main().catch(console.error);
