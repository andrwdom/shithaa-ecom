import express from 'express'
import { addToCart, getUserCart, updateCart, removeFromCart, calculateCartTotal, getBulkStock, getCartItemsByUserId } from '../controllers/cartController.js'
import { verifyToken } from '../middleware/auth.js'

const cartRouter = express.Router()

cartRouter.post('/get', verifyToken, getUserCart)
cartRouter.post('/add', verifyToken, addToCart)
cartRouter.post('/update', verifyToken, updateCart)
cartRouter.post('/remove', verifyToken, removeFromCart)
cartRouter.post('/calculate-total', calculateCartTotal) // No auth required - frontend needs this
cartRouter.post('/get-stock', verifyToken, getBulkStock)
cartRouter.post('/get-items', getCartItemsByUserId) // No auth required - for frontend restoration

export default cartRouter