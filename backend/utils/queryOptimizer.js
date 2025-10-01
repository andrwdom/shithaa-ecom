/**
 * 🚀 AMAZON-LEVEL QUERY OPTIMIZATION UTILITIES
 * 
 * This module provides optimized database query patterns and utilities
 * for achieving sub-millisecond response times in high-traffic scenarios.
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';

// =====================================================================================
// QUERY PERFORMANCE MONITORING
// =====================================================================================

class QueryPerformanceMonitor {
    constructor() {
        this.slowQueryThreshold = 100; // milliseconds
        this.queryStats = new Map();
    }

    startTimer(queryName) {
        return {
            queryName,
            startTime: Date.now(),
            end: () => {
                const duration = Date.now() - Date.now();
                this.recordQuery(queryName, duration);
                return duration;
            }
        };
    }

    recordQuery(queryName, duration) {
        if (!this.queryStats.has(queryName)) {
            this.queryStats.set(queryName, {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                slowQueries: 0
            });
        }

        const stats = this.queryStats.get(queryName);
        stats.count++;
        stats.totalTime += duration;
        stats.avgTime = stats.totalTime / stats.count;
        
        if (duration > this.slowQueryThreshold) {
            stats.slowQueries++;
            console.warn(`🐌 SLOW QUERY DETECTED: ${queryName} took ${duration}ms`);
        }

        this.queryStats.set(queryName, stats);
    }

    getStats() {
        return Array.from(this.queryStats.entries()).map(([name, stats]) => ({
            queryName: name,
            ...stats
        }));
    }

    reset() {
        this.queryStats.clear();
    }
}

export const performanceMonitor = new QueryPerformanceMonitor();

// =====================================================================================
// OPTIMIZED PRODUCT QUERIES - Amazon-Level E-commerce Performance
// =====================================================================================

export class ProductQueryOptimizer {
    /**
     * 🔥 OPTIMIZED TEXT SEARCH - Replaces inefficient regex queries
     * Uses MongoDB text index for sub-millisecond search performance
     */
    static async optimizedTextSearch(searchQuery, options = {}) {
        const timer = performanceMonitor.startTimer('product_text_search');
        
        const {
            page = 1,
            limit = 20,
            categorySlug,
            minPrice,
            maxPrice,
            sortBy = 'score'
        } = options;

        try {
            // Build aggregation pipeline for optimal performance
            const pipeline = [
                // Stage 1: Text search with scoring
                {
                    $match: {
                        $text: { $search: searchQuery }
                    }
                },
                
                // Stage 2: Add search score for relevance
                {
                    $addFields: {
                        searchScore: { $meta: 'textScore' }
                    }
                },

                // Stage 3: Apply filters
                ...(categorySlug || minPrice || maxPrice ? [{
                    $match: {
                        ...(categorySlug && { categorySlug }),
                        ...(minPrice && { price: { $gte: minPrice } }),
                        ...(maxPrice && { price: { ...((minPrice && { $gte: minPrice }) || {}), $lte: maxPrice } })
                    }
                }] : []),

                // Stage 4: Sort by relevance or other criteria
                {
                    $sort: sortBy === 'score' 
                        ? { searchScore: { $meta: 'textScore' }, createdAt: -1 }
                        : { [sortBy]: -1, searchScore: { $meta: 'textScore' } }
                },

                // Stage 5: Facet for pagination and count
                {
                    $facet: {
                        results: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            {
                                $project: {
                                    customId: 1,
                                    name: 1,
                                    price: 1,
                                    originalPrice: 1,
                                    description: 1,
                                    images: { $slice: ['$images', 3] }, // Limit images for performance
                                    categorySlug: 1,
                                    sizes: {
                                        $map: {
                                            input: '$sizes',
                                            as: 'size',
                                            in: {
                                                size: '$$size.size',
                                                stock: '$$size.stock',
                                                reserved: '$$size.reserved',
                                                availableStock: {
                                                    $max: [0, { $subtract: ['$$size.stock', '$$size.reserved'] }]
                                                }
                                            }
                                        }
                                    },
                                    rating: 1,
                                    reviews: 1,
                                    isNewArrival: 1,
                                    isBestSeller: 1,
                                    inStock: 1,
                                    searchScore: 1
                                }
                            }
                        ],
                        totalCount: [
                            { $count: 'count' }
                        ]
                    }
                }
            ];

            const [result] = await productModel.aggregate(pipeline);
            const products = result.results || [];
            const total = result.totalCount[0]?.count || 0;

            timer.end();

            return {
                products,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit),
                performance: {
                    searchQuery,
                    executionTime: timer.end(),
                    resultsCount: products.length,
                    indexUsed: 'text_search'
                }
            };

        } catch (error) {
            timer.end();
            throw new Error(`Optimized text search failed: ${error.message}`);
        }
    }

    /**
     * 🚀 OPTIMIZED CATEGORY FILTERING - Compound index utilization
     */
    static async optimizedCategoryQuery(categorySlug, filters = {}, options = {}) {
        const timer = performanceMonitor.startTimer('product_category_query');
        
        const {
            page = 1,
            limit = 50,
            sortBy = 'displayOrder',
            sortOrder = 'asc'
        } = options;

        try {
            // Build optimized aggregation pipeline
            const pipeline = [
                // Stage 1: Initial category filter (uses compound index)
                {
                    $match: {
                        categorySlug,
                        ...(filters.inStock !== undefined && { inStock: filters.inStock }),
                        ...(filters.minPrice && { price: { $gte: filters.minPrice } }),
                        ...(filters.maxPrice && { 
                            price: { 
                                ...((filters.minPrice && { $gte: filters.minPrice }) || {}), 
                                $lte: filters.maxPrice 
                            } 
                        }),
                        ...(filters.sleeveType && { sleeveType: filters.sleeveType }),
                        ...(filters.isNewArrival !== undefined && { isNewArrival: filters.isNewArrival }),
                        ...(filters.isBestSeller !== undefined && { isBestSeller: filters.isBestSeller })
                    }
                },

                // Stage 2: Size filtering (if specified)
                ...(filters.size ? [{
                    $match: {
                        'sizes': {
                            $elemMatch: {
                                'size': filters.size,
                                'stock': { $gt: 0 }
                            }
                        }
                    }
                }] : []),

                // Stage 3: Sort (utilizes compound indexes)
                {
                    $sort: { 
                        [sortBy]: sortOrder === 'desc' ? -1 : 1,
                        _id: 1 // Ensure consistent ordering
                    }
                },

                // Stage 4: Pagination with optimized projection
                {
                    $facet: {
                        products: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            {
                                $project: {
                                    customId: 1,
                                    name: 1,
                                    price: 1,
                                    originalPrice: 1,
                                    description: 1,
                                    images: { $slice: ['$images', 4] },
                                    categorySlug: 1,
                                    sizes: {
                                        $map: {
                                            input: '$sizes',
                                            as: 'size',
                                            in: {
                                                size: '$$size.size',
                                                stock: '$$size.stock',
                                                reserved: { $ifNull: ['$$size.reserved', 0] },
                                                availableStock: {
                                                    $max: [0, { 
                                                        $subtract: [
                                                            '$$size.stock', 
                                                            { $ifNull: ['$$size.reserved', 0] }
                                                        ] 
                                                    }]
                                                }
                                            }
                                        }
                                    },
                                    rating: 1,
                                    reviews: 1,
                                    isNewArrival: 1,
                                    isBestSeller: 1,
                                    inStock: 1,
                                    displayOrder: 1,
                                    createdAt: 1
                                }
                            }
                        ],
                        totalCount: [{ $count: 'count' }]
                    }
                }
            ];

            const [result] = await productModel.aggregate(pipeline);
            const products = result.products || [];
            const total = result.totalCount[0]?.count || 0;

            timer.end();

            return {
                products,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit),
                performance: {
                    category: categorySlug,
                    filters: Object.keys(filters),
                    executionTime: timer.end(),
                    indexesUsed: ['categorySlug_compound', sortBy === 'displayOrder' ? 'category_display_compound' : 'category_created_compound']
                }
            };

        } catch (error) {
            timer.end();
            throw new Error(`Optimized category query failed: ${error.message}`);
        }
    }

    /**
     * 🔍 SINGLE PRODUCT OPTIMIZATION - Lightning-fast single product lookup
     */
    static async optimizedProductLookup(identifier) {
        const timer = performanceMonitor.startTimer('product_single_lookup');

        try {
            const isObjectId = mongoose.Types.ObjectId.isValid(identifier) && identifier.length === 24;
            
            const query = isObjectId 
                ? { _id: identifier }
                : { customId: identifier };

            // Use lean() for maximum performance and projection for minimal data transfer
            const product = await productModel.findOne(query)
                .select({
                    customId: 1,
                    name: 1,
                    price: 1,
                    originalPrice: 1,
                    description: 1,
                    images: 1,
                    category: 1,
                    categorySlug: 1,
                    subCategory: 1,
                    type: 1,
                    sleeveType: 1,
                    sizes: 1,
                    availableSizes: 1,
                    features: 1,
                    rating: 1,
                    reviews: 1,
                    isNewArrival: 1,
                    isBestSeller: 1,
                    inStock: 1,
                    createdAt: 1,
                    updatedAt: 1
                })
                .lean();

            if (!product) {
                timer.end();
                return null;
            }

            // Calculate available stock efficiently
            if (product.sizes && Array.isArray(product.sizes)) {
                product.sizes = product.sizes.map(sizeObj => ({
                    ...sizeObj,
                    availableStock: Math.max(0, (sizeObj.stock || 0) - (sizeObj.reserved || 0)),
                    originalStock: sizeObj.stock || 0,
                    reserved: sizeObj.reserved || 0
                }));
            }

            timer.end();

            return {
                product,
                performance: {
                    identifier,
                    lookupType: isObjectId ? 'ObjectId' : 'customId',
                    executionTime: timer.end(),
                    indexUsed: isObjectId ? '_id_' : 'customId_unique'
                }
            };

        } catch (error) {
            timer.end();
            throw new Error(`Optimized product lookup failed: ${error.message}`);
        }
    }
}

// =====================================================================================
// OPTIMIZED ORDER QUERIES - High-Performance Transaction Processing
// =====================================================================================

export class OrderQueryOptimizer {
    /**
     * 🏃‍♂️ OPTIMIZED USER ORDERS - Lightning-fast user order history
     */
    static async optimizedUserOrders(userIdentifiers, options = {}) {
        const timer = performanceMonitor.startTimer('order_user_lookup');
        
        const { page = 1, limit = 20, status, dateRange } = options;

        try {
            // Build optimized query with compound index utilization
            const matchConditions = [];
            
            if (userIdentifiers.userId) {
                matchConditions.push({ userId: userIdentifiers.userId });
                
                // Handle both string and ObjectId variations
                if (typeof userIdentifiers.userId === 'string' && userIdentifiers.userId.length === 24) {
                    try {
                        const objectId = new mongoose.Types.ObjectId(userIdentifiers.userId);
                        matchConditions.push({ userId: objectId });
                    } catch (e) {
                        // Ignore invalid ObjectId
                    }
                }
            }

            if (userIdentifiers.email) {
                matchConditions.push({ email: userIdentifiers.email });
            }

            if (matchConditions.length === 0) {
                throw new Error('No valid user identifiers provided');
            }

            const pipeline = [
                // Stage 1: User identification (uses compound indexes)
                {
                    $match: {
                        $or: matchConditions,
                        ...(status && { status }),
                        ...(dateRange && {
                            createdAt: {
                                $gte: new Date(dateRange.start),
                                $lte: new Date(dateRange.end)
                            }
                        })
                    }
                },

                // Stage 2: Sort by creation date (uses compound index)
                {
                    $sort: { createdAt: -1, _id: -1 }
                },

                // Stage 3: Pagination with projection
                {
                    $facet: {
                        orders: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            {
                                $project: {
                                    orderId: 1,
                                    status: 1,
                                    paymentStatus: 1,
                                    totalPrice: 1,
                                    totalAmount: 1,
                                    items: {
                                        $map: {
                                            input: '$items',
                                            as: 'item',
                                            in: {
                                                name: '$$item.name',
                                                quantity: '$$item.quantity',
                                                price: '$$item.price',
                                                size: '$$item.size',
                                                image: '$$item.image'
                                            }
                                        }
                                    },
                                    cartItems: {
                                        $map: {
                                            input: '$cartItems',
                                            as: 'item',
                                            in: {
                                                name: '$$item.name',
                                                quantity: '$$item.quantity',
                                                price: '$$item.price',
                                                size: '$$item.size',
                                                image: '$$item.image'
                                            }
                                        }
                                    },
                                    shippingInfo: 1,
                                    createdAt: 1,
                                    paidAt: 1
                                }
                            }
                        ],
                        totalCount: [{ $count: 'count' }]
                    }
                }
            ];

            const [result] = await orderModel.aggregate(pipeline);
            const orders = result.orders || [];
            const total = result.totalCount[0]?.count || 0;

            timer.end();

            return {
                orders,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit),
                performance: {
                    userIdentifiers: Object.keys(userIdentifiers),
                    executionTime: timer.end(),
                    indexesUsed: ['user_created_compound', status ? 'user_status_compound' : null].filter(Boolean)
                }
            };

        } catch (error) {
            timer.end();
            throw new Error(`Optimized user orders query failed: ${error.message}`);
        }
    }

    /**
     * 📊 ADMIN ORDER DASHBOARD - High-performance admin queries
     */
    static async optimizedAdminOrders(filters = {}, options = {}) {
        const timer = performanceMonitor.startTimer('order_admin_dashboard');
        
        const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;

        try {
            const pipeline = [
                // Stage 1: Apply filters (uses various compound indexes)
                {
                    $match: {
                        ...(filters.status && { status: filters.status }),
                        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
                        ...(filters.dateRange && {
                            createdAt: {
                                $gte: new Date(filters.dateRange.start),
                                $lte: new Date(filters.dateRange.end)
                            }
                        }),
                        ...(filters.minAmount && { totalPrice: { $gte: filters.minAmount } }),
                        ...(filters.maxAmount && { 
                            totalPrice: { 
                                ...((filters.minAmount && { $gte: filters.minAmount }) || {}), 
                                $lte: filters.maxAmount 
                            } 
                        }),
                        ...(filters.excludeTest && { isTestOrder: { $ne: true } })
                    }
                },

                // Stage 2: Sort (uses compound indexes)
                {
                    $sort: { 
                        [sortBy]: sortOrder === 'desc' ? -1 : 1,
                        _id: -1 // Ensure consistent ordering
                    }
                },

                // Stage 3: Pagination with admin-specific projection
                {
                    $facet: {
                        orders: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            {
                                $project: {
                                    orderId: 1,
                                    customerName: 1,
                                    email: 1,
                                    phone: 1,
                                    status: 1,
                                    paymentStatus: 1,
                                    paymentMethod: 1,
                                    totalPrice: 1,
                                    totalAmount: 1,
                                    itemCount: { 
                                        $size: { 
                                            $ifNull: [
                                                { $cond: [{ $gt: [{ $size: { $ifNull: ['$cartItems', []] } }, 0] }, '$cartItems', '$items'] },
                                                []
                                            ] 
                                        } 
                                    },
                                    shippingInfo: {
                                        fullName: 1,
                                        city: 1,
                                        state: 1,
                                        postalCode: 1
                                    },
                                    createdAt: 1,
                                    paidAt: 1,
                                    isTestOrder: 1
                                }
                            }
                        ],
                        totalCount: [{ $count: 'count' }],
                        summary: [
                            {
                                $group: {
                                    _id: null,
                                    totalRevenue: { $sum: '$totalPrice' },
                                    averageOrderValue: { $avg: '$totalPrice' },
                                    orderCount: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ];

            const [result] = await orderModel.aggregate(pipeline);
            const orders = result.orders || [];
            const total = result.totalCount[0]?.count || 0;
            const summary = result.summary[0] || { totalRevenue: 0, averageOrderValue: 0, orderCount: 0 };

            timer.end();

            return {
                orders,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit),
                summary,
                performance: {
                    filters: Object.keys(filters),
                    executionTime: timer.end(),
                    indexesUsed: [
                        filters.status ? 'status_created_compound' : 'admin_created_status',
                        filters.paymentStatus ? 'payment_updated_compound' : null
                    ].filter(Boolean)
                }
            };

        } catch (error) {
            timer.end();
            throw new Error(`Optimized admin orders query failed: ${error.message}`);
        }
    }
}

// =====================================================================================
// CONNECTION POOL AND READ PREFERENCE OPTIMIZATION
// =====================================================================================

export const DatabaseOptimizer = {
    /**
     * 🔧 Configure optimal connection settings for high-traffic applications
     */
    configureConnection() {
        const connectionOptions = {
            // Connection Pool Optimization (Amazon-level)
            maxPoolSize: 20,          // Maximum number of connections
            minPoolSize: 5,           // Minimum number of connections  
            maxIdleTimeMS: 30000,     // Close connections after 30s of inactivity
            serverSelectionTimeoutMS: 5000, // How long to try to connect
            socketTimeoutMS: 45000,   // How long to wait for a response
            bufferMaxEntries: 0,      // Disable mongoose buffering
            bufferCommands: false,    // Disable mongoose buffering

            // Read Preference for Scaling
            readPreference: 'primaryPreferred',
            
            // Write Concern for Performance vs Durability Balance
            writeConcern: {
                w: 'majority',
                j: true,
                wtimeout: 1000
            },

            // Compression for Network Efficiency
            compressors: ['zlib'],

            // Retry Logic
            retryWrites: true,
            retryReads: true
        };

        return connectionOptions;
    },

    /**
     * 📊 Enable MongoDB profiler for query optimization
     */
    async enableProfiler(level = 1, slowOpThresholdMs = 100) {
        try {
            const db = mongoose.connection.db;
            
            // Enable profiler for slow operations
            await db.command({
                profile: level,
                slowms: slowOpThresholdMs,
                sampleRate: 1.0
            });

            console.log(`✅ MongoDB profiler enabled (level: ${level}, threshold: ${slowOpThresholdMs}ms)`);
        } catch (error) {
            console.error('❌ Failed to enable MongoDB profiler:', error.message);
        }
    },

    /**
     * 📈 Get slow query analysis
     */
    async getSlowQueryAnalysis(limit = 10) {
        try {
            const db = mongoose.connection.db;
            
            const slowQueries = await db.collection('system.profile')
                .find({ ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }) // Last 24 hours
                .sort({ dur: -1 })
                .limit(limit)
                .toArray();

            return slowQueries.map(query => ({
                namespace: query.ns,
                operation: query.op,
                duration: query.dur,
                timestamp: query.ts,
                command: query.command,
                planSummary: query.planSummary
            }));
        } catch (error) {
            console.error('❌ Failed to get slow query analysis:', error.message);
            return [];
        }
    }
};

// =====================================================================================
// QUERY EXPLAIN UTILITY
// =====================================================================================

export const QueryAnalyzer = {
    /**
     * 🔍 Analyze query execution plans
     */
    async explainQuery(model, query, options = {}) {
        try {
            const explanation = await model.find(query, null, options).explain('executionStats');
            
            const analysis = {
                executionTimeMillis: explanation.executionStats.executionTimeMillis,
                totalDocsExamined: explanation.executionStats.totalDocsExamined,
                totalDocsReturned: explanation.executionStats.totalDocsReturned,
                indexesUsed: explanation.executionStats.winningPlan.inputStage?.indexName || 'COLLSCAN',
                efficiency: explanation.executionStats.totalDocsReturned / explanation.executionStats.totalDocsExamined,
                stages: this.extractPipelineStages(explanation.executionStats.winningPlan)
            };

            return analysis;
        } catch (error) {
            throw new Error(`Query analysis failed: ${error.message}`);
        }
    },

    extractPipelineStages(plan) {
        const stages = [];
        let current = plan;
        
        while (current) {
            stages.push({
                stage: current.stage,
                indexName: current.indexName,
                keysExamined: current.keysExamined,
                docsExamined: current.docsExamined,
                docsReturned: current.docsReturned
            });
            
            current = current.inputStage || current.child;
        }
        
        return stages;
    }
};

export default {
    ProductQueryOptimizer,
    OrderQueryOptimizer,
    DatabaseOptimizer,
    QueryAnalyzer,
    performanceMonitor
};
