import express from 'express';
import { getCarouselBanners } from '../controllers/carouselController.js';

const router = express.Router();

// Public route to get all active banners (for frontend)
router.get('/', getCarouselBanners);

export default router; 