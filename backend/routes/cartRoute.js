import express from 'express'
import { addToCart, getUserCart, updateCart, calculateCartTotal, getBulkStock } from '../controllers/cartController.js'
import { verifyToken } from '../middleware/auth.js'

const cartRouter = express.Router()

cartRouter.post('/get', verifyToken, getUserCart)
cartRouter.post('/add', verifyToken, addToCart)
cartRouter.post('/update', verifyToken, updateCart)
cartRouter.post('/calculate-total', calculateCartTotal)
cartRouter.post('/get-stock', verifyToken, getBulkStock)

export default cartRouter