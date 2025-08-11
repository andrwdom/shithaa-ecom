import express from 'express'
import { addToCart, getUserCart, updateCart, removeFromCart, calculateCartTotal } from '../controllers/cartController.js'
import { getBulkProductStock } from '../controllers/stockController.js'
import { verifyToken } from '../middleware/auth.js'

const cartRouter = express.Router()

cartRouter.post('/get', verifyToken, getUserCart)
cartRouter.post('/add', verifyToken, addToCart)
cartRouter.post('/update', verifyToken, updateCart)
cartRouter.post('/remove', verifyToken, removeFromCart)
cartRouter.post('/calculate-total', calculateCartTotal)
cartRouter.post('/get-stock', getBulkProductStock) // New route for bulk stock info

export default cartRouter