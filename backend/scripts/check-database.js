#!/usr/bin/env node

/**
 * 🔍 Database Diagnostic Script
 * Checks which database is connected and what data exists
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity';

console.log('🔍 Database Diagnostic Tool');
console.log('==========================\n');

console.log('📊 Connection Info:');
console.log(`   MONGODB_URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`); // Hide credentials
console.log(`   From .env: ${process.env.MONGODB_URI ? 'Yes' : 'No (using default)'}\n`);

async function diagnose() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        
        const dbName = mongoose.connection.db.databaseName;
        console.log(`✅ Connected to database: "${dbName}"\n`);
        
        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📦 Collections found (${collections.length}):`);
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });
        console.log('');
        
        // Check products
        const Product = mongoose.connection.models.Product || 
            mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
        
        const productCount = await Product.countDocuments();
        console.log(`📦 Products collection: ${productCount} products`);
        
        if (productCount > 0) {
            const sample = await Product.findOne().select('name categorySlug category').lean();
            console.log(`   Sample product: ${sample?.name || 'N/A'}`);
            console.log(`   CategorySlug: ${sample?.categorySlug || 'N/A'}`);
            console.log(`   Category: ${sample?.category || 'N/A'}`);
            
            const categorySlugs = await Product.distinct('categorySlug');
            console.log(`   Unique categorySlugs: ${categorySlugs.length}`);
            if (categorySlugs.length > 0) {
                console.log(`   CategorySlugs: ${categorySlugs.slice(0, 10).join(', ')}${categorySlugs.length > 10 ? '...' : ''}`);
            }
        } else {
            console.log('   ⚠️  NO PRODUCTS FOUND!');
        }
        console.log('');
        
        // Check categories
        const Category = mongoose.connection.models.Category || 
            mongoose.model('Category', new mongoose.Schema({}, { strict: false }), 'categories');
        
        const categoryCount = await Category.countDocuments();
        console.log(`📁 Categories collection: ${categoryCount} categories`);
        
        if (categoryCount > 0) {
            const categories = await Category.find().select('name slug').limit(5).lean();
            console.log(`   Sample categories:`);
            categories.forEach(cat => {
                console.log(`   - ${cat.name} (slug: ${cat.slug})`);
            });
        }
        console.log('');
        
        // Check orders
        const Order = mongoose.connection.models.Order || 
            mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
        
        const orderCount = await Order.countDocuments();
        console.log(`📋 Orders collection: ${orderCount} orders`);
        console.log('');
        
        // Check users
        const User = mongoose.connection.models.User || 
            mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        
        const userCount = await User.countDocuments();
        console.log(`👥 Users collection: ${userCount} users`);
        console.log('');
        
        // List all databases
        const adminDb = mongoose.connection.db.admin();
        const { databases } = await adminDb.listDatabases();
        console.log(`🗄️  All databases on this server:`);
        databases.forEach(db => {
            const isCurrent = db.name === dbName;
            console.log(`   ${isCurrent ? '👉' : '  '} ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Possible issues:');
        console.error('   1. MongoDB is not running');
        console.error('   2. Wrong MONGODB_URI in .env file');
        console.error('   3. Database name is incorrect');
        console.error('   4. Network/firewall issue');
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

diagnose();
