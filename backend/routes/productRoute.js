import express from 'express'
import {
    listProducts,
    singleProduct,
    getProductById,
    getAllProducts
} from '../controllers/productController.js'

const productRouter = express.Router();

// Public RESTful routes only
productRouter.get('/', getAllProducts); // GET /api/products
productRouter.get('/category/:category', getAllProducts); // GET /api/products/category/:category (filtered in controller)
productRouter.get('/:id', getProductById); // GET /api/products/:id

export default productRouter