import fs from "fs";
import path from "path";
import imageOptimizer from '../utils/imageOptimizer.js';
import productModel from '../models/productModel.js';
import Category from '../models/Category.js';
import redisService from '../services/redisService.js';
import { config } from '../config.js';

/**
 * Enhanced Product Controller with Redis Caching
 * Provides significant performance improvements for high-traffic scenarios
 */

// Cache key generators
const generateProductKey = (id) => `product:${id}`;
const generateProductsListKey = (params) => `products:list:${JSON.stringify(params)}`;
const generateCategoryKey = (category) => `category:${category}`;
const generateCategoriesKey = () => 'categories:all';

/**
 * GET /api/products/:id - Get single product with caching
 */
export const getProductById = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log('🔧 DEBUG: getProductById called with ID:', productId);
        
        // Generate cache key
        const cacheKey = generateProductKey(productId);
        
        // Try to get from cache first
        const cachedProduct = await redisService.get(cacheKey);
        if (cachedProduct) {
            console.log('📦 Cache HIT: Product found in Redis');
            return res.status(200).json({ product: cachedProduct });
        }
        
        console.log('📭 Cache MISS: Fetching product from database');
        
        // Fetch from database
        let product;
        if (productId && productId.length === 24) {
            product = await productModel.findById(productId).lean();
        }
        if (!product && productId) {
            product = await productModel.findOne({ customId: productId }).lean();
        }
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Process product data (calculate available stock)
        if (product.sizes && Array.isArray(product.sizes)) {
            product.sizes = product.sizes.map(sizeObj => ({
                ...sizeObj,
                availableStock: Math.max(0, (sizeObj.stock || 0) - (sizeObj.reserved || 0)),
                originalStock: sizeObj.stock || 0,
                reserved: sizeObj.reserved || 0
            }));
        }
        
        // Cache the processed product
        await redisService.set(cacheKey, product, config.redis.ttl.products);
        
        // Add cache headers
        res.set({
            'Cache-Control': 'public, max-age=300', // 5 minutes
            'X-Cache-Status': 'MISS'
        });
        
        res.status(200).json({ product });
    } catch (error) {
        console.error('Get Product By ID Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/products - Get all products with advanced caching
 */
export const getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 1000,
            search,
            isNewArrival,
            isBestSeller,
            sortBy = 'createdAt',
            minPrice,
            maxPrice,
            categorySlug,
            size,
            sleeveType,
            category
        } = req.query;
        
        // Build filter object
        const filter = {};
        if (category) {
            filter.categorySlug = category.toLowerCase();
        }
        if (categorySlug) {
            filter.categorySlug = categorySlug;
        }
        if (isNewArrival) filter.isNewArrival = isNewArrival === 'true';
        if (isBestSeller) filter.isBestSeller = isBestSeller === 'true';
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (size) {
            filter['sizes'] = {
                $elemMatch: {
                    'size': size,
                    'stock': { $gt: 0 }
                }
            };
        }
        if (sleeveType) {
            filter.sleeveType = sleeveType;
        }
        
        // Build cache key
        const cacheParams = {
            filter: JSON.stringify(filter),
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder: req.query.sortOrder || 'desc'
        };
        const cacheKey = generateProductsListKey(cacheParams);
        
        // Try to get from cache
        const cachedResult = await redisService.get(cacheKey);
        if (cachedResult) {
            console.log('📦 Cache HIT: Products list found in Redis');
            res.set({
                'Cache-Control': 'public, max-age=300',
                'X-Cache-Status': 'HIT'
            });
            return res.status(200).json(cachedResult);
        }
        
        console.log('📭 Cache MISS: Fetching products from database');
        
        // Fetch from database
        const sortField = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [total, products] = await Promise.all([
            productModel.countDocuments(filter),
            productModel.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);
        
        // Process products (calculate available stock)
        const productsWithCustomId = products.map(p => {
            const product = { ...p, customId: p.customId };
            
            if (product.sizes && Array.isArray(product.sizes)) {
                product.sizes = product.sizes.map(sizeObj => ({
                    ...sizeObj,
                    availableStock: Math.max(0, (sizeObj.stock || 0) - (sizeObj.reserved || 0)),
                    originalStock: sizeObj.stock || 0,
                    reserved: sizeObj.reserved || 0
                }));
            }
            
            return product;
        });
        
        const result = {
            products: productsWithCustomId,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            limit: limitNum
        };
        
        // Cache the result
        await redisService.set(cacheKey, result, config.redis.ttl.products);
        
        res.set({
            'Cache-Control': 'public, max-age=300',
            'X-Cache-Status': 'MISS'
        });
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Get All Products Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/products/categories - Get all categories with caching
 */
export const getCategories = async (req, res) => {
    try {
        const cacheKey = generateCategoriesKey();
        
        // Try to get from cache
        const cachedCategories = await redisService.get(cacheKey);
        if (cachedCategories) {
            console.log('📦 Cache HIT: Categories found in Redis');
            return res.status(200).json({ categories: cachedCategories });
        }
        
        console.log('📭 Cache MISS: Fetching categories from database');
        
        // Fetch from database
        const categories = await Category.find().lean();
        
        // Cache the result
        await redisService.set(cacheKey, categories, config.redis.ttl.categories);
        
        res.status(200).json({ categories });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/products/category/:category - Get products by category with caching
 */
export const getProductsByCategory = async (req, res) => {
    try {
        const category = req.params.category;
        const cacheKey = `products:category:${category}`;
        
        // Try to get from cache
        const cachedProducts = await redisService.get(cacheKey);
        if (cachedProducts) {
            console.log('📦 Cache HIT: Category products found in Redis');
            return res.status(200).json({ products: cachedProducts });
        }
        
        console.log('📭 Cache MISS: Fetching category products from database');
        
        // Fetch from database
        const products = await productModel.find({ categorySlug: category }).lean();
        
        // Process products
        const processedProducts = products.map(p => {
            const product = { ...p, customId: p.customId };
            
            if (product.sizes && Array.isArray(product.sizes)) {
                product.sizes = product.sizes.map(sizeObj => ({
                    ...sizeObj,
                    availableStock: Math.max(0, (sizeObj.stock || 0) - (sizeObj.reserved || 0)),
                    originalStock: sizeObj.stock || 0,
                    reserved: sizeObj.reserved || 0
                }));
            }
            
            return product;
        });
        
        // Cache the result
        await redisService.set(cacheKey, processedProducts, config.redis.ttl.products);
        
        res.status(200).json({ products: processedProducts });
    } catch (error) {
        console.error('Get Products By Category Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/products - Create product with cache invalidation
 */
export const createProduct = async (req, res) => {
    try {
        const productData = req.body;
        
        // Create product
        const product = new productModel(productData);
        await product.save();
        
        // Invalidate related caches
        await invalidateProductCaches();
        
        console.log('✅ Product created and caches invalidated');
        res.status(201).json({ 
            message: 'Product created successfully', 
            product 
        });
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * PUT /api/products/:id - Update product with cache invalidation
 */
export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updateData = req.body;
        
        // Update product
        const product = await productModel.findByIdAndUpdate(
            productId, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Invalidate specific product cache
        const productCacheKey = generateProductKey(productId);
        await redisService.del(productCacheKey);
        
        // Invalidate related caches
        await invalidateProductCaches();
        
        console.log('✅ Product updated and caches invalidated');
        res.status(200).json({ 
            message: 'Product updated successfully', 
            product 
        });
    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * DELETE /api/products/:id - Delete product with cache invalidation
 */
export const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Delete product
        const product = await productModel.findByIdAndDelete(productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Invalidate specific product cache
        const productCacheKey = generateProductKey(productId);
        await redisService.del(productCacheKey);
        
        // Invalidate related caches
        await invalidateProductCaches();
        
        console.log('✅ Product deleted and caches invalidated');
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Invalidate all product-related caches
 */
async function invalidateProductCaches() {
    try {
        // Delete all product-related cache keys
        const patterns = [
            'product:*',
            'products:*',
            'category:*',
            'categories:*'
        ];
        
        for (const pattern of patterns) {
            await redisService.delPattern(pattern);
        }
        
        console.log('🗑️ All product caches invalidated');
    } catch (error) {
        console.error('❌ Error invalidating product caches:', error);
    }
}

/**
 * GET /api/products/search - Search products with caching
 */
export const searchProducts = async (req, res) => {
    try {
        const { q: query, page = 1, limit = 20 } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const cacheKey = `products:search:${query}:${page}:${limit}`;
        
        // Try to get from cache
        const cachedResult = await redisService.get(cacheKey);
        if (cachedResult) {
            console.log('📦 Cache HIT: Search results found in Redis');
            return res.status(200).json(cachedResult);
        }
        
        console.log('📭 Cache MISS: Searching products in database');
        
        // Search in database
        const searchFilter = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { customId: { $regex: query, $options: 'i' } }
            ]
        };
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const [total, products] = await Promise.all([
            productModel.countDocuments(searchFilter),
            productModel.find(searchFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);
        
        // Process products
        const processedProducts = products.map(p => {
            const product = { ...p, customId: p.customId };
            
            if (product.sizes && Array.isArray(product.sizes)) {
                product.sizes = product.sizes.map(sizeObj => ({
                    ...sizeObj,
                    availableStock: Math.max(0, (sizeObj.stock || 0) - (sizeObj.reserved || 0)),
                    originalStock: sizeObj.stock || 0,
                    reserved: sizeObj.reserved || 0
                }));
            }
            
            return product;
        });
        
        const result = {
            products: processedProducts,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            limit: limitNum,
            query
        };
        
        // Cache the result
        await redisService.set(cacheKey, result, config.redis.ttl.products);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Search Products Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/products/stats - Get product statistics with caching
 */
export const getProductStats = async (req, res) => {
    try {
        const cacheKey = 'products:stats';
        
        // Try to get from cache
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            console.log('📦 Cache HIT: Product stats found in Redis');
            return res.status(200).json({ stats: cachedStats });
        }
        
        console.log('📭 Cache MISS: Calculating product stats from database');
        
        // Calculate stats
        const [
            totalProducts,
            inStockProducts,
            outOfStockProducts,
            newArrivals,
            bestSellers
        ] = await Promise.all([
            productModel.countDocuments(),
            productModel.countDocuments({ 'sizes.stock': { $gt: 0 } }),
            productModel.countDocuments({ 'sizes.stock': { $lte: 0 } }),
            productModel.countDocuments({ isNewArrival: true }),
            productModel.countDocuments({ isBestSeller: true })
        ]);
        
        const stats = {
            totalProducts,
            inStockProducts,
            outOfStockProducts,
            newArrivals,
            bestSellers,
            lastUpdated: new Date().toISOString()
        };
        
        // Cache the result
        await redisService.set(cacheKey, stats, config.redis.ttl.static);
        
        res.status(200).json({ stats });
    } catch (error) {
        console.error('Get Product Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Clear all product caches (Admin endpoint)
 */
export const clearProductCaches = async (req, res) => {
    try {
        await invalidateProductCaches();
        
        res.status(200).json({ 
            message: 'All product caches cleared successfully' 
        });
    } catch (error) {
        console.error('Clear Product Caches Error:', error);
        res.status(500).json({ error: error.message });
    }
};
