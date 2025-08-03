import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Changed from 'UserModel' to 'user' to match userModel
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product', // Changed from 'Product' to 'product' to match productModel
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique combination of user and product
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema); 