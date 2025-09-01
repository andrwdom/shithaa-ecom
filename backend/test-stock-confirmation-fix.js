#!/usr/bin/env node

/**
 * Test Stock Confirmation Fix
 * 
 * This script tests the stock confirmation fix with the actual order data
 * to verify that it now works correctly.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
const orderModel = (await import('./models/orderModel.js')).default;
const productModel = (await import('./models/productModel.js')).default;

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

async function testStockConfirmationFix() {
    console.log('🧪 Testing Stock Confirmation Fix...');
    
    await connectDB();
    
    // Test with the actual order that was failing
    const orderId = '68b5c5e8cb7f18b02b5d2efd'; // JSFB order
    console.log(`\n🔍 Testing order: ${orderId}`);
    
    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            console.log('❌ Order not found');
            return;
        }
        
        console.log(`✅ Order found: ${order.orderId}`);
        console.log(`📦 Order items:`, order.items);
        console.log(`🛒 Order cartItems:`, order.cartItems);
        
        // Test the fixed confirmOrderStock function
        const { confirmOrderStock } = await import('./controllers/orderController.js');
        
        console.log('\n🔧 Testing stock confirmation...');
        const result = await confirmOrderStock(orderId);
        
        console.log('✅ Stock confirmation result:', result);
        
    } catch (error) {
        console.error('❌ Stock confirmation test failed:', error.message);
    }
    
    // Test with a product that exists
    console.log('\n🧪 Testing with correct product ID...');
    const correctProductId = '68b3dacceb979de3ddcc9590'; // gsdsdfs product
    const product = await productModel.findById(correctProductId);
    
    if (product) {
        console.log(`✅ Product found: ${product.name}`);
        console.log(`📦 Product sizes:`, product.sizes);
        
        const sizeS = product.sizes.find(s => s.size === 'S');
        if (sizeS) {
            console.log(`✅ Size S found: stock=${sizeS.stock}, reserved=${sizeS.reserved}`);
        }
    }
    
    console.log('\n🎯 Stock confirmation fix test complete');
    process.exit(0);
}

// Run the test
testStockConfirmationFix().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
