import express from 'express'
import { getHeroImages, heroImagesHealth } from '../controllers/heroImagesController.js'

const heroImagesRouter = express.Router()

// GET /api/hero-images?categoryId=<id>&limit=<n>
heroImagesRouter.get('/', getHeroImages)

// GET /api/hero-images/health - Health check endpoint
heroImagesRouter.get('/health', heroImagesHealth)

export default heroImagesRouter 