#!/usr/bin/env node

/**
 * SHIPPING RULES VALIDATION AND SEEDING SCRIPT
 * Ensures shipping rules are correctly configured in the database
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

// Import the ShippingRules model
import ShippingRules from './backend/models/ShippingRules.js';

// Define the correct shipping rules
const correctShippingRules = {
  'maternity-feeding-wear': {
    categoryName: 'Maternity Feeding Wear',
    rules: {
      tamilNadu: new Map([
        ['1', 39],
        ['2', 49],
        ['3', 59],
        ['4', 69],
        ['5', 79],
        ['6', 89],
        ['7+', 99]
      ]),
      otherStates: new Map([
        ['1', 49],
        ['2', 69],
        ['3', 89],
        ['4+', 109]
      ])
    }
  },
  'zipless-feeding-lounge-wear': {
    categoryName: 'Zipless Feeding Lounge Wear',
    rules: {
      tamilNadu: new Map([
        ['1', 0],  // Free shipping in Tamil Nadu
        ['2', 0],
        ['3', 0],
        ['4', 0],
        ['5', 0],
        ['6', 0],
        ['7+', 0]
      ]),
      otherStates: new Map([
        ['1', 39],
        ['2', 49],
        ['3', 59],
        ['4+', 69]
      ])
    }
  },
  'non-feeding-lounge-wear': {
    categoryName: 'Non-Feeding Lounge Wear',
    rules: {
      tamilNadu: new Map([
        ['1', 0],  // Free shipping in Tamil Nadu
        ['2', 0],
        ['3', 0],
        ['4', 0],
        ['5', 0],
        ['6', 0],
        ['7+', 0]
      ]),
      otherStates: new Map([
        ['1', 39],
        ['2', 49],
        ['3', 59],
        ['4+', 69]
      ])
    }
  },
  'zipless-feeding-dupatta-lounge-wear': {
    categoryName: 'Zipless Feeding Dupatta Lounge Wear',
    rules: {
      tamilNadu: new Map([
        ['1', 0],  // Free shipping in Tamil Nadu
        ['2', 0],
        ['3', 0],
        ['4', 0],
        ['5', 0],
        ['6', 0],
        ['7+', 0]
      ]),
      otherStates: new Map([
        ['1', 39],
        ['2', 49],
        ['3', 59],
        ['4+', 69]
      ])
    }
  }
};

async function validateAndFixShippingRules() {
  console.log('🔍 Validating and fixing shipping rules...');
  
  const results = [];
  
  for (const [category, correctRule] of Object.entries(correctShippingRules)) {
    console.log(`\n📋 Checking category: ${category}`);
    
    try {
      // Find existing rule
      let existingRule = await ShippingRules.findOne({ category });
      
      if (!existingRule) {
        console.log(`⚠️  No rule found for ${category}, creating...`);
        existingRule = new ShippingRules({
          category,
          ...correctRule,
          isActive: true
        });
        await existingRule.save();
        console.log(`✅ Created rule for ${category}`);
        results.push({ category, action: 'created', success: true });
        continue;
      }
      
      // Check if rule matches expected values
      let needsUpdate = false;
      const updates = {};
      
      // Check category name
      if (existingRule.categoryName !== correctRule.categoryName) {
        updates.categoryName = correctRule.categoryName;
        needsUpdate = true;
        console.log(`⚠️  Category name mismatch: ${existingRule.categoryName} → ${correctRule.categoryName}`);
      }
      
      // Check Tamil Nadu rules
      for (const [quantity, expectedCost] of correctRule.rules.tamilNadu) {
        const actualCost = existingRule.rules.tamilNadu.get(quantity);
        if (actualCost !== expectedCost) {
          if (!updates.rules) updates.rules = {};
          if (!updates.rules.tamilNadu) updates.rules.tamilNadu = existingRule.rules.tamilNadu;
          updates.rules.tamilNadu.set(quantity, expectedCost);
          needsUpdate = true;
          console.log(`⚠️  Tamil Nadu ${quantity}: ${actualCost} → ${expectedCost}`);
        }
      }
      
      // Check Other States rules
      for (const [quantity, expectedCost] of correctRule.rules.otherStates) {
        const actualCost = existingRule.rules.otherStates.get(quantity);
        if (actualCost !== expectedCost) {
          if (!updates.rules) updates.rules = {};
          if (!updates.rules.otherStates) updates.rules.otherStates = existingRule.rules.otherStates;
          updates.rules.otherStates.set(quantity, expectedCost);
          needsUpdate = true;
          console.log(`⚠️  Other States ${quantity}: ${actualCost} → ${expectedCost}`);
        }
      }
      
      // Check if rule is active
      if (!existingRule.isActive) {
        updates.isActive = true;
        needsUpdate = true;
        console.log(`⚠️  Rule is inactive, activating...`);
      }
      
      if (needsUpdate) {
        await ShippingRules.findByIdAndUpdate(existingRule._id, updates);
        console.log(`✅ Updated rule for ${category}`);
        results.push({ category, action: 'updated', success: true });
      } else {
        console.log(`✅ Rule for ${category} is correct`);
        results.push({ category, action: 'validated', success: true });
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${category}:`, error.message);
      results.push({ category, action: 'error', success: false, error: error.message });
    }
  }
  
  return results;
}

async function testShippingRules() {
  console.log('\n🧪 Testing shipping rules...');
  
  const testCases = [
    {
      category: 'maternity-feeding-wear',
      quantity: 1,
      state: 'Tamil Nadu',
      expectedCost: 39
    },
    {
      category: 'maternity-feeding-wear',
      quantity: 2,
      state: 'Tamil Nadu',
      expectedCost: 49
    },
    {
      category: 'maternity-feeding-wear',
      quantity: 1,
      state: 'Karnataka',
      expectedCost: 49
    },
    {
      category: 'zipless-feeding-lounge-wear',
      quantity: 1,
      state: 'Tamil Nadu',
      expectedCost: 0
    },
    {
      category: 'zipless-feeding-lounge-wear',
      quantity: 1,
      state: 'Karnataka',
      expectedCost: 39
    }
  ];
  
  const testResults = [];
  
  for (const testCase of testCases) {
    try {
      const result = await ShippingRules.calculateShipping(
        testCase.category,
        testCase.quantity,
        testCase.state
      );
      
      if (result && result.shippingCost === testCase.expectedCost) {
        console.log(`✅ ${testCase.category} - ${testCase.quantity} items in ${testCase.state}: ₹${result.shippingCost}`);
        testResults.push({ ...testCase, success: true });
      } else {
        console.log(`❌ ${testCase.category} - ${testCase.quantity} items in ${testCase.state}: Expected ₹${testCase.expectedCost}, Got ₹${result?.shippingCost || 'null'}`);
        testResults.push({ ...testCase, success: false, actual: result?.shippingCost });
      }
    } catch (error) {
      console.log(`❌ ${testCase.category} - Error: ${error.message}`);
      testResults.push({ ...testCase, success: false, error: error.message });
    }
  }
  
  return testResults;
}

async function main() {
  console.log('🔧 SHIPPING RULES VALIDATION AND SEEDING');
  console.log('==========================================');
  
  await connectDB();
  
  try {
    // Step 1: Validate and fix shipping rules
    const validationResults = await validateAndFixShippingRules();
    
    // Step 2: Test shipping rules
    const testResults = await testShippingRules();
    
    // Summary
    console.log('\n📊 VALIDATION RESULTS:');
    console.log('=======================');
    
    const validated = validationResults.filter(r => r.success).length;
    const failed = validationResults.filter(r => !r.success).length;
    
    console.log(`✅ Validated/Fixed: ${validated}/${validationResults.length}`);
    console.log(`❌ Failed: ${failed}/${validationResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ VALIDATION FAILURES:');
      validationResults.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.category}: ${result.error}`);
      });
    }
    
    console.log('\n📊 TEST RESULTS:');
    console.log('=================');
    
    const testsPassed = testResults.filter(r => r.success).length;
    const testsFailed = testResults.filter(r => !r.success).length;
    
    console.log(`✅ Tests Passed: ${testsPassed}/${testResults.length}`);
    console.log(`❌ Tests Failed: ${testsFailed}/${testResults.length}`);
    
    if (testsFailed > 0) {
      console.log('\n❌ TEST FAILURES:');
      testResults.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.category} (${result.quantity} items in ${result.state}): ${result.error || `Expected ₹${result.expectedCost}, Got ₹${result.actual}`}`);
      });
    }
    
    if (validated === validationResults.length && testsPassed === testResults.length) {
      console.log('\n🎉 ALL SHIPPING RULES ARE CORRECTLY CONFIGURED!');
    } else {
      console.log('\n⚠️  Some issues found. Please review the results above.');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error);
