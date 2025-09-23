#!/usr/bin/env node

/**
 * 🧹 DUPLICATE INDEX CLEANUP SCRIPT
 * 
 * This script removes duplicate indexes identified by the verification script
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function cleanupDuplicateIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    console.log('🧹 CLEANING UP DUPLICATE INDEXES');
    console.log('================================\n');
    
    try {
        // Remove the duplicate full index, keep the partial index
        console.log('Removing duplicate index: categorySlug_1_price_1');
        console.log('Keeping partial index: category_price_in_stock (more efficient)');
        
        await collection.dropIndex('categorySlug_1_price_1');
        console.log('✅ Successfully removed duplicate index');
        
        // Verify the cleanup
        const indexes = await collection.indexes();
        const duplicateCheck = indexes.filter(idx => 
            JSON.stringify(idx.key) === '{"categorySlug":1,"price":1}'
        );
        
        if (duplicateCheck.length === 1) {
            console.log('✅ Duplicate cleanup successful - only one index remains');
            console.log(`   Remaining index: ${duplicateCheck[0].name}`);
        } else {
            console.log('⚠️  Unexpected result after cleanup');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
}

async function main() {
    console.log('🧹 DUPLICATE INDEX CLEANUP SCRIPT');
    console.log('=================================\n');
    
    await connectToDatabase();
    
    try {
        await cleanupDuplicateIndexes();
        console.log('\n✅ Cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the cleanup
main().catch(console.error);
