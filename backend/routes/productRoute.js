import express from 'express'
import { 
    listProducts, 
    addProduct, 
    removeProduct, 
    singleProduct, 
    updateProduct,
    getProductById,
    getAllProducts,
    reorderProducts
} from '../controllers/productController.js'
import upload from '../middleware/multer.js';
import { isAdmin } from '../middleware/auth.js';

const productRouter = express.Router();

// Public RESTful routes
productRouter.get('/', getAllProducts); // GET /api/products
productRouter.get('/category/:category', getAllProducts); // GET /api/products/category/:category (filtered in controller)

// Batch reorder route must come before any dynamic :id routes
productRouter.put('/reorder', reorderProducts);

// Admin routes - protected with isAdmin middleware
productRouter.post('/', isAdmin, upload.fields([{name:'image1',maxCount:1},{name:'image2',maxCount:1},{name:'image3',maxCount:1},{name:'image4',maxCount:1}]), addProduct); // POST /api/products
productRouter.get('/:id', getProductById); // GET /api/products/:id
productRouter.put('/:id', isAdmin, upload.fields([{name:'image1',maxCount:1},{name:'image2',maxCount:1},{name:'image3',maxCount:1},{name:'image4',maxCount:1}]), updateProduct); // PUT /api/products/:id
productRouter.delete('/:id', isAdmin, removeProduct); // DELETE /api/products/:id

export default productRouter