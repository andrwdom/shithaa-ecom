import productModel from "../models/productModel.js"
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import path from "path";
import fs from "fs";

// GET /api/products/:id or /api/products/custom/:customId - RESTful single product fetch
export const getProductById = async (req, res) => {
    try {
        let product;
        if (req.params.id && req.params.id.length === 24) {
            product = await productModel.findById(req.params.id).lean();
        }
        if (!product && req.params.id) {
            // Try fetching by customId
            product = await productModel.findOne({ customId: req.params.id }).lean();
        }
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json({ product });
    } catch (error) {
        console.error('Get Product By ID Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/products/category/:category or /api/products?category=...
export const getAllProducts = async (req, res) => {
    try {
        const category = req.params.category || req.query.category;
        console.log('GET /api/products category query:', category);
        const {
            page = 1,
            limit = 20,
            search,
            isNewArrival,
            isBestSeller,
            sortBy = 'createdAt',
            minPrice,
            maxPrice,
            categorySlug
        } = req.query;
        const filter = {};
        if (category) filter.categorySlug = category.toLowerCase();
        if (categorySlug) filter.categorySlug = categorySlug;
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
        // --- Sorting logic update for displayOrder ---
        const sortField = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        const skip = (page - 1) * limit;
        const products = await productModel.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        // Always include customId in the response
        const productsWithCustomId = products.map(p => ({ ...p, customId: p.customId }));
        console.log('Products returned:', productsWithCustomId.map(p => ({ name: p.name, category: p.category, categorySlug: p.categorySlug, _id: p._id })));
        res.status(200).json({ products: productsWithCustomId });
    } catch (error) {
        console.error('Get All Products Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST /api/products - Add new product
export const addProduct = async (req, res) => {
    try {
        console.log('Add Product Request Body:', req.body);
        console.log('Add Product Files:', req.files);

        const { customId, name, description, price, category, subCategory, type, sizes, bestseller, originalPrice, categorySlug, features, isNewArrival, isBestSeller, availableSizes, stock } = req.body

        // Validate required fields
        if (!customId) {
            return res.status(400).json({ success: false, message: "Custom product ID is required" });
        }
        if (!name || !description || !price || !category) {
            console.log('Missing fields:', {
                customId: !customId,
                name: !name,
                description: !description,
                price: !price,
                category: !category
            });
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields",
                missing: {
                    customId: !customId,
                    name: !name,
                    description: !description,
                    price: !price,
                    category: !category
                }
            });
        }

        // Validate price is a number
        if (isNaN(Number(price)) || Number(price) <= 0) {
            console.log('Invalid price:', price);
            return res.status(400).json({
                success: false,
                message: "Price must be a positive number"
            });
        }

        // Validate sizes
        let parsedSizes;
        try {
            console.log('Raw sizes:', sizes);
            parsedSizes = JSON.parse(sizes);
            if (!Array.isArray(parsedSizes)) {
                console.log('Sizes is not an array:', parsedSizes);
                throw new Error('Sizes must be an array');
            }
            console.log('Parsed sizes:', parsedSizes);
        } catch (error) {
            console.error('Sizes parsing error:', error);
            return res.status(400).json({
                success: false,
                message: "Invalid sizes format",
                error: error.message
            });
        }

        // Parse availableSizes if provided
        let parsedAvailableSizes = [];
        if (availableSizes) {
            try {
                parsedAvailableSizes = JSON.parse(availableSizes);
                if (!Array.isArray(parsedAvailableSizes)) {
                    throw new Error('availableSizes must be an array');
                }
            } catch (error) {
                console.error('availableSizes parsing error:', error);
                return res.status(400).json({
                    success: false,
                    message: "Invalid availableSizes format",
                    error: error.message
                });
            }
        }

        const image1 = req.files?.image1?.[0]
        const image2 = req.files?.image2?.[0]
        const image3 = req.files?.image3?.[0]
        const image4 = req.files?.image4?.[0]

        console.log('Image files:', { image1, image2, image3, image4 });

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined)

        if (images.length === 0) {
            console.log('No images provided');
            return res.status(400).json({ 
                success: false, 
                message: "At least one image is required" 
            });
        }

        // Build image URLs for VPS
        const baseUrl = process.env.BASE_URL || 'https://shithaa.in';
        const imagesUrl = images.map(img => `${baseUrl}/images/products/${img.filename}`);

        // Parse features if provided
        let parsedFeatures = [];
        if (features) {
            try {
                parsedFeatures = JSON.parse(features);
                if (!Array.isArray(parsedFeatures)) {
                    throw new Error('Features must be an array');
                }
            } catch (error) {
                console.error('Features parsing error:', error);
                return res.status(400).json({
                    success: false,
                    message: "Invalid features format",
                    error: error.message
                });
            }
        }

        // Ensure both bestseller and isBestSeller are set for compatibility
        const bestsellerValue = (bestseller === "true" || isBestSeller === "true") ? true : false;

        const productData = {
            customId,
            name,
            description,
            category,
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : undefined,
            subCategory: subCategory || "",
            type: type || "",
            categorySlug: categorySlug || "",
            bestseller: bestsellerValue,
            isBestSeller: bestsellerValue,
            isNewArrival: isNewArrival === "true" ? true : false,
            sizes: parsedSizes,
            availableSizes: parsedAvailableSizes,
            features: parsedFeatures,
            images: imagesUrl,
            date: Date.now(),
            stock: stock !== undefined ? Number(stock) : 0
        }

        // After parsing sizes, always sync main stock field
        const totalStock = Array.isArray(parsedSizes) ? parsedSizes.reduce((sum, s) => sum + (s.stock || 0), 0) : 0;
        productData.stock = totalStock;

        console.log('Creating product with data:', productData);

        const product = new productModel(productData);
        await product.save();

        console.log('Product saved successfully:', product._id);

        res.status(201).json({ product });
    } catch (error) {
        console.error('Add Product Error:', error);
        res.status(500).json({ error: error.message });
    }
}

// function for list product
export const listProducts = async (req, res) => {
    try {
        const products = await productModel.find({}).sort({ date: -1 });
        res.json({ success: true, products })
    } catch (error) {
        console.error('List Products Error:', error);
        res.json({ success: false, message: error.message || "Failed to fetch products" })
    }
}

// function for removing product
export const removeProduct = async (req, res) => {
    console.log('req.method:', req.method, 'req.originalUrl:', req.originalUrl, 'req.params:', req.params);
    console.log('DELETE params:', req.params, 'body:', req.body, 'query:', req.query);
    try {
        const id = req.params.id;
        if (!id) {
            return res.json({ success: false, message: "Product ID is required" });
        }
        const product = await productModel.findById(id);
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }
        // Delete associated image files from local storage
        if (Array.isArray(product.images)) {
            for (const imageUrl of product.images) {
                // Only handle local VPS URLs
                const match = imageUrl.match(/\/images\/products\/(.+)$/);
                if (match && match[1]) {
                    const filename = match[1];
                    const filePath = `/var/www/shithaa-ecom/uploads/products/${filename}`;
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (err) {
                        console.error(`Failed to delete image file: ${filePath}`, err);
                    }
                }
            }
        }
        await productModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Product Removed Successfully" })
    } catch (error) {
        console.error('Remove Product Error:', error);
        res.json({ success: false, message: error.message || "Failed to remove product" })
    }
}

// function for single product info
export const singleProduct = async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.json({ success: false, message: "Product ID is required" });
        }

        const product = await productModel.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, product })
    } catch (error) {
        console.error('Single Product Error:', error);
        res.json({ success: false, message: error.message || "Failed to fetch product" })
    }
}

// PUT /api/products/:id - Update product
export const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { customId, name, description, price, category, subCategory, type, sizes, bestseller, originalPrice, categorySlug, features, isNewArrival, isBestSeller, stock } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // If customId is being updated, check uniqueness
        if (customId && customId !== product.customId) {
            const exists = await productModel.findOne({ customId });
            if (exists) {
                return res.status(400).json({ success: false, message: "Custom product ID already exists" });
            }
            product.customId = customId;
        }

        // Parse features if provided
        let parsedFeatures = product.features || [];
        if (features) {
            try {
                parsedFeatures = JSON.parse(features);
                if (!Array.isArray(parsedFeatures)) {
                    throw new Error('Features must be an array');
                }
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid features format",
                    error: error.message
                });
            }
        }

        // Handle image uploads if provided
        let imagesUrl = product.images;
        if (req.files && Object.keys(req.files).length > 0) {
            const image1 = req.files?.image1?.[0]
            const image2 = req.files?.image2?.[0]
            const image3 = req.files?.image3?.[0]
            const image4 = req.files?.image4?.[0]

            const newImages = [image1, image2, image3, image4].filter((item) => item !== undefined)

            if (newImages.length > 0) {
                try {
                    const baseUrl = process.env.BASE_URL || 'https://shithaa.in';
                    const uploadedImages = newImages.map(img => `${baseUrl}/images/products/${img.filename}`);
                    imagesUrl = uploadedImages;
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload images",
                        error: error.message
                    });
                }
            }
        }

        const updateData = {
            name: name || product.name,
            description: description || product.description,
            price: price ? Number(price) : product.price,
            originalPrice: originalPrice ? Number(originalPrice) : product.originalPrice,
            category: category || product.category,
            categorySlug: categorySlug || product.categorySlug,
            subCategory: subCategory || product.subCategory,
            type: type || product.type,
            // Ensure both bestseller and isBestSeller are set for compatibility
            bestseller: (bestseller !== undefined ? bestseller === "true" : product.bestseller) || (isBestSeller !== undefined ? isBestSeller === "true" : product.isBestSeller),
            isBestSeller: (bestseller !== undefined ? bestseller === "true" : product.bestseller) || (isBestSeller !== undefined ? isBestSeller === "true" : product.isBestSeller),
            isNewArrival: isNewArrival !== undefined ? isNewArrival === "true" : product.isNewArrival,
            features: parsedFeatures,
            images: imagesUrl,
            updatedAt: new Date(),
            ...(stock !== undefined ? { stock: Number(stock) } : {})
        };

        // Only update sizes if explicitly provided
        if (sizes) {
            try {
                const newSizes = JSON.parse(sizes);
                if (!Array.isArray(newSizes)) throw new Error('Sizes must be an array');
                updateData.sizes = newSizes;
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid sizes format",
                    error: error.message
                });
            }
        }

        // In updateProduct, after parsing newSizes (if provided), always sync main stock field
        if (updateData.sizes) {
            updateData.stock = Array.isArray(updateData.sizes) ? updateData.sizes.reduce((sum, s) => sum + (s.stock || 0), 0) : 0;
        }

        const updatedProduct = await productModel.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ success: true, product: updatedProduct });

    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Batch update product order
export const reorderProducts = async (req, res) => {
  try {
    let { products, categorySlug } = req.body;
    console.log('Reorder request:', { products: products?.length, categorySlug });
    
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: products must be an array' });
    }
    if (!categorySlug) {
      return res.status(400).json({ success: false, message: 'categorySlug is required' });
    }
    
    // Get all products in the category (both by categorySlug and category name)
    const dbProducts = await productModel.find({
      $or: [
        { categorySlug: categorySlug },
        { category: categorySlug }
      ]
    });
    
    console.log('Found products in category:', dbProducts.length);
    const dbIds = dbProducts.map(p => String(p._id));
    
    // Filter input to only those in this category
    products = products.filter(p => dbIds.includes(String(p._id)));
    console.log('Filtered products to update:', products.length);
    
    // Sort and reassign displayOrder with buffer
    products = products
      .filter(p => p._id)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p, i) => ({ ...p, displayOrder: (i + 1) * 10 }));
    // Prepare bulk ops - remove categorySlug filter to be more flexible
    const ops = products.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { displayOrder: p.displayOrder } }
      }
    }));
    
    if (ops.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid products to reorder for this category' });
    }
    
    console.log('Updating products with ops:', ops.length);
    await productModel.bulkWrite(ops);
    
    // Fetch updated products to return
    const updatedProducts = await productModel.find({
      _id: { $in: products.map(p => p._id) }
    }).sort({ displayOrder: 1 });
    
    console.log('Successfully updated, updatedProducts.length:', updatedProducts.length, 'products');
    res.status(200).json({ success: true, message: 'Product order updated for category', products: updatedProducts });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};