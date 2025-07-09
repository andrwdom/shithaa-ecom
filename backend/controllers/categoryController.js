import Category from '../models/Category.js';
import productModel from '../models/productModel.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        
        // Update product count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await productModel.countDocuments({ categorySlug: category.slug });
                return {
                    ...category.toObject(),
                    productCount
                };
            })
        );
        
        successResponse(res, categoriesWithCount, 'Categories fetched successfully');
    } catch (error) {
        console.error('Get All Categories Error:', error);
        errorResponse(res, error.message);
    }
};

export const getCategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) {
            return errorResponse(res, 'Category not found', 404);
        }
        
        // Get product count for this category
        const productCount = await productModel.countDocuments({ categorySlug: category.slug });
        const categoryWithCount = {
            ...category.toObject(),
            productCount
        };
        
        successResponse(res, categoryWithCount, 'Category fetched successfully');
    } catch (error) {
        console.error('Get Category By Slug Error:', error);
        errorResponse(res, error.message);
    }
};

export const getProductsByCategory = async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'createdAt', search, minPrice, maxPrice } = req.query;
        
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) {
            return errorResponse(res, 'Category not found', 404);
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
        errorResponse(res, error.message);
    }
};

export const addCategory = async (req, res) => {
    try {
        const { name, slug, description, image } = req.body;
        if (!name || !slug) {
            return errorResponse(res, 'Name and slug are required', 400);
        }
        const exists = await Category.findOne({ slug });
        if (exists) {
            return errorResponse(res, 'Category with this slug already exists', 400);
        }
        const category = new Category({ name, slug, description, image });
        await category.save();
        successResponse(res, category, 'Category added successfully');
    } catch (error) {
        console.error('Add Category Error:', error);
        errorResponse(res, error.message);
    }
}; 