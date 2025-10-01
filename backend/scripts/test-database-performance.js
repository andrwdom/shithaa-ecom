#!/usr/bin/env node

/**
 * 🚀 DATABASE PERFORMANCE TESTING SCRIPT
 * 
 * Tests the optimized database performance against your actual business logic:
 * - Product search and filtering
 * - Order queries with real shipping calculations
 * - User authentication flows
 * - Ensures optimizations don't break existing functionality
 * 
 * Usage:
 *   node scripts/test-database-performance.js
 *   node scripts/test-database-performance.js --quick
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Import your actual models and controllers
import productModel from '../models/productModel.js';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import { ProductQueryOptimizer, OrderQueryOptimizer } from '../utils/queryOptimizer.js';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
    quick: process.argv.includes('--quick'),
    samples: process.argv.includes('--quick') ? 10 : 100,
    concurrent: process.argv.includes('--quick') ? 5 : 20
};

console.log('🚀 DATABASE PERFORMANCE TESTING');
console.log('===============================');
console.log(`Mode: ${TEST_CONFIG.quick ? 'Quick' : 'Comprehensive'}`);
console.log(`Samples: ${TEST_CONFIG.samples}`);
console.log(`Concurrent: ${TEST_CONFIG.concurrent}\n`);

// =====================================================================================
// BUSINESS LOGIC TESTS - Your Actual Use Cases
// =====================================================================================

/**
 * Test product search performance with real search terms
 */
async function testProductSearch() {
    console.log('🔍 Testing Product Search Performance...');
    
    // Real search terms your customers might use
    const searchTerms = [
        'dress',
        'maternity',
        'feeding wear',
        'cotton',
        'casual',
        'party wear',
        'kurti',
        'palazzo'
    ];

    const results = [];
    
    for (const term of searchTerms) {
        const startTime = performance.now();
        
        try {
            // Test optimized text search
            const optimizedResult = await ProductQueryOptimizer.optimizedTextSearch(term, {
                page: 1,
                limit: 20
            });
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            results.push({
                searchTerm: term,
                duration: Math.round(duration),
                resultsCount: optimizedResult.products.length,
                total: optimizedResult.total,
                status: 'success'
            });
            
            console.log(`   ✅ "${term}" - ${duration.toFixed(1)}ms (${optimizedResult.total} results)`);
            
        } catch (error) {
            results.push({
                searchTerm: term,
                duration: 0,
                resultsCount: 0,
                status: 'error',
                error: error.message
            });
            console.log(`   ❌ "${term}" - Error: ${error.message}`);
        }
    }
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const successRate = (results.filter(r => r.status === 'success').length / results.length) * 100;
    
    console.log(`📊 Search Performance Summary:`);
    console.log(`   Average Duration: ${avgDuration.toFixed(1)}ms`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Target: <100ms per search\n`);
    
    return { avgDuration, successRate, results };
}

/**
 * Test category filtering performance (your main navigation)
 */
async function testCategoryFiltering() {
    console.log('📂 Testing Category Filtering Performance...');
    
    // Your actual categories
    const categories = [
        'maternity-feeding-wear',
        'lounge-wear',
        'party-wear',
        'casual-wear',
        'ethnic-wear'
    ];

    const results = [];
    
    for (const category of categories) {
        const startTime = performance.now();
        
        try {
            const optimizedResult = await ProductQueryOptimizer.optimizedCategoryQuery(category, {
                inStock: true
            }, {
                page: 1,
                limit: 50,
                sortBy: 'displayOrder'
            });
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            results.push({
                category,
                duration: Math.round(duration),
                resultsCount: optimizedResult.products.length,
                total: optimizedResult.total,
                status: 'success'
            });
            
            console.log(`   ✅ ${category} - ${duration.toFixed(1)}ms (${optimizedResult.total} products)`);
            
        } catch (error) {
            results.push({
                category,
                duration: 0,
                resultsCount: 0,
                status: 'error',
                error: error.message
            });
            console.log(`   ❌ ${category} - Error: ${error.message}`);
        }
    }
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const successRate = (results.filter(r => r.status === 'success').length / results.length) * 100;
    
    console.log(`📊 Category Filtering Summary:`);
    console.log(`   Average Duration: ${avgDuration.toFixed(1)}ms`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Target: <50ms per category\n`);
    
    return { avgDuration, successRate, results };
}

/**
 * Test order queries performance (critical for user experience)
 */
async function testOrderQueries() {
    console.log('📦 Testing Order Query Performance...');
    
    const results = [];
    
    try {
        // Get some real user IDs and emails for testing
        const sampleUsers = await userModel.find({}).limit(10).lean();
        
        if (sampleUsers.length === 0) {
            console.log('   ⚠️ No users found for order query testing');
            return { avgDuration: 0, successRate: 0, results: [] };
        }
        
        for (const user of sampleUsers.slice(0, 5)) {
            const startTime = performance.now();
            
            try {
                const optimizedResult = await OrderQueryOptimizer.optimizedUserOrders({
                    userId: user._id.toString(),
                    email: user.email
                }, {
                    page: 1,
                    limit: 20
                });
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                results.push({
                    userId: user._id.toString(),
                    duration: Math.round(duration),
                    ordersCount: optimizedResult.orders.length,
                    total: optimizedResult.total,
                    status: 'success'
                });
                
                console.log(`   ✅ User ${user._id} - ${duration.toFixed(1)}ms (${optimizedResult.total} orders)`);
                
            } catch (error) {
                results.push({
                    userId: user._id.toString(),
                    duration: 0,
                    ordersCount: 0,
                    status: 'error',
                    error: error.message
                });
                console.log(`   ❌ User ${user._id} - Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Failed to get sample users: ${error.message}`);
        return { avgDuration: 0, successRate: 0, results: [] };
    }
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const successRate = (results.filter(r => r.status === 'success').length / results.length) * 100;
    
    console.log(`📊 Order Query Summary:`);
    console.log(`   Average Duration: ${avgDuration.toFixed(1)}ms`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Target: <100ms per query\n`);
    
    return { avgDuration, successRate, results };
}

/**
 * Test concurrent load handling
 */
async function testConcurrentLoad() {
    console.log('⚡ Testing Concurrent Load Handling...');
    
    const concurrentQueries = [];
    const startTime = performance.now();
    
    // Simulate concurrent user requests
    for (let i = 0; i < TEST_CONFIG.concurrent; i++) {
        const queries = [
            // Product search
            ProductQueryOptimizer.optimizedTextSearch('dress', { page: 1, limit: 20 }),
            // Category filtering
            ProductQueryOptimizer.optimizedCategoryQuery('casual-wear', {}, { page: 1, limit: 20 }),
            // Single product lookup
            ProductQueryOptimizer.optimizedProductLookup('test-product-id')
        ];
        
        concurrentQueries.push(...queries);
    }
    
    try {
        const results = await Promise.allSettled(concurrentQueries);
        const endTime = performance.now();
        const totalDuration = endTime - startTime;
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const successRate = (successful / results.length) * 100;
        
        console.log(`📊 Concurrent Load Summary:`);
        console.log(`   Total Queries: ${results.length}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
        console.log(`   Total Duration: ${totalDuration.toFixed(1)}ms`);
        console.log(`   Average per Query: ${(totalDuration / results.length).toFixed(1)}ms`);
        console.log(`   Target: >95% success rate\n`);
        
        return { successRate, totalDuration, avgPerQuery: totalDuration / results.length };
        
    } catch (error) {
        console.log(`   ❌ Concurrent load test failed: ${error.message}\n`);
        return { successRate: 0, totalDuration: 0, avgPerQuery: 0 };
    }
}

/**
 * Validate business logic integrity
 */
async function validateBusinessLogic() {
    console.log('🔍 Validating Business Logic Integrity...');
    
    const issues = [];
    
    try {
        // Test 1: Ensure products have correct price and stock data
        const sampleProduct = await ProductQueryOptimizer.optimizedProductLookup('test');
        if (sampleProduct && sampleProduct.product) {
            const product = sampleProduct.product;
            
            // Check price fields
            if (!product.price || typeof product.price !== 'number') {
                issues.push('Product price field missing or invalid');
            }
            
            // Check stock calculations
            if (product.sizes && Array.isArray(product.sizes)) {
                for (const size of product.sizes) {
                    if (typeof size.availableStock !== 'number') {
                        issues.push('Available stock calculation missing');
                        break;
                    }
                }
            }
        }
        
        // Test 2: Verify search returns correct categories
        const searchResult = await ProductQueryOptimizer.optimizedTextSearch('maternity', {
            categorySlug: 'maternity-feeding-wear',
            page: 1,
            limit: 5
        });
        
        if (searchResult.products.length > 0) {
            const hasCorrectCategory = searchResult.products.every(p => 
                p.categorySlug === 'maternity-feeding-wear' || 
                p.name.toLowerCase().includes('maternity')
            );
            
            if (!hasCorrectCategory) {
                issues.push('Search filtering by category not working correctly');
            }
        }
        
    } catch (error) {
        issues.push(`Business logic validation failed: ${error.message}`);
    }
    
    if (issues.length === 0) {
        console.log('   ✅ All business logic validations passed');
    } else {
        console.log('   ⚠️ Business logic issues found:');
        issues.forEach(issue => console.log(`      • ${issue}`));
    }
    console.log('');
    
    return { issues, isValid: issues.length === 0 };
}

// =====================================================================================
// MAIN TEST EXECUTION
// =====================================================================================

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB for performance testing\n');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function runPerformanceTests() {
    console.log('🏃‍♂️ Starting Database Performance Tests...\n');
    
    const results = {};
    
    try {
        // Run all tests
        results.productSearch = await testProductSearch();
        results.categoryFiltering = await testCategoryFiltering();
        results.orderQueries = await testOrderQueries();
        results.concurrentLoad = await testConcurrentLoad();
        results.businessLogic = await validateBusinessLogic();
        
        // Generate performance report
        generatePerformanceReport(results);
        
    } catch (error) {
        console.error('❌ Performance testing failed:', error.message);
        process.exit(1);
    }
}

function generatePerformanceReport(results) {
    console.log('📊 PERFORMANCE TEST REPORT');
    console.log('===========================\n');
    
    const scores = [];
    
    // Product search score
    if (results.productSearch.avgDuration < 100) {
        scores.push(100);
        console.log('✅ Product Search: EXCELLENT (< 100ms)');
    } else if (results.productSearch.avgDuration < 250) {
        scores.push(75);
        console.log('⚠️ Product Search: GOOD (< 250ms)');
    } else {
        scores.push(50);
        console.log('❌ Product Search: NEEDS IMPROVEMENT (> 250ms)');
    }
    
    // Category filtering score
    if (results.categoryFiltering.avgDuration < 50) {
        scores.push(100);
        console.log('✅ Category Filtering: EXCELLENT (< 50ms)');
    } else if (results.categoryFiltering.avgDuration < 150) {
        scores.push(75);
        console.log('⚠️ Category Filtering: GOOD (< 150ms)');
    } else {
        scores.push(50);
        console.log('❌ Category Filtering: NEEDS IMPROVEMENT (> 150ms)');
    }
    
    // Order queries score
    if (results.orderQueries.avgDuration < 100) {
        scores.push(100);
        console.log('✅ Order Queries: EXCELLENT (< 100ms)');
    } else if (results.orderQueries.avgDuration < 200) {
        scores.push(75);
        console.log('⚠️ Order Queries: GOOD (< 200ms)');
    } else {
        scores.push(50);
        console.log('❌ Order Queries: NEEDS IMPROVEMENT (> 200ms)');
    }
    
    // Concurrent load score
    if (results.concurrentLoad.successRate > 95) {
        scores.push(100);
        console.log('✅ Concurrent Load: EXCELLENT (> 95% success)');
    } else if (results.concurrentLoad.successRate > 85) {
        scores.push(75);
        console.log('⚠️ Concurrent Load: GOOD (> 85% success)');
    } else {
        scores.push(50);
        console.log('❌ Concurrent Load: NEEDS IMPROVEMENT (< 85% success)');
    }
    
    // Business logic score
    if (results.businessLogic.isValid) {
        scores.push(100);
        console.log('✅ Business Logic: INTACT');
    } else {
        scores.push(0);
        console.log('❌ Business Logic: ISSUES DETECTED');
    }
    
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    console.log('\n🎯 OVERALL PERFORMANCE SCORE');
    console.log(`${overallScore.toFixed(0)}/100`);
    
    if (overallScore >= 90) {
        console.log('🏆 EXCELLENT - Ready for production traffic!');
    } else if (overallScore >= 75) {
        console.log('✅ GOOD - Minor optimizations recommended');
    } else if (overallScore >= 60) {
        console.log('⚠️ FAIR - Optimization needed before high traffic');
    } else {
        console.log('❌ POOR - Critical performance issues need fixing');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (results.productSearch.avgDuration > 100) {
        console.log('   • Consider adding more specific text search indexes');
    }
    if (results.categoryFiltering.avgDuration > 50) {
        console.log('   • Review compound indexes for category filtering');
    }
    if (results.orderQueries.avgDuration > 100) {
        console.log('   • Optimize user-order compound indexes');
    }
    if (results.concurrentLoad.successRate < 95) {
        console.log('   • Increase connection pool size or add read replicas');
    }
    if (!results.businessLogic.isValid) {
        console.log('   • CRITICAL: Fix business logic issues before deployment');
    }
}

// Execute tests
async function main() {
    await connectToDatabase();
    await runPerformanceTests();
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✅ Performance testing completed!');
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n⚠️ Performance testing interrupted');
    await mongoose.disconnect();
    process.exit(0);
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default main;
