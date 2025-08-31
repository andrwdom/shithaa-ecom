import Category from '../models/Category.js';
import productModel from '../models/productModel.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

export const getAllCategories = async (req, res) => {
    try {
        // 🔧 FIX: Use aggregation pipeline for better performance instead of multiple DB calls
        const categoriesWithCount = await Category.aggregate([
            {
                $lookup: {
                    from: 'products', // Collection name for products
                    localField: 'slug',
                    foreignField: 'categorySlug',
                    as: 'products'
                }
            },
            {
                $addFields: {
                    productCount: { $size: '$products' }
                }
            },
            {
                $project: {
                    products: 0 // Remove the products array from response
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);
        
        successResponse(res, categoriesWithCount, 'Categories fetched successfully');
    } catch (error) {
        console.error('Get All Categories Error:', error);
        errorResponse(res, 500, error.message);
    }
};

export const getCategoryBySlug = async (req, res) => {
    try {
        // 🔧 FIX: Use aggregation pipeline for better performance
        const categoriesWithCount = await Category.aggregate([
            {
                $match: { slug: req.params.slug }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'slug',
                    foreignField: 'categorySlug',
                    as: 'products'
                }
            },
            {
                $addFields: {
                    productCount: { $size: '$products' }
                }
            },
            {
                $project: {
                    products: 0
                }
            }
        ]);
        
        if (categoriesWithCount.length === 0) {
            return errorResponse(res, 404, 'Category not found');
        }
        
        successResponse(res, categoriesWithCount[0], 'Category fetched successfully');
    } catch (error) {
        console.error('Get Category By Slug Error:', error);
        errorResponse(res, 500, error.message);
    }
};

export const getProductsByCategory = async (req, res) => {
    try {
        const { page = 1, limit = 1000, sortBy = 'createdAt', search, minPrice, maxPrice } = req.query;
        
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) {
            return errorResponse(res, 404, 'Category not found');
        }

        // Build filter object
        const filter = { categorySlug: req.params.slug };
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Build sort object
        const sort = {};
        if (sortBy === 'createdAt') sort.createdAt = -1;
        if (sortBy === 'rating') sort.rating = -1;
        if (sortBy === 'price') sort.price = 1;
        if (sortBy === 'name') sort.name = 1;
        if (sortBy === 'date') sort.date = -1;

        const skip = (page - 1) * limit;
        const products = await productModel.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));
        
        const total = await productModel.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        paginatedResponse(res, products, total, page, totalPages, 'Products fetched successfully');
    } catch (error) {
        console.error('Get Products By Category Error:', error);
        errorResponse(res, 500, error.message);
    }
};

export const addCategory = async (req, res) => {
    try {
        const { name, slug, description, image } = req.body;
        if (!name || !slug) {
            return errorResponse(res, 400, 'Name and slug are required');
        }
        const exists = await Category.findOne({ slug });
        if (exists) {
            return errorResponse(res, 400, 'Category with this slug already exists');
        }
        const category = new Category({ name, slug, description, image });
        await category.save();
        successResponse(res, category, 'Category added successfully');
    } catch (error) {
        console.error('Add Category Error:', error);
        errorResponse(res, 500, error.message);
    }
}; 