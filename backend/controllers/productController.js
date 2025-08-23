import fs from "fs";
import imageOptimizer from '../utils/imageOptimizer.js';
import productModel from '../models/productModel.js';
import Category from '../models/Category.js';


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
            limit = 1000,
            search,
            isNewArrival,
            isBestSeller,
            sortBy = 'createdAt',
            minPrice,
            maxPrice,
            categorySlug,
            size,
            sleeveType
        } = req.query;
        const filter = {};
        if (category) {
            console.log('Filtering by category:', category);
            filter.categorySlug = category.toLowerCase();
        }
        if (categorySlug) {
            console.log('Filtering by categorySlug:', categorySlug);
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
        
        // Size filtering - check if the size exists in availableSizes array AND has stock
        if (size) {
            console.log('Filtering by size:', size);
            // Filter products that have the selected size AND have stock for that size
            filter['sizes'] = {
                $elemMatch: {
                    'size': size,
                    'stock': { $gt: 0 }
                }
            };
        }
        
        // Sleeve type filtering
        if (sleeveType) {
            filter.sleeveType = sleeveType;
        }
        
        console.log('Final filter object:', JSON.stringify(filter, null, 2));
        
        // --- Sorting logic update for displayOrder ---
        const sortField = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        
        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Get total count for pagination
        const total = await productModel.countDocuments(filter);
        
        const products = await productModel.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();
            
        // Always include customId in the response
        const productsWithCustomId = products.map(p => ({ ...p, customId: p.customId }));
        
        console.log('Products returned:', productsWithCustomId.map(p => ({ name: p.name, category: p.category, categorySlug: p.categorySlug, _id: p._id })));
        
        res.status(200).json({ 
            products: productsWithCustomId,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            limit: limitNum
        });
    } catch (error) {
        console.error('Get All Products Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// List all products with filtering, sorting, and pagination
export const listProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 24;
        const skip = (page - 1) * limit;

        const {
            search,
            categorySlug,
            size,
            minPrice,
            maxPrice,
            sortBy = 'displayOrder',
            sortOrder = 'asc'
        } = req.query;

        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { customId: { $regex: search, $options: 'i' } }
            ];
        }

        if (categorySlug) {
            const category = await Category.findOne({ slug: categorySlug });
            if (category) {
                query.category = category.name;
            }
        }

        if (size) {
            query['sizes.size'] = size;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) {
                query.price.$gte = parseInt(minPrice);
            }
            if (maxPrice) {
                query.price.$lte = parseInt(maxPrice);
            }
        }
        
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const products = await productModel.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        const total = await productModel.countDocuments(query);
        const pages = Math.ceil(total / limit);

        res.json({ success: true, products, total, pages });
    } catch (error) {
        console.error("Error in listProducts:", error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
};

// Add product
export const addProduct = async (req, res) => {
    try {
        console.log('Add Product Request Body:', req.body);
        console.log('Add Product Files:', req.files);
        console.log('Raw sizes value:', req.body.sizes);
        console.log('Raw availableSizes value:', req.body.availableSizes);

        const { customId, name, description, price, category, subCategory, type, sizes, bestseller, originalPrice, categorySlug, features, isNewArrival, isBestSeller, availableSizes, stock, sleeveType } = req.body

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
            if (parsedSizes.length === 0) {
                console.log('Sizes array is empty');
                return res.status(400).json({
                    success: false,
                    message: "At least one size must be selected"
                });
            }
            
            // Validate that at least one size has stock > 0
            const sizesWithStock = parsedSizes.filter(s => s.stock > 0);
            if (sizesWithStock.length === 0) {
                console.log('No sizes with stock > 0 found');
                return res.status(400).json({
                    success: false,
                    message: "At least one size must have stock greater than 0"
                });
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

        // Optimize images
        console.log('🔄 Starting image optimization...');
        const uploadDir = "/var/www/shithaa-ecom/uploads/products/";
        
        let optimizationResult;
        let optimizedFiles;
        let results;
        let stats;
        
        try {
            optimizationResult = await imageOptimizer.optimizeMultipleImages(images, uploadDir);
            optimizedFiles = optimizationResult.optimizedFiles;
            results = optimizationResult.results;
            stats = imageOptimizer.getOptimizationStats(results);
        } catch (error) {
            console.error('❌ Image optimization failed:', error);
            // Use fallback - keep original files
            optimizedFiles = images;
            results = images.map(img => ({
                originalName: img.originalname,
                optimizedName: img.filename,
                originalSize: '0 Bytes',
                optimizedSize: '0 Bytes',
                compressionRatio: 0,
                processingTime: 0,
                success: true,
                error: null
            }));
            stats = {
                totalFiles: images.length,
                successful: images.length,
                failed: 0,
                avgCompressionRatio: 0,
                totalProcessingTime: 0
            };
        }

        console.log('📊 FAST Image Optimization Summary:');
        console.log(`   Total files: ${stats.totalFiles}`);
        console.log(`   Successful: ${stats.successful}`);
        console.log(`   Failed: ${stats.failed}`);
        console.log(`   Average compression: ${stats.avgCompressionRatio}%`);
        console.log(`   Total processing time: ${stats.totalProcessingTime}ms`);

        // Build simple image URLs for VPS using optimized filenames
        const baseUrl = process.env.BASE_URL || 'https://shithaa.in';
        let imagesUrl;
        
        try {
            imagesUrl = optimizedFiles.map(img => {
                const baseFilename = path.parse(img.filename).name;
                return imageOptimizer.generateResponsiveUrls(baseFilename, baseUrl);
            });
        } catch (error) {
            console.error('❌ Error generating image URLs:', error);
            // Fallback to simple URLs
            imagesUrl = optimizedFiles.map(img => {
                return `${baseUrl}/images/products/${img.filename}`;
            });
        }

        console.log('📊 Image URLs generated:', imagesUrl);

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

        // Validate sleeveType if provided - only for categories that require it
        const validSleeveTypes = ["Puff Sleeve", "Normal Sleeve"];
        const categoriesRequiringSleeveType = [
            "Zipless Feeding Lounge Wear",
            "Non-Feeding Lounge Wear", 
            "Zipless Feeding Dupatta Lounge Wear"
        ];
        
        // Only validate sleeveType if the category requires it
        if (categoriesRequiringSleeveType.includes(category)) {
            if (sleeveType && !validSleeveTypes.includes(sleeveType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid sleeve type. Must be 'Puff Sleeve' or 'Normal Sleeve'"
                });
            }
        } else {
            // For categories that don't require sleeveType, don't include it in product data
            console.log(`Category "${category}" does not require sleeveType`);
        }

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
            stock: stock !== undefined ? Number(stock) : 0,
            // Only include sleeveType if category requires it
            ...(categoriesRequiringSleeveType.includes(category) ? { sleeveType: sleeveType || null } : {})
        }

        // After parsing sizes, always sync main stock field
        const totalStock = Array.isArray(parsedSizes) ? parsedSizes.reduce((sum, s) => sum + (s.stock || 0), 0) : 0;
        productData.stock = totalStock;

        console.log('Creating product with data:', productData);

        const product = new productModel(productData);
        await product.save();

        console.log('Product saved successfully:', product._id);

        // Return response with optimization stats
        res.status(201).json({ 
            product,
            imageOptimization: {
                stats,
                details: results.map(result => ({
                    originalName: result.originalName,
                    optimizedName: result.optimizedName,
                    originalSize: imageOptimizer.formatFileSize(result.originalSize),
                    optimizedSize: imageOptimizer.formatFileSize(result.optimizedSize),
                    compressionRatio: result.compressionRatio,
                    processingTime: result.processingTime
                }))
            }
        });
    } catch (error) {
        console.error('Add Product Error:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to add product';
        let statusCode = 500;
        
        if (error.name === 'ValidationError') {
            errorMessage = 'Product validation failed: ' + error.message;
            statusCode = 400;
        } else if (error.code === 11000) {
            errorMessage = 'Product ID already exists. Please use a unique ID.';
            statusCode = 400;
        } else if (error.message.includes('ENOENT')) {
            errorMessage = 'File system error. Please check server configuration.';
            statusCode = 500;
        } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. Please check file permissions.';
            statusCode = 500;
        }
        
        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        const { customId, name, description, price, category, subCategory, type, sizes, bestseller, originalPrice, categorySlug, features, isNewArrival, isBestSeller, stock, sleeveType } = req.body;

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

        // Validate sleeveType if provided - only for categories that require it
        const validSleeveTypes = ["Puff Sleeve", "Normal Sleeve"];
        const categoriesRequiringSleeveType = [
            "Zipless Feeding Lounge Wear",
            "Non-Feeding Lounge Wear", 
            "Zipless Feeding Dupatta Lounge Wear"
        ];
        
        // Get the category being updated (use provided category or existing product category)
        const updatedCategory = category || product.category;
        
        // Only validate sleeveType if the category requires it
        if (categoriesRequiringSleeveType.includes(updatedCategory)) {
            if (sleeveType !== undefined && sleeveType !== null && sleeveType !== "" && !validSleeveTypes.includes(sleeveType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid sleeve type. Must be 'Puff Sleeve' or 'Normal Sleeve'"
                });
            }
        } else {
            // For categories that don't require sleeveType, clear it if provided
            if (sleeveType !== undefined) {
                // Allow clearing sleeveType for non-sleeve categories
                console.log(`Clearing sleeveType for category: ${updatedCategory}`);
            }
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
        let imageOptimizationStats = null;
        
        if (req.files && Object.keys(req.files).length > 0) {
            const image1 = req.files?.image1?.[0]
            const image2 = req.files?.image2?.[0]
            const image3 = req.files?.image3?.[0]
            const image4 = req.files?.image4?.[0]

            const newImages = [image1, image2, image3, image4].filter((item) => item !== undefined)

            if (newImages.length > 0) {
                try {
                    // Optimize new images
                    console.log('🔄 Starting image optimization for update...');
                    const uploadDir = "/var/www/shithaa-ecom/uploads/products/";
                    const optimizationResult = await imageOptimizer.optimizeMultipleImages(newImages, uploadDir);
                    
                    const { optimizedFiles, results } = optimizationResult;
                    const stats = imageOptimizer.getOptimizationStats(results);

                    console.log('📊 FAST Image Optimization Summary (Update):');
                    console.log(`   Total files: ${stats.totalFiles}`);
                    console.log(`   Successful: ${stats.successful}`);
                    console.log(`   Failed: ${stats.failed}`);
                    console.log(`   Average compression: ${stats.avgCompressionRatio}%`);
                    console.log(`   Total processing time: ${stats.totalProcessingTime}ms`);

                    // Build responsive image URLs using optimized filenames
                    const baseUrl = process.env.BASE_URL || 'https://shithaa.in';
                    const uploadedImages = optimizedFiles.map(img => {
                        const baseFilename = path.parse(img.filename).name;
                        return imageOptimizer.generateResponsiveUrls(baseFilename, baseUrl);
                    });
                    imagesUrl = uploadedImages;
                    
                    // Store optimization stats for response
                    imageOptimizationStats = {
                        stats,
                        details: results.map(result => ({
                            originalName: result.originalName,
                            optimizedName: result.optimizedName,
                            originalSize: imageOptimizer.formatFileSize(result.originalSize),
                            optimizedSize: imageOptimizer.formatFileSize(result.optimizedSize),
                            compressionRatio: result.compressionRatio,
                            processingTime: result.processingTime
                        }))
                    };
                    
                } catch (error) {
                    console.error('Image optimization error in update:', error);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to optimize images",
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
            ...(stock !== undefined ? { stock: Number(stock) } : {}),
            // Handle sleeveType conditionally based on category
            ...(categoriesRequiringSleeveType.includes(updatedCategory) 
                ? { sleeveType: sleeveType !== undefined ? (sleeveType || null) : product.sleeveType }
                : { sleeveType: null } // Clear sleeveType for non-sleeve categories
            )
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
        
        // Return response with optimization stats if images were processed
        const response = { success: true, product: updatedProduct };
        if (imageOptimizationStats) {
            response.imageOptimization = imageOptimizationStats;
        }
        
        res.status(200).json(response);

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

// Move product to top or bottom of category
export const moveProduct = async (req, res) => {
  try {
    const { productId, action, categorySlug } = req.body;
    console.log('Move product request:', { productId, action, categorySlug });
    
    if (!productId || !action || !categorySlug) {
      return res.status(400).json({ 
        success: false, 
        message: 'productId, action (top/bottom), and categorySlug are required' 
      });
    }
    
    if (!['top', 'bottom'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'action must be either "top" or "bottom"' 
      });
    }
    
    // Get the product to move
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Get all products in the category
    const categoryProducts = await productModel.find({
      $or: [
        { categorySlug: categorySlug },
        { category: categorySlug }
      ]
    }).sort({ displayOrder: 1 });
    
    console.log('Found products in category:', categoryProducts.length);
    
    if (categoryProducts.length === 0) {
      return res.status(400).json({ success: false, message: 'No products found in category' });
    }
    
    // Remove the product from current position
    const productsWithoutTarget = categoryProducts.filter(p => String(p._id) !== String(productId));
    
    let newOrder;
    if (action === 'top') {
      // Move to top (displayOrder: 0)
      newOrder = [
        { _id: productId, displayOrder: 0 },
        ...productsWithoutTarget.map((p, i) => ({ _id: p._id, displayOrder: (i + 1) * 10 }))
      ];
    } else {
      // Move to bottom (highest displayOrder + 10)
      const maxOrder = Math.max(...productsWithoutTarget.map(p => p.displayOrder || 0), 0);
      newOrder = [
        ...productsWithoutTarget.map((p, i) => ({ _id: p._id, displayOrder: i * 10 })),
        { _id: productId, displayOrder: maxOrder + 10 }
      ];
    }
    
    // Prepare bulk operations
    const ops = newOrder.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { displayOrder: p.displayOrder } }
      }
    }));
    
    console.log('Updating products with ops:', ops.length);
    await productModel.bulkWrite(ops);
    
    // Fetch updated products to return
    const updatedProducts = await productModel.find({
      _id: { $in: newOrder.map(p => p._id) }
    }).sort({ displayOrder: 1 });
    
    console.log('Successfully moved product, updatedProducts.length:', updatedProducts.length);
    res.status(200).json({ 
      success: true, 
      message: `Product moved to ${action} of category`, 
      products: updatedProducts 
    });
  } catch (error) {
    console.error('Move product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};