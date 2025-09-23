#!/usr/bin/env node

/**
 * 🚀 PRODUCT INDEX MIGRATION SCRIPT
 * 
 * This script creates optimized indexes for the Product collection
 * to handle high-traffic e-commerce queries efficiently.
 * 
 * Usage:
 *   node scripts/create-product-indexes.js
 *   node scripts/create-product-indexes.js --background
 *   node scripts/create-product-indexes.js --drop-existing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

// Index definitions with performance optimization
const INDEXES = [
    // 1. UNIQUE INDEXES
    {
        key: { customId: 1 },
        options: { unique: true, name: 'customId_unique' }
    },

    // 2. SINGLE FIELD INDEXES
    {
        key: { categorySlug: 1 },
        options: { name: 'categorySlug_1' }
    },
    {
        key: { category: 1 },
        options: { name: 'category_1' }
    },
    {
        key: { price: 1 },
        options: { name: 'price_1' }
    },
    {
        key: { inStock: 1 },
        options: { name: 'inStock_1' }
    },
    {
        key: { isNewArrival: 1 },
        options: { name: 'isNewArrival_1' }
    },
    {
        key: { isBestSeller: 1 },
        options: { name: 'isBestSeller_1' }
    },
    {
        key: { sleeveType: 1 },
        options: { name: 'sleeveType_1' }
    },
    {
        key: { 'sizes.size': 1 },
        options: { name: 'sizes.size_1' }
    },
    {
        key: { 'sizes.stock': 1 },
        options: { name: 'sizes.stock_1' }
    },

    // 3. SORTING INDEXES
    {
        key: { createdAt: -1 },
        options: { name: 'createdAt_-1' }
    },
    {
        key: { displayOrder: 1 },
        options: { name: 'displayOrder_1' }
    },
    {
        key: { rating: -1 },
        options: { name: 'rating_-1' }
    },
    {
        key: { updatedAt: -1 },
        options: { name: 'updatedAt_-1' }
    },

    // 4. COMPOUND INDEXES
    {
        key: { categorySlug: 1, inStock: 1 },
        options: { name: 'categorySlug_1_inStock_1' }
    },
    {
        key: { categorySlug: 1, price: 1 },
        options: { name: 'categorySlug_1_price_1' }
    },
    {
        key: { categorySlug: 1, isNewArrival: 1 },
        options: { name: 'categorySlug_1_isNewArrival_1' }
    },
    {
        key: { categorySlug: 1, isBestSeller: 1 },
        options: { name: 'categorySlug_1_isBestSeller_1' }
    },
    {
        key: { categorySlug: 1, sleeveType: 1 },
        options: { name: 'categorySlug_1_sleeveType_1' }
    },
    {
        key: { inStock: 1, price: 1 },
        options: { name: 'inStock_1_price_1' }
    },
    {
        key: { isNewArrival: 1, createdAt: -1 },
        options: { name: 'isNewArrival_1_createdAt_-1' }
    },
    {
        key: { isBestSeller: 1, rating: -1 },
        options: { name: 'isBestSeller_1_rating_-1' }
    },
    {
        key: { 'sizes.size': 1, 'sizes.stock': 1 },
        options: { name: 'sizes.size_1_sizes.stock_1' }
    },
    {
        key: { categorySlug: 1, 'sizes.size': 1 },
        options: { name: 'categorySlug_1_sizes.size_1' }
    },
    {
        key: { displayOrder: 1, categorySlug: 1 },
        options: { name: 'displayOrder_1_categorySlug_1' }
    },
    {
        key: { displayOrder: 1, inStock: 1 },
        options: { name: 'displayOrder_1_inStock_1' }
    },

    // 5. TEXT SEARCH INDEX
    {
        key: { name: 'text', description: 'text', customId: 'text' },
        options: { 
            weights: { name: 10, customId: 8, description: 1 },
            name: 'product_search_index'
        }
    },

    // 6. ADMIN/OPERATIONAL INDEXES
    {
        key: { createdAt: -1, categorySlug: 1 },
        options: { name: 'createdAt_-1_categorySlug_1' }
    },
    {
        key: { updatedAt: -1, categorySlug: 1 },
        options: { name: 'updatedAt_-1_categorySlug_1' }
    },
    {
        key: { _id: 1, customId: 1 },
        options: { name: '_id_1_customId_1' }
    },

    // 7. PARTIAL INDEXES
    {
        key: { categorySlug: 1, price: 1 },
        options: { 
            partialFilterExpression: { inStock: true },
            name: 'category_price_in_stock'
        }
    },
    {
        key: { 'sizes.size': 1, categorySlug: 1 },
        options: {
            partialFilterExpression: { 'sizes.stock': { $gt: 0 } },
            name: 'size_category_with_stock'
        }
    }
];

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

async function getExistingIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    const indexes = await collection.indexes();
    return indexes.map(index => index.name);
}

async function createIndexes(background = false, dropExisting = false) {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    console.log(`\n🚀 Creating ${INDEXES.length} indexes for products collection...`);
    console.log(`📊 Background mode: ${background ? 'Yes' : 'No'}`);
    console.log(`🗑️  Drop existing: ${dropExisting ? 'Yes' : 'No'}\n`);

    if (dropExisting) {
        console.log('⚠️  Dropping existing indexes...');
        try {
            await collection.dropIndexes();
            console.log('✅ All existing indexes dropped');
        } catch (error) {
            console.log('ℹ️  No indexes to drop or error occurred:', error.message);
        }
    }

    const existingIndexes = await getExistingIndexes();
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const indexDef of INDEXES) {
        const indexName = indexDef.options.name;
        
        try {
            if (existingIndexes.includes(indexName) && !dropExisting) {
                console.log(`⏭️  Skipped: ${indexName} (already exists)`);
                skipped++;
                continue;
            }

            const options = {
                ...indexDef.options,
                background: background
            };

            await collection.createIndex(indexDef.key, options);
            console.log(`✅ Created: ${indexName}`);
            created++;
        } catch (error) {
            console.error(`❌ Failed: ${indexName} - ${error.message}`);
            errors++;
        }
    }

    console.log(`\n📊 Index Creation Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📈 Total: ${INDEXES.length}`);
}

async function analyzeIndexes() {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    console.log('\n📊 Analyzing index usage and performance...\n');
    
    try {
        // Get index statistics
        const stats = await db.command({ collStats: 'products' });
        console.log('📈 Collection Statistics:');
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Indexes: ${stats.nindexes}`);
        console.log(`   Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Average Document Size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
        
        // Get index details
        const indexes = await collection.indexes();
        console.log('\n🔍 Index Details:');
        indexes.forEach((index, i) => {
            console.log(`   ${i + 1}. ${index.name}`);
            console.log(`      Key: ${JSON.stringify(index.key)}`);
            if (index.unique) console.log(`      Unique: Yes`);
            if (index.partialFilterExpression) {
                console.log(`      Partial: ${JSON.stringify(index.partialFilterExpression)}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error analyzing indexes:', error.message);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const background = args.includes('--background');
    const dropExisting = args.includes('--drop-existing');
    
    console.log('🚀 PRODUCT INDEX MIGRATION SCRIPT');
    console.log('==================================\n');
    
    await connectToDatabase();
    
    try {
        await createIndexes(background, dropExisting);
        await analyzeIndexes();
        
        console.log('\n✅ Index migration completed successfully!');
        console.log('\n💡 Performance Tips:');
        console.log('   • Monitor query performance with MongoDB Compass');
        console.log('   • Use explain() to analyze query execution plans');
        console.log('   • Consider index usage patterns in production');
        console.log('   • Regular maintenance: db.products.reIndex() if needed');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n⚠️  Migration interrupted by user');
    await mongoose.disconnect();
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error.message);
    await mongoose.disconnect();
    process.exit(1);
});

// Run the migration
main().catch(console.error);
