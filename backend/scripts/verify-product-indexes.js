#!/usr/bin/env node

/**
 * 🔍 PRODUCT INDEX VERIFICATION SCRIPT
 * 
 * This script analyzes the Product collection indexes for:
 * - Duplicate indexes
 * - Unused indexes
 * - Performance optimization opportunities
 * - Index size analysis
 * 
 * Usage:
 *   node scripts/verify-product-indexes.js
 *   node scripts/verify-product-indexes.js --suggest-removals
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

// Expected indexes (from our optimized schema)
const EXPECTED_INDEXES = [
    'customId_unique',
    'categorySlug_1',
    'category_1',
    'price_1',
    'inStock_1',
    'isNewArrival_1',
    'isBestSeller_1',
    'sleeveType_1',
    'sizes.size_1',
    'sizes.stock_1',
    'createdAt_-1',
    'displayOrder_1',
    'rating_-1',
    'updatedAt_-1',
    'categorySlug_1_inStock_1',
    // 'categorySlug_1_price_1', // REMOVED - replaced by more efficient partial index
    'categorySlug_1_isNewArrival_1',
    'categorySlug_1_isBestSeller_1',
    'categorySlug_1_sleeveType_1',
    'inStock_1_price_1',
    'isNewArrival_1_createdAt_-1',
    'isBestSeller_1_rating_-1',
    'sizes.size_1_sizes.stock_1',
    'categorySlug_1_sizes.size_1',
    'displayOrder_1_categorySlug_1',
    'displayOrder_1_inStock_1',
    'product_search_index',
    'createdAt_-1_categorySlug_1',
    'updatedAt_-1_categorySlug_1',
    '_id_1_customId_1',
    'category_price_in_stock', // Partial index - more efficient than full categorySlug_1_price_1
    'size_category_with_stock'
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

async function getIndexAnalysis() {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    
    // Get all indexes
    const indexes = await collection.indexes();
    
    // Get collection stats
    const stats = await db.command({ collStats: 'products' });
    
    // Get index usage stats (if available)
    let indexUsageStats = null;
    try {
        indexUsageStats = await db.command({ indexStats: 'products' });
    } catch (error) {
        console.log('ℹ️  Index usage stats not available (MongoDB 3.2+)');
    }
    
    return { indexes, stats, indexUsageStats };
}

function analyzeIndexes(indexes, stats, indexUsageStats) {
    const analysis = {
        total: indexes.length,
        duplicates: [],
        unused: [],
        oversized: [],
        missing: [],
        recommendations: []
    };
    
    console.log('🔍 INDEX ANALYSIS REPORT');
    console.log('========================\n');
    
    // 1. Basic Statistics
    console.log('📊 BASIC STATISTICS');
    console.log('-------------------');
    console.log(`Total Indexes: ${indexes.length}`);
    console.log(`Expected Indexes: ${EXPECTED_INDEXES.length}`);
    console.log(`Collection Size: ${stats.count.toLocaleString()} documents`);
    console.log(`Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Average Document Size: ${(stats.avgObjSize / 1024).toLocaleString()} KB\n`);
    
    // 2. Check for duplicates
    console.log('🔍 DUPLICATE INDEX DETECTION');
    console.log('-----------------------------');
    
    const indexKeys = new Map();
    indexes.forEach(index => {
        const keyStr = JSON.stringify(index.key);
        if (indexKeys.has(keyStr)) {
            analysis.duplicates.push({
                key: keyStr,
                indexes: [indexKeys.get(keyStr), index.name]
            });
        } else {
            indexKeys.set(keyStr, index.name);
        }
    });
    
    if (analysis.duplicates.length > 0) {
        console.log('❌ Found duplicate indexes:');
        analysis.duplicates.forEach(dup => {
            console.log(`   Key: ${dup.key}`);
            console.log(`   Indexes: ${dup.indexes.join(', ')}`);
        });
    } else {
        console.log('✅ No duplicate indexes found');
    }
    console.log();
    
    // 3. Check for missing expected indexes
    console.log('🔍 MISSING INDEX DETECTION');
    console.log('----------------------------');
    
    const existingNames = indexes.map(idx => idx.name);
    const missing = EXPECTED_INDEXES.filter(name => !existingNames.includes(name));
    
    if (missing.length > 0) {
        console.log('❌ Missing expected indexes:');
        missing.forEach(name => console.log(`   - ${name}`));
        analysis.missing = missing;
    } else {
        console.log('✅ All expected indexes present');
    }
    console.log();
    
    // 4. Check for unused indexes
    console.log('🔍 INDEX USAGE ANALYSIS');
    console.log('------------------------');
    
    if (indexUsageStats) {
        const unusedIndexes = indexUsageStats.filter(stat => 
            stat.accesses && stat.accesses.ops === 0
        );
        
        if (unusedIndexes.length > 0) {
            console.log('⚠️  Potentially unused indexes:');
            unusedIndexes.forEach(stat => {
                console.log(`   - ${stat.name} (${stat.accesses.ops} operations)`);
            });
            analysis.unused = unusedIndexes.map(stat => stat.name);
        } else {
            console.log('✅ All indexes appear to be used');
        }
    } else {
        console.log('ℹ️  Index usage stats not available');
    }
    console.log();
    
    // 5. Size analysis
    console.log('📏 INDEX SIZE ANALYSIS');
    console.log('-----------------------');
    
    const indexSizes = indexes.map(index => ({
        name: index.name,
        size: index.size || 0,
        sizeMB: ((index.size || 0) / 1024 / 1024).toFixed(2)
    })).sort((a, b) => b.size - a.size);
    
    console.log('Largest indexes by size:');
    indexSizes.slice(0, 5).forEach((idx, i) => {
        console.log(`   ${i + 1}. ${idx.name}: ${idx.sizeMB} MB`);
    });
    
    // Check for oversized indexes (> 100MB)
    const oversized = indexSizes.filter(idx => idx.size > 100 * 1024 * 1024);
    if (oversized.length > 0) {
        console.log('\n⚠️  Oversized indexes (> 100MB):');
        oversized.forEach(idx => {
            console.log(`   - ${idx.name}: ${idx.sizeMB} MB`);
        });
        analysis.oversized = oversized.map(idx => idx.name);
    }
    console.log();
    
    // 6. Performance recommendations
    console.log('💡 PERFORMANCE RECOMMENDATIONS');
    console.log('-------------------------------');
    
    const recommendations = [];
    
    if (analysis.duplicates.length > 0) {
        recommendations.push('Remove duplicate indexes to reduce storage and maintenance overhead');
    }
    
    if (analysis.unused.length > 0) {
        recommendations.push('Consider removing unused indexes to improve write performance');
    }
    
    if (analysis.oversized.length > 0) {
        recommendations.push('Review oversized indexes for optimization opportunities');
    }
    
    if (analysis.missing.length > 0) {
        recommendations.push('Create missing indexes to improve query performance');
    }
    
    if (stats.totalIndexSize > stats.dataSize * 0.5) {
        recommendations.push('Index size is > 50% of data size - consider index optimization');
    }
    
    if (recommendations.length > 0) {
        recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
    } else {
        console.log('✅ No immediate optimization recommendations');
    }
    
    console.log();
    
    return analysis;
}

function generateCleanupScript(analysis) {
    if (analysis.duplicates.length === 0 && analysis.unused.length === 0) {
        console.log('✅ No cleanup needed - all indexes are optimal');
        return;
    }
    
    console.log('🧹 CLEANUP SCRIPT GENERATION');
    console.log('-----------------------------');
    
    let cleanupScript = '// Generated cleanup script for product indexes\n';
    cleanupScript += '// Run with: node cleanup-product-indexes.js\n\n';
    cleanupScript += 'import mongoose from "mongoose";\n';
    cleanupScript += 'import dotenv from "dotenv";\n\n';
    cleanupScript += 'dotenv.config();\n\n';
    cleanupScript += 'const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/shithaa-ecom";\n\n';
    cleanupScript += 'async function cleanupIndexes() {\n';
    cleanupScript += '  await mongoose.connect(MONGODB_URI);\n';
    cleanupScript += '  const collection = mongoose.connection.db.collection("products");\n\n';
    
    if (analysis.duplicates.length > 0) {
        cleanupScript += '  // Remove duplicate indexes\n';
        analysis.duplicates.forEach(dup => {
            // Keep the first one, remove the rest
            const toRemove = dup.indexes.slice(1);
            toRemove.forEach(name => {
                cleanupScript += `  await collection.dropIndex("${name}");\n`;
                cleanupScript += `  console.log("Removed duplicate index: ${name}");\n`;
            });
        });
        cleanupScript += '\n';
    }
    
    if (analysis.unused.length > 0) {
        cleanupScript += '  // Remove unused indexes (review before running)\n';
        analysis.unused.forEach(name => {
            cleanupScript += `  // await collection.dropIndex("${name}");\n`;
            cleanupScript += `  // console.log("Removed unused index: ${name}");\n`;
        });
        cleanupScript += '\n';
    }
    
    cleanupScript += '  console.log("Cleanup completed");\n';
    cleanupScript += '  await mongoose.disconnect();\n';
    cleanupScript += '}\n\n';
    cleanupScript += 'cleanupIndexes().catch(console.error);\n';
    
    console.log('Generated cleanup script:');
    console.log(cleanupScript);
}

async function main() {
    const args = process.argv.slice(2);
    const suggestRemovals = args.includes('--suggest-removals');
    
    console.log('🔍 PRODUCT INDEX VERIFICATION SCRIPT');
    console.log('====================================\n');
    
    await connectToDatabase();
    
    try {
        const { indexes, stats, indexUsageStats } = await getIndexAnalysis();
        const analysis = analyzeIndexes(indexes, stats, indexUsageStats);
        
        if (suggestRemovals) {
            generateCleanupScript(analysis);
        }
        
        console.log('✅ Index verification completed!');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the verification
main().catch(console.error);
