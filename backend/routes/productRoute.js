import express from 'express'
import {
    listProducts,
    singleProduct,
    getProductById,
    getAllProducts,
    addProduct,
    removeProduct,
    updateProduct,
    reorderProducts,
    moveProduct
} from '../controllers/productController.js'
import { verifyToken } from '../middleware/auth.js'
import multer from '../middleware/multer.js'

const productRouter = express.Router();

// Public RESTful routes
productRouter.get('/', getAllProducts); // GET /api/products
productRouter.get('/category/:category', getAllProducts); // GET /api/products/category/:category
productRouter.get('/:id', getProductById); // GET /api/products/:id

// Admin routes with authentication
productRouter.post('/', verifyToken, multer.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), addProduct);

productRouter.delete('/:id', verifyToken, removeProduct);
productRouter.put('/:id', verifyToken, multer.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), updateProduct);

// Product ordering routes
productRouter.put('/reorder', verifyToken, reorderProducts);
productRouter.put('/move', verifyToken, moveProduct);

export default productRouter