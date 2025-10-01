#!/usr/bin/env node

/**
 * 🚀 COMPREHENSIVE DATABASE INDEX OPTIMIZATION SCRIPT
 * Amazon-Level Database Performance Implementation
 * 
 * This script creates optimized indexes for ALL collections to handle 
 * high-traffic e-commerce queries with sub-millisecond response times.
 * 
 * Usage:
 *   node scripts/create-comprehensive-indexes.js
 *   node scripts/create-comprehensive-indexes.js --background
 *   node scripts/create-comprehensive-indexes.js --analyze-only
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

// 🎯 AMAZON-LEVEL INDEX STRATEGY
const COLLECTION_INDEXES = {
    // =====================================================================================
    // PRODUCTS COLLECTION - E-commerce Product Catalog Optimization
    // =====================================================================================
    products: [
        // 1. UNIQUE CONSTRAINTS
        {
            key: { customId: 1 },
            options: { unique: true, name: 'customId_unique', background: true }
        },

        // 2. PRIMARY QUERY PATTERNS - Single Field Indexes
        {
            key: { categorySlug: 1 },
            options: { name: 'categorySlug_1', background: true }
        },
        {
            key: { category: 1 },
            options: { name: 'category_1', background: true }
        },
        {
            key: { price: 1 },
            options: { name: 'price_1', background: true }
        },
        {
            key: { inStock: 1 },
            options: { name: 'inStock_1', background: true }
        },
        {
            key: { isNewArrival: 1 },
            options: { name: 'isNewArrival_1', background: true }
        },
        {
            key: { isBestSeller: 1 },
            options: { name: 'isBestSeller_1', background: true }
        },
        {
            key: { sleeveType: 1 },
            options: { name: 'sleeveType_1', background: true }
        },

        // 3. NESTED FIELD INDEXES - Size and Stock Management
        {
            key: { 'sizes.size': 1 },
            options: { name: 'sizes.size_1', background: true }
        },
        {
            key: { 'sizes.stock': 1 },
            options: { name: 'sizes.stock_1', background: true }
        },

        // 4. SORTING OPTIMIZATIONS
        {
            key: { createdAt: -1 },
            options: { name: 'createdAt_desc', background: true }
        },
        {
            key: { updatedAt: -1 },
            options: { name: 'updatedAt_desc', background: true }
        },
        {
            key: { displayOrder: 1 },
            options: { name: 'displayOrder_asc', background: true }
        },
        {
            key: { rating: -1 },
            options: { name: 'rating_desc', background: true }
        },

        // 5. COMPOUND INDEXES - Amazon-Level Query Optimization
        {
            key: { categorySlug: 1, inStock: 1 },
            options: { name: 'category_stock_compound', background: true }
        },
        {
            key: { categorySlug: 1, price: 1 },
            options: { name: 'category_price_compound', background: true }
        },
        {
            key: { categorySlug: 1, createdAt: -1 },
            options: { name: 'category_created_compound', background: true }
        },
        {
            key: { categorySlug: 1, displayOrder: 1 },
            options: { name: 'category_display_compound', background: true }
        },
        {
            key: { categorySlug: 1, rating: -1 },
            options: { name: 'category_rating_compound', background: true }
        },
        {
            key: { inStock: 1, price: 1 },
            options: { name: 'stock_price_compound', background: true }
        },
        {
            key: { isNewArrival: 1, createdAt: -1 },
            options: { name: 'newarrival_created_compound', background: true }
        },
        {
            key: { isBestSeller: 1, rating: -1 },
            options: { name: 'bestseller_rating_compound', background: true }
        },
        {
            key: { 'sizes.size': 1, 'sizes.stock': 1 },
            options: { name: 'size_stock_compound', background: true }
        },
        {
            key: { categorySlug: 1, 'sizes.size': 1, 'sizes.stock': 1 },
            options: { name: 'category_size_stock_compound', background: true }
        },

        // 6. ADVANCED FILTERING COMPOUNDS
        {
            key: { categorySlug: 1, price: 1, inStock: 1 },
            options: { name: 'category_price_stock_triple', background: true }
        },
        {
            key: { categorySlug: 1, sleeveType: 1, inStock: 1 },
            options: { name: 'category_sleeve_stock_triple', background: true }
        },

        // 7. TEXT SEARCH INDEX - CRITICAL for search performance
        {
            key: { name: 'text', description: 'text', customId: 'text' },
            options: { 
                weights: { name: 10, customId: 8, description: 1 },
                name: 'product_text_search',
                background: true
            }
        },

        // 8. PARTIAL INDEXES - Space-efficient for specific conditions
        {
            key: { categorySlug: 1, price: 1 },
            options: { 
                partialFilterExpression: { inStock: true },
                name: 'category_price_instock_partial',
                background: true
            }
        },
        {
            key: { 'sizes.size': 1, categorySlug: 1 },
            options: {
                partialFilterExpression: { 'sizes.stock': { $gt: 0 } },
                name: 'size_category_stock_partial',
                background: true
            }
        }
    ],

    // =====================================================================================
    // ORDERS COLLECTION - Critical E-commerce Transaction Optimization
    // =====================================================================================
    orders: [
        // 1. USER ORDER LOOKUPS - Most Critical for UX
        {
            key: { userId: 1 },
            options: { name: 'userId_1', background: true }
        },
        {
            key: { email: 1 },
            options: { name: 'email_1', background: true }
        },
        {
            key: { phone: 1 },
            options: { name: 'phone_1', background: true }
        },

        // 2. ORDER STATUS AND PAYMENT TRACKING
        {
            key: { status: 1 },
            options: { name: 'status_1', background: true }
        },
        {
            key: { paymentStatus: 1 },
            options: { name: 'paymentStatus_1', background: true }
        },
        {
            key: { orderStatus: 1 },
            options: { name: 'orderStatus_1', background: true }
        },

        // 3. TEMPORAL INDEXES
        {
            key: { createdAt: -1 },
            options: { name: 'createdAt_desc', background: true }
        },
        {
            key: { updatedAt: -1 },
            options: { name: 'updatedAt_desc', background: true }
        },
        {
            key: { date: -1 },
            options: { name: 'date_desc', background: true }
        },
        {
            key: { paidAt: -1 },
            options: { name: 'paidAt_desc', background: true }
        },

        // 4. PAYMENT SYSTEM INDEXES
        {
            key: { orderId: 1 },
            options: { unique: true, name: 'orderId_unique', background: true }
        },
        {
            key: { phonepeTransactionId: 1 },
            options: { sparse: true, name: 'phonepeTransactionId_1', background: true }
        },
        {
            key: { paymentSessionId: 1 },
            options: { sparse: true, name: 'paymentSessionId_1', background: true }
        },

        // 5. COMPOUND INDEXES - Amazon-Level Order Query Optimization
        {
            key: { userId: 1, createdAt: -1 },
            options: { name: 'user_created_compound', background: true }
        },
        {
            key: { userId: 1, status: 1 },
            options: { name: 'user_status_compound', background: true }
        },
        {
            key: { userId: 1, paymentStatus: 1 },
            options: { name: 'user_payment_compound', background: true }
        },
        {
            key: { email: 1, createdAt: -1 },
            options: { name: 'email_created_compound', background: true }
        },
        {
            key: { email: 1, status: 1 },
            options: { name: 'email_status_compound', background: true }
        },
        {
            key: { status: 1, createdAt: -1 },
            options: { name: 'status_created_compound', background: true }
        },
        {
            key: { paymentStatus: 1, updatedAt: -1 },
            options: { name: 'payment_updated_compound', background: true }
        },

        // 6. ADVANCED FILTERING COMPOUNDS
        {
            key: { userId: 1, status: 1, createdAt: -1 },
            options: { name: 'user_status_created_triple', background: true }
        },
        {
            key: { email: 1, paymentStatus: 1, createdAt: -1 },
            options: { name: 'email_payment_created_triple', background: true }
        },

        // 7. ADMIN DASHBOARD OPTIMIZATIONS
        {
            key: { createdAt: -1, status: 1 },
            options: { name: 'admin_created_status', background: true }
        },
        {
            key: { totalPrice: -1 },
            options: { name: 'totalPrice_desc', background: true }
        },

        // 8. TEST ORDER FILTERING
        {
            key: { isTestOrder: 1 },
            options: { name: 'isTestOrder_1', background: true }
        }
    ],

    // =====================================================================================
    // USERS COLLECTION - Authentication and Profile Optimization
    // =====================================================================================
    users: [
        // 1. AUTHENTICATION INDEXES
        {
            key: { email: 1 },
            options: { unique: true, name: 'email_unique', background: true }
        },
        {
            key: { firebaseUid: 1 },
            options: { sparse: true, unique: true, name: 'firebaseUid_unique', background: true }
        },

        // 2. USER MANAGEMENT INDEXES
        {
            key: { isAdmin: 1 },
            options: { name: 'isAdmin_1', background: true }
        },
        {
            key: { role: 1 },
            options: { name: 'role_1', background: true }
        },

        // 3. TEMPORAL INDEXES
        {
            key: { createdAt: -1 },
            options: { name: 'createdAt_desc', background: true }
        },
        {
            key: { lastLogin: -1 },
            options: { sparse: true, name: 'lastLogin_desc', background: true }
        },

        // 4. COMPOUND INDEXES
        {
            key: { isAdmin: 1, createdAt: -1 },
            options: { name: 'admin_created_compound', background: true }
        },
        {
            key: { role: 1, createdAt: -1 },
            options: { name: 'role_created_compound', background: true }
        }
    ],

    // =====================================================================================
    // RESERVATIONS COLLECTION - Stock Management Optimization
    // =====================================================================================
    reservations: [
        // 1. PRIMARY LOOKUPS
        {
            key: { reservationId: 1 },
            options: { unique: true, name: 'reservationId_unique', background: true }
        },
        {
            key: { checkoutSessionId: 1 },
            options: { unique: true, name: 'checkoutSessionId_unique', background: true }
        },

        // 2. USER RESERVATIONS
        {
            key: { userId: 1 },
            options: { sparse: true, name: 'userId_1', background: true }
        },
        {
            key: { userEmail: 1 },
            options: { name: 'userEmail_1', background: true }
        },

        // 3. STATUS AND EXPIRATION
        {
            key: { status: 1 },
            options: { name: 'status_1', background: true }
        },
        {
            key: { expiresAt: 1 },
            options: { name: 'expiresAt_ttl', expireAfterSeconds: 0, background: true }
        },

        // 4. PRODUCT RESERVATIONS
        {
            key: { 'items.productId': 1 },
            options: { name: 'items.productId_1', background: true }
        },
        {
            key: { 'items.productId': 1, 'items.size': 1 },
            options: { name: 'product_size_compound', background: true }
        },

        // 5. TEMPORAL INDEXES
        {
            key: { createdAt: -1 },
            options: { name: 'createdAt_desc', background: true }
        },
        {
            key: { updatedAt: -1 },
            options: { name: 'updatedAt_desc', background: true }
        },

        // 6. COMPOUND OPTIMIZATIONS
        {
            key: { userId: 1, status: 1 },
            options: { name: 'user_status_compound', background: true }
        },
        {
            key: { userEmail: 1, status: 1 },
            options: { name: 'email_status_compound', background: true }
        },
        {
            key: { status: 1, expiresAt: 1 },
            options: { name: 'status_expires_compound', background: true }
        },
        {
            key: { 'items.productId': 1, status: 1 },
            options: { name: 'product_status_compound', background: true }
        }
    ],

    // =====================================================================================
    // PAYMENT SESSIONS COLLECTION - Payment Processing Optimization
    // =====================================================================================
    paymentsessions: [
        // 1. SESSION MANAGEMENT
        {
            key: { sessionId: 1 },
            options: { unique: true, name: 'sessionId_unique', background: true }
        },
        {
            key: { userId: 1 },
            options: { sparse: true, name: 'userId_1', background: true }
        },

        // 2. STATUS TRACKING
        {
            key: { status: 1 },
            options: { name: 'status_1', background: true }
        },
        {
            key: { paymentStatus: 1 },
            options: { name: 'paymentStatus_1', background: true }
        },

        // 3. TEMPORAL MANAGEMENT
        {
            key: { createdAt: -1 },
            options: { name: 'createdAt_desc', background: true }
        },
        {
            key: { expiresAt: 1 },
            options: { name: 'expiresAt_ttl', expireAfterSeconds: 0, background: true }
        },

        // 4. COMPOUND OPTIMIZATIONS
        {
            key: { userId: 1, status: 1 },
            options: { name: 'user_status_compound', background: true }
        },
        {
            key: { status: 1, createdAt: -1 },
            options: { name: 'status_created_compound', background: true }
        }
    ],

    // =====================================================================================
    // CATEGORIES COLLECTION - Navigation Optimization
    // =====================================================================================
    categories: [
        {
            key: { slug: 1 },
            options: { unique: true, name: 'slug_unique', background: true }
        },
        {
            key: { name: 1 },
            options: { unique: true, name: 'name_unique', background: true }
        },
        {
            key: { displayOrder: 1 },
            options: { name: 'displayOrder_1', background: true }
        },
        {
            key: { isActive: 1 },
            options: { name: 'isActive_1', background: true }
        },
        {
            key: { isActive: 1, displayOrder: 1 },
            options: { name: 'active_display_compound', background: true }
        }
    ]
};

// Connection management
async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 20,      // Amazon-level connection pooling
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB with optimized connection pool');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

// Comprehensive index analysis
async function analyzeCollectionPerformance(collectionName) {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    try {
        const stats = await db.command({ collStats: collectionName });
        const indexes = await collection.indexes();
        
        console.log(`\n📊 ${collectionName.toUpperCase()} Collection Analysis:`);
        console.log(`   Documents: ${stats.count?.toLocaleString() || 0}`);
        console.log(`   Storage Size: ${((stats.size || 0) / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Index Count: ${stats.nindexes || 0}`);
        console.log(`   Total Index Size: ${((stats.totalIndexSize || 0) / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Average Document Size: ${((stats.avgObjSize || 0) / 1024).toFixed(2)} KB`);
        
        // Index efficiency analysis
        if (indexes.length > 0) {
            console.log(`   📋 Current Indexes:`);
            indexes.forEach((index, i) => {
                console.log(`      ${i + 1}. ${index.name} | Key: ${JSON.stringify(index.key)}`);
                if (index.unique) console.log(`         └─ Unique constraint`);
                if (index.partialFilterExpression) console.log(`         └─ Partial: ${JSON.stringify(index.partialFilterExpression)}`);
                if (index.expireAfterSeconds !== undefined) console.log(`         └─ TTL: ${index.expireAfterSeconds}s`);
            });
        }
        
    } catch (error) {
        console.error(`❌ Error analyzing ${collectionName}:`, error.message);
    }
}

// Advanced index creation with monitoring
async function createIndexesForCollection(collectionName, indexes) {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    console.log(`\n🚀 Optimizing ${collectionName.toUpperCase()} Collection...`);
    
    let created = 0, skipped = 0, errors = 0;
    const startTime = Date.now();
    
    for (const indexDef of indexes) {
        const indexName = indexDef.options.name;
        
        try {
            // Check if index already exists
            const existingIndexes = await collection.indexes();
            const exists = existingIndexes.some(idx => idx.name === indexName);
            
            if (exists) {
                console.log(`   ⏭️  ${indexName} (exists)`);
                skipped++;
                continue;
            }
            
            // Create index with progress tracking
            console.log(`   🔄 Creating ${indexName}...`);
            await collection.createIndex(indexDef.key, indexDef.options);
            console.log(`   ✅ ${indexName}`);
            created++;
            
        } catch (error) {
            console.error(`   ❌ ${indexName}: ${error.message}`);
            errors++;
        }
    }
    
    const duration = Date.now() - startTime;
    console.log(`   📈 Summary: ${created} created, ${skipped} skipped, ${errors} errors (${duration}ms)`);
    
    return { created, skipped, errors, duration };
}

// Main optimization function
async function optimizeDatabase(options = {}) {
    const { analyzeOnly = false, background = true } = options;
    
    console.log('🚀 AMAZON-LEVEL DATABASE OPTIMIZATION');
    console.log('=====================================\n');
    
    if (analyzeOnly) {
        console.log('📊 ANALYSIS MODE - No indexes will be created\n');
        for (const collectionName of Object.keys(COLLECTION_INDEXES)) {
            await analyzeCollectionPerformance(collectionName);
        }
        return;
    }
    
    // Performance optimization summary
    let totalCreated = 0, totalSkipped = 0, totalErrors = 0, totalDuration = 0;
    
    for (const [collectionName, indexes] of Object.entries(COLLECTION_INDEXES)) {
        // Pre-optimization analysis
        await analyzeCollectionPerformance(collectionName);
        
        // Create optimized indexes
        const result = await createIndexesForCollection(collectionName, indexes);
        totalCreated += result.created;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
        totalDuration += result.duration;
        
        // Brief pause to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final performance summary
    console.log('\n🏆 OPTIMIZATION COMPLETE');
    console.log('========================');
    console.log(`✅ Total Indexes Created: ${totalCreated}`);
    console.log(`⏭️  Total Skipped: ${totalSkipped}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    console.log(`⚡ Total Duration: ${totalDuration}ms`);
    console.log(`📊 Collections Optimized: ${Object.keys(COLLECTION_INDEXES).length}`);
    
    console.log('\n💡 Amazon-Level Performance Features Applied:');
    console.log('   ✅ Compound indexes for complex queries');
    console.log('   ✅ Text search indexes for instant search');
    console.log('   ✅ Partial indexes for space efficiency');
    console.log('   ✅ TTL indexes for automatic cleanup');
    console.log('   ✅ Background index creation');
    console.log('   ✅ Connection pool optimization');
    
    // Performance recommendations
    console.log('\n🎯 Next Steps for Maximum Performance:');
    console.log('   1. Replace regex queries with text search');
    console.log('   2. Implement aggregation pipelines for complex queries');
    console.log('   3. Add query performance monitoring');
    console.log('   4. Enable read preferences for scaling');
    console.log('   5. Configure MongoDB profiler for query optimization');
}

// Script execution
async function main() {
    const args = process.argv.slice(2);
    const options = {
        analyzeOnly: args.includes('--analyze-only'),
        background: !args.includes('--foreground')
    };
    
    await connectToDatabase();
    
    try {
        await optimizeDatabase(options);
        console.log('\n🎉 Database optimization completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Optimization failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

// Process management
process.on('SIGINT', async () => {
    console.log('\n⚠️  Optimization interrupted');
    await mongoose.disconnect();
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('\n❌ Uncaught exception:', error.message);
    await mongoose.disconnect();
    process.exit(1);
});

// Execute optimization
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default optimizeDatabase;
