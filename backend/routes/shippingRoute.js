import express from 'express'
import { calculateShipping } from '../controllers/shippingController.js'

const shippingRouter = express.Router()

// POST /api/shipping/calculate
shippingRouter.post('/calculate', calculateShipping)

export default shippingRouter 