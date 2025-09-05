#!/usr/bin/env node

/**
 * Complete Stock Fix Test Script
 * Tests all aspects of the stock reservation system fixes
 */

import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';
import { reserveStock, atomicBatchReservation, checkStockAvailability } from './backend/utils/stock.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

// Test configuration
const TEST_PRODUCT_ID = '6898bfe1e4b0a1234567890a'; // Replace with actual product ID
const TEST_SIZE = 'L';
const CONCURRENT_USERS = 3;
const AVAILABLE_STOCK = 1;

class StockFixTester {
    constructor() {
        this.testResults = [];
    }

    async connect() {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    }

    async disconnect() {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }

    async setupTestProduct() {
        console.log('🔧 Setting up test product...');
        
        const product = await productModel.findById(TEST_PRODUCT_ID);
        if (!product) {
            console.log('❌ Test product not found. Please update TEST_PRODUCT_ID.');
            process.exit(1);
        }
        
        // Reset stock for clean test
        await productModel.updateOne(
            { _id: TEST_PRODUCT_ID },
            { 
                $set: { 
                    'sizes.$[elem].stock': AVAILABLE_STOCK,
                    'sizes.$[elem].reserved': 0
                }
            },
            { arrayFilters: [{ 'elem.size': TEST_SIZE }] }
        );
        
        console.log(`✅ Test product setup: ${product.name} (${TEST_SIZE}) - Stock: ${AVAILABLE_STOCK}`);
    }

    async testRealtimeStockDisplay() {
        console.log('\n🧪 Test 1: Real-time Stock Display');
        console.log('='.repeat(50));
        
        try {
            // Simulate product API call
            const product = await productModel.findById(TEST_PRODUCT_ID).lean();
            
            // Apply the same transformation as the API
            if (product.sizes && Array.isArray(product.sizes)) {
                product.sizes = product.sizes.map(sizeObj => ({
                    ...sizeObj,
                    availableStock: Math.max(0, (sizeObj.stock || 0) - (sizeObj.reserved || 0)),
                    originalStock: sizeObj.stock || 0,
                    reserved: sizeObj.reserved || 0
                }));
            }
            
            const sizeObj = product.sizes.find(s => s.size === TEST_SIZE);
            const availableStock = sizeObj ? sizeObj.availableStock : 0;
            
            console.log('📊 Stock Display Results:');
            console.log(`   Original Stock: ${sizeObj?.originalStock || 0}`);
            console.log(`   Reserved: ${sizeObj?.reserved || 0}`);
            console.log(`   Available Stock: ${availableStock}`);
            
            if (availableStock === AVAILABLE_STOCK) {
                console.log('✅ Real-time stock display working correctly');
                this.testResults.push({ test: 'Real-time Stock Display', status: 'PASS' });
            } else {
                console.log('❌ Real-time stock display not working');
                this.testResults.push({ test: 'Real-time Stock Display', status: 'FAIL' });
            }
            
        } catch (error) {
            console.error('❌ Real-time stock display test failed:', error);
            this.testResults.push({ test: 'Real-time Stock Display', status: 'ERROR' });
        }
    }

    async testAtomicReservation() {
        console.log('\n🧪 Test 2: Atomic Stock Reservation');
        console.log('='.repeat(50));
        
        const promises = [];
        const results = [];
        
        // Create concurrent reservation attempts
        for (let i = 0; i < CONCURRENT_USERS; i++) {
            const userPromise = this.attemptReservation(i + 1);
            promises.push(userPromise);
        }
        
        // Wait for all attempts
        const allResults = await Promise.allSettled(promises);
        
        allResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push({
                    user: index + 1,
                    success: true,
                    ...result.value
                });
            } else {
                results.push({
                    user: index + 1,
                    success: false,
                    error: result.reason.message
                });
            }
        });
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log('📊 Atomic Reservation Results:');
        console.log(`   Successful: ${successful.length}`);
        console.log(`   Failed: ${failed.length}`);
        
        if (successful.length === AVAILABLE_STOCK) {
            console.log('✅ Atomic reservation working correctly - no overselling');
            this.testResults.push({ test: 'Atomic Reservation', status: 'PASS' });
        } else if (successful.length > AVAILABLE_STOCK) {
            console.log('❌ RACE CONDITION: Overselling detected');
            this.testResults.push({ test: 'Atomic Reservation', status: 'FAIL' });
        } else {
            console.log('⚠️  All reservations failed - check stock availability');
            this.testResults.push({ test: 'Atomic Reservation', status: 'WARN' });
        }
    }

    async attemptReservation(userId) {
        const startTime = Date.now();
        
        try {
            console.log(`👤 User ${userId}: Attempting reservation...`);
            
            const result = await reserveStock(TEST_PRODUCT_ID, TEST_SIZE, 1);
            
            const duration = Date.now() - startTime;
            console.log(`✅ User ${userId}: Success in ${duration}ms`);
            
            return {
                duration,
                modifiedCount: result.modifiedCount,
                message: 'Reservation successful'
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ User ${userId}: Failed in ${duration}ms - ${error.message}`);
            
            return {
                duration,
                error: error.message,
                message: 'Reservation failed'
            };
        }
    }

    async testStockAvailabilityCheck() {
        console.log('\n🧪 Test 3: Stock Availability Check');
        console.log('='.repeat(50));
        
        try {
            // Test availability check
            const availability = await checkStockAvailability(TEST_PRODUCT_ID, TEST_SIZE, 1);
            
            console.log('📊 Availability Check Results:');
            console.log(`   Available: ${availability.available}`);
            console.log(`   Available Stock: ${availability.availableStock}`);
            console.log(`   Current Stock: ${availability.currentStock}`);
            console.log(`   Current Reserved: ${availability.currentReserved}`);
            
            if (availability.available) {
                console.log('✅ Stock availability check working');
                this.testResults.push({ test: 'Stock Availability Check', status: 'PASS' });
            } else {
                console.log('⚠️  Stock not available (expected after reservations)');
                this.testResults.push({ test: 'Stock Availability Check', status: 'WARN' });
            }
            
        } catch (error) {
            console.error('❌ Stock availability check failed:', error);
            this.testResults.push({ test: 'Stock Availability Check', status: 'ERROR' });
        }
    }

    async testBatchReservation() {
        console.log('\n🧪 Test 4: Atomic Batch Reservation');
        console.log('='.repeat(50));
        
        try {
            const items = [
                { productId: TEST_PRODUCT_ID, size: TEST_SIZE, quantity: 1 },
                { productId: TEST_PRODUCT_ID, size: TEST_SIZE, quantity: 1 } // This should fail
            ];
            
            const result = await atomicBatchReservation(items);
            
            console.log('📊 Batch Reservation Results:');
            console.log(`   Success: ${result.success}`);
            console.log(`   Total Items: ${result.totalItems}`);
            console.log(`   Successful Items: ${result.successfulItems}`);
            console.log(`   Failed Items: ${result.failedItems}`);
            
            if (!result.success) {
                console.log('✅ Batch reservation correctly failed (expected)');
                this.testResults.push({ test: 'Atomic Batch Reservation', status: 'PASS' });
            } else {
                console.log('❌ Batch reservation should have failed');
                this.testResults.push({ test: 'Atomic Batch Reservation', status: 'FAIL' });
            }
            
        } catch (error) {
            console.log('✅ Batch reservation correctly failed with error:', error.message);
            this.testResults.push({ test: 'Atomic Batch Reservation', status: 'PASS' });
        }
    }

    async checkFinalStockState() {
        console.log('\n📊 Final Stock State Check');
        console.log('='.repeat(50));
        
        const product = await productModel.findById(TEST_PRODUCT_ID);
        const sizeObj = product.sizes.find(s => s.size === TEST_SIZE);
        
        console.log('Final Stock State:');
        console.log(`   Product: ${product.name}`);
        console.log(`   Size: ${TEST_SIZE}`);
        console.log(`   Stock: ${sizeObj.stock}`);
        console.log(`   Reserved: ${sizeObj.reserved}`);
        console.log(`   Available: ${sizeObj.stock - sizeObj.reserved}`);
    }

    async runAllTests() {
        try {
            console.log('🚀 Starting Complete Stock Fix Tests\n');
            
            await this.connect();
            await this.setupTestProduct();
            
            await this.testRealtimeStockDisplay();
            await this.testAtomicReservation();
            await this.testStockAvailabilityCheck();
            await this.testBatchReservation();
            await this.checkFinalStockState();
            
            // Summary
            console.log('\n' + '='.repeat(60));
            console.log('📋 TEST SUMMARY');
            console.log('='.repeat(60));
            
            this.testResults.forEach(result => {
                const status = result.status === 'PASS' ? '✅' : 
                             result.status === 'FAIL' ? '❌' : 
                             result.status === 'WARN' ? '⚠️ ' : '🔴';
                console.log(`${status} ${result.test}: ${result.status}`);
            });
            
            const passed = this.testResults.filter(r => r.status === 'PASS').length;
            const total = this.testResults.length;
            
            console.log(`\n📊 Results: ${passed}/${total} tests passed`);
            
            if (passed === total) {
                console.log('🎉 All tests passed! Stock fix is working correctly.');
            } else {
                console.log('⚠️  Some tests failed. Please review the results.');
            }
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.disconnect();
        }
    }
}

// Run the tests
const tester = new StockFixTester();
tester.runAllTests();
