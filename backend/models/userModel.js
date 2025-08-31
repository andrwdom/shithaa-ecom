import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    cartData: { type: Object, default: {} },
    isAdmin: { type: Boolean, default: false }
}, { minimize: false })

// 🔧 FIX: Add performance indexes for frequently queried fields
userSchema.index({ email: 1 }); // Already unique, but explicit for clarity
userSchema.index({ isAdmin: 1 }); // For admin role queries
userSchema.index({ createdAt: -1 }); // For user creation date queries

const userModel = mongoose.models.user || mongoose.model('user',userSchema);

export default userModel