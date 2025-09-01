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
const orderModel = (await import('./models/orderModel.js')).default;

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
        
        // Try to find similar products or the correct product ID
        console.log('\n🔍 Searching for similar products...');
        const similarProducts = await productModel.find({
            $or: [
                { name: { $regex: 'gsdsdfs', $options: 'i' } },
                { name: { $regex: 'test', $options: 'i' } },
                { name: { $regex: 'product', $options: 'i' } }
            ]
        }).limit(5);
        
        if (similarProducts.length > 0) {
            console.log('📦 Found similar products:');
            similarProducts.forEach(product => {
                console.log(`- ${product.name} (${product._id})`);
                const sizeS = product.sizes.find(s => s.size === 'S');
                if (sizeS) {
                    console.log(`  Size S: stock=${sizeS.stock}, reserved=${sizeS.reserved}`);
                }
            });
        } else {
            console.log('❌ No similar products found');
        }
        
        // Check recent orders to see what product IDs are being used
        console.log('\n🔍 Checking recent orders for product IDs...');
        const recentOrders = await orderModel.find({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).limit(5);
        
        if (recentOrders.length > 0) {
            console.log('📦 Recent orders with product IDs:');
            recentOrders.forEach(order => {
                console.log(`Order: ${order.orderId} (${order._id})`);
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        console.log(`  - ${item.name}: ${item._id || item.productId || item.product}`);
                    });
                }
            });
        } else {
            console.log('❌ No recent orders found');
        }
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
    
    // Find products with reserved > stock (using aggregation)
    const overReservedProducts = await productModel.aggregate([
        {
            $unwind: '$sizes'
        },
        {
            $match: {
                $expr: {
                    $gt: ['$sizes.reserved', '$sizes.stock']
                }
            }
        },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                sizes: { $push: '$sizes' }
            }
        }
    ]);
    
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
