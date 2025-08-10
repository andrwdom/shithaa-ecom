import express from 'express'
import { getHeroImages } from '../controllers/heroImagesController.js'

const heroImagesRouter = express.Router()

// GET /api/hero-images?categoryId=<id>&limit=<n>
heroImagesRouter.get('/', getHeroImages)

export default heroImagesRouter 