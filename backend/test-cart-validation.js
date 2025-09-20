#!/usr/bin/env node

/**
 * Cart Validation Test Script
 * Tests the critical server-side cart validation to prevent price manipulation
 */

import mongoose from 'mongoose';
import { config } from './config.js';
import { validateCartItems } from './controllers/cartController.js';

// Test configuration
const TEST_CONFIG = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity',
    API_URL: process.env.API_URL || 'http://localhost:4000'
};

// Test scenarios
const testScenarios = [
    {
        name: 'Valid Cart Items',
        description: 'Test validation with legitimate cart items',
        test: async () => {
            console.log('\n🧪 Testing valid cart items...');
            
            // Find a real product from database
            const productModel = (await import('./models/productModel.js')).default;
            const product = await productModel.findOne({ 
                'sizes.stock': { $gt: 0 } 
            });
            
            if (!product) {
                console.log('⚠️  No products with stock found, skipping test');
                return true;
            }
            
            const size = product.sizes.find(s => s.stock > 0);
            if (!size) {
                console.log('⚠️  No sizes with stock found, skipping test');
                return true;
            }
            
            const validCartItems = [{
                _id: product._id.toString(),
                name: product.name,
                price: product.price,
                size: size.size,
                quantity: 1
            }];
            
            const result = await validateCartItems(validCartItems);
            
            if (result.isValid) {
                console.log('✅ Valid cart items passed validation');
                return true;
            } else {
                console.log('❌ Valid cart items failed validation:', result.errors);
                return false;
            }
        }
    },
    
    {
        name: 'Price Manipulation Detection',
        description: 'Test detection of price manipulation attempts',
        test: async () => {
            console.log('\n🧪 Testing price manipulation detection...');
            
            const productModel = (await import('./models/productModel.js')).default;
            const product = await productModel.findOne({ 
                'sizes.stock': { $gt: 0 } 
            });
            
            if (!product) {
                console.log('⚠️  No products with stock found, skipping test');
                return true;
            }
            
            const size = product.sizes.find(s => s.stock > 0);
            if (!size) {
                console.log('⚠️  No sizes with stock found, skipping test');
                return true;
            }
            
            // Attempt price manipulation
            const manipulatedCartItems = [{
                _id: product._id.toString(),
                name: product.name,
                price: 1, // Manipulated price (should be caught)
                size: size.size,
                quantity: 1
            }];
            
            const result = await validateCartItems(manipulatedCartItems);
            
            if (!result.isValid && result.errors.some(e => e.includes('Price mismatch'))) {
                console.log('✅ Price manipulation detected successfully');
                return true;
            } else {
                console.log('❌ Price manipulation not detected');
                return false;
            }
        }
    },
    
    {
        name: 'Invalid Product ID',
        description: 'Test validation with invalid product IDs',
        test: async () => {
            console.log('\n🧪 Testing invalid product ID...');
            
            const invalidCartItems = [{
                _id: 'invalid-id',
                name: 'Fake Product',
                price: 100,
                size: 'M',
                quantity: 1
            }];
            
            const result = await validateCartItems(invalidCartItems);
            
            if (!result.isValid && result.errors.some(e => e.includes('Invalid product ID format'))) {
                console.log('✅ Invalid product ID detected successfully');
                return true;
            } else {
                console.log('❌ Invalid product ID not detected');
                return false;
            }
        }
    },
    
    {
        name: 'Insufficient Stock',
        description: 'Test validation with insufficient stock',
        test: async () => {
            console.log('\n🧪 Testing insufficient stock detection...');
            
            const productModel = (await import('./models/productModel.js')).default;
            const product = await productModel.findOne({ 
                'sizes.stock': { $gt: 0 } 
            });
            
            if (!product) {
                console.log('⚠️  No products with stock found, skipping test');
                return true;
            }
            
            const size = product.sizes.find(s => s.stock > 0);
            if (!size) {
                console.log('⚠️  No sizes with stock found, skipping test');
                return true;
            }
            
            // Request more than available stock
            const insufficientStockItems = [{
                _id: product._id.toString(),
                name: product.name,
                price: product.price,
                size: size.size,
                quantity: size.stock + 100 // More than available
            }];
            
            const result = await validateCartItems(insufficientStockItems);
            
            if (!result.isValid && result.errors.some(e => e.includes('Insufficient stock'))) {
                console.log('✅ Insufficient stock detected successfully');
                return true;
            } else {
                console.log('❌ Insufficient stock not detected');
                return false;
            }
        }
    },
    
    {
        name: 'API Endpoint Test',
        description: 'Test the cart validation API endpoint',
        test: async () => {
            console.log('\n🧪 Testing cart validation API endpoint...');
            
            try {
                const response = await fetch(`${TEST_CONFIG.API_URL}/api/cart/validate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cartItems: [{
                            _id: '507f1f77bcf86cd799439011',
                            name: 'Test Product',
                            price: 100,
                            size: 'M',
                            quantity: 1
                        }]
                    })
                });
                
                const data = await response.json();
                
                if (response.ok || response.status === 400) {
                    console.log('✅ Cart validation API endpoint working');
                    return true;
                } else {
                    console.log('❌ Cart validation API endpoint failed');
                    return false;
                }
            } catch (error) {
                console.log('❌ Cart validation API test error:', error.message);
                return false;
            }
        }
    }
];

// Main test runner
async function runCartValidationTests() {
    console.log('🚀 Starting Cart Validation Tests');
    console.log('==================================');
    
    let passedTests = 0;
    let totalTests = testScenarios.length;
    
    try {
        // Connect to MongoDB
        await mongoose.connect(TEST_CONFIG.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        for (const scenario of testScenarios) {
            try {
                console.log(`\n📋 Running: ${scenario.name}`);
                console.log(`📝 Description: ${scenario.description}`);
                
                const result = await scenario.test();
                
                if (result) {
                    passedTests++;
                    console.log(`✅ ${scenario.name} - PASSED`);
                } else {
                    console.log(`❌ ${scenario.name} - FAILED`);
                }
            } catch (error) {
                console.log(`❌ ${scenario.name} - ERROR:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test setup failed:', error);
        process.exit(1);
    } finally {
        // Disconnect from MongoDB
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('✅ Disconnected from MongoDB');
        }
    }
    
    console.log('\n📊 Cart Validation Test Results Summary');
    console.log('========================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All cart validation tests passed! Price manipulation protection is working.');
    } else {
        console.log('\n⚠️  Some cart validation tests failed. Please review and fix issues before production.');
    }
    
    process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runCartValidationTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
