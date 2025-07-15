import mongoose from "mongoose";

const sizeSchema = new mongoose.Schema({
    size: { type: String, required: true },
    stock: { type: Number, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
    customId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    description: { type: String, required: true },
    images: [{ type: String, required: true }],
    category: { type: String, required: true },
    categorySlug: { type: String, default: "" },
    subCategory: { type: String, default: "" },
    type: { type: String, default: "" },
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
    stock: { type: Number, default: 0 }
}, {
    timestamps: true
});

productSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel