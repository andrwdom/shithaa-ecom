import { useState, useEffect } from 'react'
import { CarouselImage, CarouselResponse, UseCarouselReturn } from '@/types/carousel'

export function useCarousel(): UseCarouselReturn {
  const [images, setImages] = useState<CarouselImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCarouselImages = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}/api/carousels`)
      
      if (!response.ok) {
        // Handle different error statuses gracefully
        if (response.status === 401) {
          console.log('Carousel API: Authentication required (expected for now)')
          setError(null) // Don't show error for 401
          setImages([]) // Use fallback images
        } else if (response.status === 404) {
          console.log('Carousel API: Endpoint not found (expected for now)')
          setError(null) // Don't show error for 404
          setImages([]) // Use fallback images
        } else {
          throw new Error(`Failed to fetch carousel images: ${response.status}`)
        }
        return
      }
      
      const data: CarouselResponse = await response.json()
      
      let carouselImages: CarouselImage[] = []
      
      if (data.success && data.data && Array.isArray(data.data)) {
        carouselImages = data.data
      } else if (data.carousels && Array.isArray(data.carousels)) {
        carouselImages = data.carousels
      } else if (Array.isArray(data)) {
        carouselImages = data
      }
      
      // Filter active images and sort by order
      const activeImages = carouselImages
        .filter(img => img.isActive !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
      
      setImages(activeImages)
    } catch (err) {
      console.error('Error fetching carousel images:', err)
      // Only set error for unexpected errors, not 401/404
      if (err instanceof Error && !err.message.includes('401') && !err.message.includes('404')) {
        setError(err.message)
      } else {
        setError(null)
      }
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCarouselImages()
  }, [])

  const refetch = async () => {
    await fetchCarouselImages()
  }

  return {
    images,
    loading,
    error,
    refetch
  }
} 