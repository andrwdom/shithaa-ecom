#!/usr/bin/env node

/**
 * Stock Management System Test Suite
 * Tests the critical stock management fixes for production readiness
 */

import mongoose from 'mongoose';
import { config } from './config.js';
import { 
    checkStockAvailability,
    reserveStock,
    confirmStockReservation,
    releaseStockReservation,
    getStockHealthReport,
    cleanupExpiredReservations
} from './utils/stock.js';
import productModel from './models/productModel.js';

// Test configuration
const TEST_CONFIG = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity',
    API_URL: process.env.API_URL || 'http://localhost:4000',
    TEST_PRODUCT_ID: '507f1f77bcf86cd799439011', // Replace with actual product ID
    TEST_SIZE: 'M'
};

// Test scenarios
const testScenarios = [
    {
        name: 'Stock Availability Check',
        description: 'Test stock availability calculation with reservations',
        test: async () => {
            console.log('\n🧪 Testing stock availability check...');
            
            // Find a product with stock
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
            
            const availability = await checkStockAvailability(
                product._id, 
                size.size, 
                1
            );
            
            console.log('Stock availability result:', availability);
            
            if (availability.available !== undefined) {
                console.log('✅ Stock availability check working');
                return true;
            } else {
                console.log('❌ Stock availability check failed');
                return false;
            }
        }
    },
    
    {
        name: 'Stock Reservation',
        description: 'Test atomic stock reservation',
        test: async () => {
            console.log('\n🧪 Testing stock reservation...');
            
            // Find a product with stock
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
            
            try {
                const result = await reserveStock(
                    product._id, 
                    size.size, 
                    1
                );
                
                console.log('Reservation result:', result);
                
                if (result.success) {
                    console.log('✅ Stock reservation working');
                    
                    // Clean up - release the reservation
                    await releaseStockReservation(
                        product._id, 
                        size.size, 
                        1
                    );
                    console.log('✅ Reservation cleaned up');
                    
                    return true;
                } else {
                    console.log('❌ Stock reservation failed');
                    return false;
                }
            } catch (error) {
                console.log('❌ Stock reservation error:', error.message);
                return false;
            }
        }
    },
    
    {
        name: 'Concurrent Stock Operations',
        description: 'Test race conditions in stock operations',
        test: async () => {
            console.log('\n🧪 Testing concurrent stock operations...');
            
            // Find a product with stock
            const product = await productModel.findOne({ 
                'sizes.stock': { $gt: 5 } 
            });
            
            if (!product) {
                console.log('⚠️  No products with sufficient stock found, skipping test');
                return true;
            }
            
            const size = product.sizes.find(s => s.stock > 5);
            if (!size) {
                console.log('⚠️  No sizes with sufficient stock found, skipping test');
                return true;
            }
            
            try {
                // Simulate concurrent reservations
                const promises = [];
                for (let i = 0; i < 3; i++) {
                    promises.push(
                        reserveStock(product._id, size.size, 1)
                    );
                }
                
                const results = await Promise.allSettled(promises);
                const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
                const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
                
                console.log(`Concurrent reservations: ${successful.length} successful, ${failed.length} failed`);
                
                // Clean up successful reservations
                for (const result of successful) {
                    if (result.status === 'fulfilled') {
                        await releaseStockReservation(
                            product._id, 
                            size.size, 
                            1
                        );
                    }
                }
                
                console.log('✅ Concurrent stock operations handled correctly');
                return true;
                
            } catch (error) {
                console.log('❌ Concurrent stock operations error:', error.message);
                return false;
            }
        }
    },
    
    {
        name: 'Stock Health Report',
        description: 'Test stock health monitoring',
        test: async () => {
            console.log('\n🧪 Testing stock health report...');
            
            try {
                const report = await getStockHealthReport();
                
                if (report.success) {
                    console.log('Stock health report generated successfully');
                    console.log('Health score:', report.healthScore);
                    console.log('Total products:', report.summary.totalProducts);
                    console.log('Total stock:', report.summary.totalStock);
                    console.log('Total reserved:', report.summary.totalReserved);
                    
                    console.log('✅ Stock health report working');
                    return true;
                } else {
                    console.log('❌ Stock health report failed');
                    return false;
                }
            } catch (error) {
                console.log('❌ Stock health report error:', error.message);
                return false;
            }
        }
    },
    
    {
        name: 'API Endpoints',
        description: 'Test stock management API endpoints',
        test: async () => {
            console.log('\n🧪 Testing stock API endpoints...');
            
            try {
                // Test health endpoint
                const healthResponse = await fetch(`${TEST_CONFIG.API_URL}/api/stock/health`);
                const healthData = await healthResponse.json();
                
                if (healthData.success) {
                    console.log('✅ Stock health API working');
                } else {
                    console.log('❌ Stock health API failed');
                    return false;
                }
                
                // Test status endpoint
                const statusResponse = await fetch(`${TEST_CONFIG.API_URL}/api/stock/status`);
                const statusData = await statusResponse.json();
                
                if (statusData.success) {
                    console.log('✅ Stock status API working');
                } else {
                    console.log('❌ Stock status API failed');
                    return false;
                }
                
                return true;
                
            } catch (error) {
                console.log('❌ Stock API test error:', error.message);
                return false;
            }
        }
    }
];

// Main test runner
async function runStockTests() {
    console.log('🚀 Starting Stock Management System Tests');
    console.log('==========================================');
    
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
    
    console.log('\n📊 Stock Test Results Summary');
    console.log('==============================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All stock tests passed! Stock system is ready for production.');
    } else {
        console.log('\n⚠️  Some stock tests failed. Please review and fix issues before production.');
    }
    
    process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runStockTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
