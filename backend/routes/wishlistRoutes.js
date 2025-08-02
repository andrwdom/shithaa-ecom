import express from 'express';
import { verifyToken as auth } from '../middleware/auth.js';
import * as wishlistController from '../controllers/wishlistController.js';

const router = express.Router();

// Add product to wishlist
router.post('/add', auth, wishlistController.addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', auth, wishlistController.removeFromWishlist);

// Get user's wishlist
router.get('/', auth, wishlistController.getWishlist);

// Get wishlist count
router.get('/count', auth, wishlistController.getWishlistCount);

export default router; 