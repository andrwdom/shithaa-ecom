import express from 'express'

const carouselRouter = express.Router()

// Sample carousel data
const sampleCarousels = [
  {
    id: 'carousel-1',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop',
    alt: 'Fashion Collection 1',
    title: 'New Arrivals',
    link: '/collections/new-arrivals',
    order: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'carousel-2',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=400&fit=crop',
    alt: 'Fashion Collection 2',
    title: 'Summer Styles',
    link: '/collections/summer',
    order: 2,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'carousel-3',
    url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop',
    alt: 'Fashion Collection 3',
    title: 'Trending Now',
    link: '/collections/trending',
    order: 3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
]

// GET /api/carousels - Get all active carousel images (public)
carouselRouter.get('/', (req, res) => {
  try {
    const activeCarousels = sampleCarousels
      .filter(carousel => carousel.isActive)
      .sort((a, b) => a.order - b.order)

    res.json({
      success: true,
      data: activeCarousels,
      message: 'Carousel images retrieved successfully'
    })
  } catch (error) {
    console.error('Error retrieving carousel images:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve carousel images',
      error: error.message
    })
  }
})

// GET /api/carousels/:id - Get specific carousel image (public)
carouselRouter.get('/:id', (req, res) => {
  try {
    const { id } = req.params
    const carousel = sampleCarousels.find(c => c.id === id && c.isActive)

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
    console.error('Error retrieving carousel image:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve carousel image',
      error: error.message
    })
  }
})

export default carouselRouter 