import express from 'express'
import { verifyToken } from '../middleware/auth.js'

const carouselRouter = express.Router()

// Sample carousel data - replace with database integration
const sampleCarousels = [
  {
    id: 'carousel-1',
    url: '/blue-dress.JPG',
    alt: 'Maternity Feeding Wear Collection',
    title: 'New Maternity Collection',
    link: '/collections/maternity-feeding-wear',
    order: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'carousel-2',
    url: '/prink-dress.JPG',
    alt: 'Zipless Feeding Lounge Wear',
    title: 'Revolutionary Zipless Design',
    link: '/collections/zipless-feeding-lounge-wear',
    order: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'carousel-3',
    url: '/leopard-dress.jpg',
    alt: 'Non-Feeding Lounge Wear',
    title: 'Comfortable Everyday Wear',
    link: '/collections/non-feeding-lounge-wear',
    order: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// GET /api/carousels - Get all active carousel images
carouselRouter.get('/', async (req, res) => {
  try {
    // Filter active carousels and sort by order
    const activeCarousels = sampleCarousels
      .filter(carousel => carousel.isActive)
      .sort((a, b) => a.order - b.order)

    res.json({
      success: true,
      data: activeCarousels,
      message: 'Carousel images retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching carousel images:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carousel images',
      error: error.message
    })
  }
})

// GET /api/carousels/:id - Get specific carousel image
carouselRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const carousel = sampleCarousels.find(c => c.id === id)

    if (!carousel) {
      return res.status(404).json({
        success: false,
        message: 'Carousel image not found'
      })
    }

    res.json({
      success: true,
      data: carousel,
      message: 'Carousel image retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching carousel image:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carousel image',
      error: error.message
    })
  }
})

// POST /api/carousels - Create new carousel image (admin only)
carouselRouter.post('/', verifyToken, async (req, res) => {
  try {
    const { url, alt, title, link, order, isActive } = req.body

    // Validate required fields
    if (!url || !alt || !title) {
      return res.status(400).json({
        success: false,
        message: 'URL, alt text, and title are required'
      })
    }

    const newCarousel = {
      id: `carousel-${Date.now()}`,
      url,
      alt,
      title,
      link: link || null,
      order: order || sampleCarousels.length + 1,
      isActive: isActive !== false, // Default to true
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // In a real app, save to database
    // sampleCarousels.push(newCarousel)

    res.status(201).json({
      success: true,
      data: newCarousel,
      message: 'Carousel image created successfully'
    })
  } catch (error) {
    console.error('Error creating carousel image:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create carousel image',
      error: error.message
    })
  }
})

// PUT /api/carousels/:id - Update carousel image (admin only)
carouselRouter.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const carouselIndex = sampleCarousels.findIndex(c => c.id === id)
    if (carouselIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Carousel image not found'
      })
    }

    // Update carousel
    sampleCarousels[carouselIndex] = {
      ...sampleCarousels[carouselIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    res.json({
      success: true,
      data: sampleCarousels[carouselIndex],
      message: 'Carousel image updated successfully'
    })
  } catch (error) {
    console.error('Error updating carousel image:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update carousel image',
      error: error.message
    })
  }
})

// DELETE /api/carousels/:id - Delete carousel image (admin only)
carouselRouter.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const carouselIndex = sampleCarousels.findIndex(c => c.id === id)

    if (carouselIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Carousel image not found'
      })
    }

    // In a real app, delete from database
    // sampleCarousels.splice(carouselIndex, 1)

    res.json({
      success: true,
      message: 'Carousel image deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting carousel image:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete carousel image',
      error: error.message
    })
  }
})

export default carouselRouter 