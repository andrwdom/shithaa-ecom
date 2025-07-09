import express from 'express';
import { createCoupon, getAllCoupons, getCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin routes
router.post('/', isAdmin, createCoupon);
router.get('/', isAdmin, getAllCoupons);
router.get('/:id', isAdmin, getCoupon);
router.put('/:id', isAdmin, updateCoupon);
router.delete('/:id', isAdmin, deleteCoupon);

// Public route for coupon validation
router.post('/validate', validateCoupon);

export default router; 