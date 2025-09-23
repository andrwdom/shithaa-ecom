import mongoose from "mongoose";

const sizeSchema = new mongoose.Schema({
    size: { type: String, required: true },
    stock: { type: Number, required: true },
    reserved: { type: Number, default: 0 } // Track temporarily reserved stock
}, { _id: false });

// Virtual for available stock (stock - reserved)
sizeSchema.virtual('availableStock').get(function() {
    return Math.max(0, this.stock - this.reserved);
});

// Ensure virtuals are serialized
sizeSchema.set('toJSON', { virtuals: true });
sizeSchema.set('toObject', { virtuals: true });

const productSchema = new mongoose.Schema({
    customId: { type: String, required: true },
    name: { type: String, required: true },
    price: { 
        type: Number, 
        required: true,
        min: [1, 'Price must be at least ₹1'],
        validate: {
            validator: function(price) {
                // Allow low prices for testing purposes
                return price >= 1;
            },
            message: 'Price must be at least ₹1'
        }
    },
    originalPrice: { 
        type: Number,
        min: [1, 'Original price must be at least ₹1']
    },
    description: { type: String, required: true },
    images: [{ type: String, required: true }],
    category: { type: String, required: true },
    categorySlug: { type: String, default: "" },
    subCategory: { type: String, default: "" },
    type: { type: String, default: "" },
    sleeveType: { type: String, enum: ["Puff Sleeve", "Normal Sleeve"], default: null },
    sizes: [sizeSchema],
    availableSizes: [{ type: String }],
    features: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    inStock: { type: Boolean, default: true },
    bestseller: { type: Boolean },
    date: { type: Number, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    stock: { type: Number, default: 0 },
    displayOrder: { type: Number, required: false, default: 0 },
}, {
    timestamps: true
});

productSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// =============================================================================
// 🚀 PRODUCTION-OPTIMIZED INDEXES FOR HIGH-TRAFFIC E-COMMERCE
// =============================================================================

// 1. UNIQUE INDEXES (Critical for data integrity)
productSchema.index({ customId: 1 }, { unique: true }); // Custom ID lookup

// 2. SINGLE FIELD INDEXES (Most frequently queried fields)
productSchema.index({ categorySlug: 1 }); // Primary category filtering
productSchema.index({ category: 1 }); // Category name filtering (backup)
productSchema.index({ price: 1 }); // Price range queries
productSchema.index({ inStock: 1 }); // Stock availability
productSchema.index({ isNewArrival: 1 }); // New arrivals filter
productSchema.index({ isBestSeller: 1 }); // Best sellers filter
productSchema.index({ sleeveType: 1 }); // Sleeve type filtering
productSchema.index({ 'sizes.size': 1 }); // Size filtering
productSchema.index({ 'sizes.stock': 1 }); // Stock level queries

// 3. SORTING INDEXES (Optimized for common sort patterns)
productSchema.index({ createdAt: -1 }); // Newest first (default)
productSchema.index({ displayOrder: 1 }); // Custom display order
productSchema.index({ rating: -1 }); // Highest rated first
productSchema.index({ updatedAt: -1 }); // Recently updated

// 4. COMPOUND INDEXES (Critical for complex queries - order matters!)
// Category + Filter combinations (most common queries)
productSchema.index({ categorySlug: 1, inStock: 1 }); // Category + stock
productSchema.index({ categorySlug: 1, price: 1 }); // Category + price range
productSchema.index({ categorySlug: 1, isNewArrival: 1 }); // Category + new arrivals
productSchema.index({ categorySlug: 1, isBestSeller: 1 }); // Category + best sellers
productSchema.index({ categorySlug: 1, sleeveType: 1 }); // Category + sleeve type

// Filter + Sort combinations
productSchema.index({ inStock: 1, price: 1 }); // Stock + price range
productSchema.index({ isNewArrival: 1, createdAt: -1 }); // New arrivals + date
productSchema.index({ isBestSeller: 1, rating: -1 }); // Best sellers + rating

// Size + Stock combinations (for size filtering with stock)
productSchema.index({ 'sizes.size': 1, 'sizes.stock': 1 }); // Size + stock level
productSchema.index({ categorySlug: 1, 'sizes.size': 1 }); // Category + size

// Display order combinations
productSchema.index({ displayOrder: 1, categorySlug: 1 }); // Display order + category
productSchema.index({ displayOrder: 1, inStock: 1 }); // Display order + stock

// 5. TEXT SEARCH INDEX (For product search functionality)
productSchema.index({ 
    name: 'text', 
    description: 'text',
    customId: 'text'
}, { 
    weights: { 
        name: 10,        // Name matches are most important
        customId: 8,     // Custom ID matches are very important
        description: 1   // Description matches are less important
    },
    name: 'product_search_index'
});

// 6. ADMIN/OPERATIONAL INDEXES
productSchema.index({ createdAt: -1, categorySlug: 1 }); // Admin product listing
productSchema.index({ updatedAt: -1, categorySlug: 1 }); // Recent updates by category
productSchema.index({ _id: 1, customId: 1 }); // ID + customId lookup (for admin)

// 7. PARTIAL INDEXES (For better performance on filtered data)
// Only index products that are in stock (reduces index size)
productSchema.index({ categorySlug: 1, price: 1 }, { 
    partialFilterExpression: { inStock: true },
    name: 'category_price_in_stock'
});

// Only index products with stock > 0 for size queries
productSchema.index({ 'sizes.size': 1, categorySlug: 1 }, {
    partialFilterExpression: { 'sizes.stock': { $gt: 0 } },
    name: 'size_category_with_stock'
});

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel
