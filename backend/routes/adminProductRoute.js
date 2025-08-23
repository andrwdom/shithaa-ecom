import express from 'express';
import { addProduct, removeProduct, updateProduct, reorderProducts, moveProduct } from '../controllers/productController.js';
import { auth } from '../middleware/auth.js';
import multer from '../middleware/multer.js';

const adminProductRouter = express.Router();

// Admin routes with authentication and file upload middleware
adminProductRouter.post('/', auth, multer.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), addProduct);

adminProductRouter.delete('/:id', auth, removeProduct);
adminProductRouter.put('/:id', auth, multer.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), updateProduct);

// Product ordering routes
adminProductRouter.post('/reorder', auth, reorderProducts);
adminProductRouter.post('/move', auth, moveProduct);

export default adminProductRouter;
