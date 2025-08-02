import mongoose from 'mongoose'
import CarouselBanner from '../models/CarouselBanner.js'
import 'dotenv/config'

const seedCarouselData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Clear existing carousel data
    await CarouselBanner.deleteMany({})
    console.log('Cleared existing carousel data')

    // Sample carousel data
    const carouselData = [
      {
        image: '/blue-dress.JPG',
        title: 'New Maternity Collection',
        description: 'Comfortable and stylish feeding wear for new mothers',
        link: '/collections/maternity-feeding-wear',
        order: 1,
        isActive: true
      },
      {
        image: '/prink-dress.JPG',
        title: 'Revolutionary Zipless Design',
        description: 'Hassle-free feeding experience with innovative design',
        link: '/collections/zipless-feeding-lounge-wear',
        order: 2,
        isActive: true
      },
      {
        image: '/leopard-dress.jpg',
        title: 'Comfortable Everyday Wear',
        description: 'Perfect for expecting mothers - comfort meets style',
        link: '/collections/non-feeding-lounge-wear',
        order: 3,
        isActive: true
      }
    ]

    // Insert carousel data
    const banners = await CarouselBanner.insertMany(carouselData)
    console.log(`Seeded ${banners.length} carousel banners`)

    // Display the created banners
    banners.forEach((banner, index) => {
      console.log(`${index + 1}. ${banner.title} - ${banner.image}`)
    })

    console.log('Carousel seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding carousel data:', error)
    process.exit(1)
  }
}

// Run the seeding function
seedCarouselData() 