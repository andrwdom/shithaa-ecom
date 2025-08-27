import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { 
    getAllCoupons, 
    createCoupon, 
    deleteCoupon, 
    validateCoupon 
} from '../controllers/couponController.js';

const router = express.Router();

// Admin routes (protected)
router.get('/', verifyToken, getAllCoupons);
router.post('/', verifyToken, createCoupon);
router.delete('/:id', verifyToken, deleteCoupon);

// Public route for coupon validation
router.post('/validate', validateCoupon);

export default router;