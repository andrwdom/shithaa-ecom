import express from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import * as wishlistController from '../controllers/wishlistController.js';

const router = express.Router();

// Add product to wishlist
router.post('/add', verifyToken, wishlistController.addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', verifyToken, wishlistController.removeFromWishlist);

// Get user's wishlist
// 🔑 FIX: Replaced custom middleware with standard `verifyToken` to ensure `req.user` is always populated correctly.
// The frontend already prevents this call for logged-out users.
router.get('/', verifyToken, wishlistController.getWishlist);

// Get wishlist count
// 🔑 FIX: Replaced custom middleware with standard `verifyToken` for consistency and correctness.
router.get('/count', verifyToken, wishlistController.getWishlistCount);

export default router; 