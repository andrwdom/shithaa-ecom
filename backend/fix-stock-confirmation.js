#!/usr/bin/env node

/**
 * Stock Confirmation Fix Script
 * 
 * This script fixes the stock confirmation issue where the system can't find
 * matching documents for stock confirmation. The issue occurs when:
 * 1. Product ID is incorrect
 * 2. Size doesn't exist for the product
 * 3. Stock/reserved quantities don't match the criteria
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

async function debugStockConfirmation(productId, size, quantity) {
    console.log(`🔍 Debugging stock confirmation for product: ${productId}, size: ${size}, quantity: ${quantity}`);
    
    try {
        // Check if product exists
        const product = await productModel.findById(productId);
        if (!product) {
            console.log(`❌ Product not found: ${productId}`);
            return false;
        }
        
        console.log(`✅ Product found: ${product.name}`);
        console.log(`📦 Product sizes:`, product.sizes);
        
        // Find the specific size
        const sizeData = product.sizes.find(s => s.size === size);
        if (!sizeData) {
            console.log(`❌ Size '${size}' not found in product. Available sizes:`, product.sizes.map(s => s.size));
            return false;
        }
        
        console.log(`✅ Size found: ${size}`, {
            stock: sizeData.stock,
            reserved: sizeData.reserved,
            requiredQuantity: quantity
        });
        
        // Check if stock is sufficient
        if (sizeData.stock < quantity) {
            console.log(`❌ Insufficient stock: ${sizeData.stock} < ${quantity}`);
            return false;
        }
        
        // Check if reserved is sufficient
        if (sizeData.reserved < quantity) {
            console.log(`❌ Insufficient reserved: ${sizeData.reserved} < ${quantity}`);
            return false;
        }
        
        console.log(`✅ Stock confirmation criteria met`);
        return true;
        
    } catch (error) {
        console.error('❌ Error debugging stock confirmation:', error);
        return false;
    }
}

async function fixStockConfirmation() {
    console.log('🔧 Starting stock confirmation fix...');
    
    await connectDB();
    
    // Test with the problematic product ID from logs
    const testProductId = '68b5c5e8cb7f18b02b5d2eef';
    const testSize = 'S';
    const testQuantity = 1;
    
    console.log('\n🧪 Testing stock confirmation for problematic product...');
    const canConfirm = await debugStockConfirmation(testProductId, testSize, testQuantity);
    
    if (canConfirm) {
        console.log('✅ Stock confirmation should work for this product');
    } else {
        console.log('❌ Stock confirmation will fail for this product');
    }
    
    // Find all products with potential stock issues
    console.log('\n🔍 Scanning for products with stock issues...');
    const products = await productModel.find({
        'sizes.stock': { $lt: 0 }
    });
    
    if (products.length > 0) {
        console.log(`⚠️ Found ${products.length} products with negative stock:`);
        products.forEach(product => {
            console.log(`- ${product.name} (${product._id})`);
            product.sizes.forEach(size => {
                if (size.stock < 0) {
                    console.log(`  Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}`);
                }
            });
        });
    } else {
        console.log('✅ No products with negative stock found');
    }
    
    // Find products with reserved > stock
    const overReservedProducts = await productModel.find({
        'sizes.reserved': { $gt: '$sizes.stock' }
    });
    
    if (overReservedProducts.length > 0) {
        console.log(`⚠️ Found ${overReservedProducts.length} products with over-reserved stock:`);
        overReservedProducts.forEach(product => {
            console.log(`- ${product.name} (${product._id})`);
            product.sizes.forEach(size => {
                if (size.reserved > size.stock) {
                    console.log(`  Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}`);
                }
            });
        });
    } else {
        console.log('✅ No products with over-reserved stock found');
    }
    
    console.log('\n🎯 Stock confirmation fix analysis complete');
    process.exit(0);
}

// Run the fix
fixStockConfirmation().catch(error => {
    console.error('❌ Stock confirmation fix failed:', error);
    process.exit(1);
});
