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
        min: [100, 'Price must be at least ₹100 to prevent offer calculation issues'],
        validate: {
            validator: function(price) {
                // 🔧 FIX: Prevent extremely low prices that can cause negative totals
                return price >= 100;
            },
            message: 'Price must be at least ₹100 to prevent offer calculation issues'
        }
    },
    originalPrice: { 
        type: Number,
        min: [100, 'Original price must be at least ₹100']
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

// Add explicit unique index for customId
productSchema.index({ customId: 1 }, { unique: true });

// 🔧 FIX: Add performance indexes for frequently queried fields
productSchema.index({ categorySlug: 1 }); // For category-based queries
productSchema.index({ category: 1 }); // For category name queries
productSchema.index({ price: 1 }); // For price range queries
productSchema.index({ createdAt: -1 }); // For sorting by creation date
productSchema.index({ isNewArrival: 1 }); // For new arrival filters
productSchema.index({ isBestSeller: 1 }); // For best seller filters
productSchema.index({ inStock: 1 }); // For stock availability queries
productSchema.index({ 'sizes.stock': 1 }); // For stock queries
productSchema.index({ name: 'text', description: 'text' }); // Text search index

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel
