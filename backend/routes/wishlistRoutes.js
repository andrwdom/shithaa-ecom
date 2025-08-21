import express from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import * as wishlistController from '../controllers/wishlistController.js';

const router = express.Router();

// Add product to wishlist
router.post('/add', verifyToken, wishlistController.addToWishlist);

// Remove product from wishlist
router.delete('/remove/:productId', verifyToken, wishlistController.removeFromWishlist);

// Get user's wishlist
router.get('/', (req, res, next) => {
  // Allow without auth for now - return empty wishlist for unauthenticated users
  if (!req.user) {
    return res.json({ success: true, items: [] });
  }
  next();
}, wishlistController.getWishlist);

// Get wishlist count
router.get('/count', (req, res, next) => {
  // Allow without auth for now - return 0 for unauthenticated users
  if (!req.user) {
    return res.json({ success: true, count: 0 });
  }
  next();
}, wishlistController.getWishlistCount);

export default router; 