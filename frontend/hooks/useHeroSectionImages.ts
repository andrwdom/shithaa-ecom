import { useState, useEffect, useCallback, useMemo } from 'react'
import { getHeroSectionImages, type HeroSectionImage } from '@/lib/hero-section-images'

interface UseHeroSectionImagesReturn {
  images: HeroSectionImage[]
  isLoading: boolean
  error: string | null
  currentImageIndex: number
  isTransitioning: boolean
  isPaused: boolean
  pauseSlideshow: () => void
  resumeSlideshow: () => void
  nextImage: () => void
  previousImage: () => void
  goToImage: (index: number) => void
  refreshImages: () => void
}

interface UseHeroSectionImagesOptions {
  categorySlug: string
  limit?: number
  autoPlay?: boolean
  interval?: number
  enableControls?: boolean
}

// Cache for storing fetched images to avoid repeated API calls
const imageCache = new Map<string, { 
  images: HeroSectionImage[], 
  timestamp: number,
  categorySlug: string 
}>()

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export function useHeroSectionImages({
  categorySlug,
  limit = 8,
  autoPlay = true,
  interval = 5000,
  enableControls = true
}: UseHeroSectionImagesOptions): UseHeroSectionImagesReturn {
  const [images, setImages] = useState<HeroSectionImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch images function with caching
  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check cache first
      const cached = imageCache.get(categorySlug)
      if (cached && 
          Date.now() - cached.timestamp < CACHE_DURATION && 
          cached.images.length >= limit) {
        setImages(cached.images.slice(0, limit))
        setIsLoading(false)
        return
      }

      // Fetch fresh images
      const fetchedImages = await getHeroSectionImages(categorySlug, limit)
      setImages(fetchedImages)

      // Update cache
      imageCache.set(categorySlug, {
        images: fetchedImages,
        timestamp: Date.now(),
        categorySlug
      })

    } catch (err) {
      console.error(`Error fetching hero section images for ${categorySlug}:`, err)
      setError('Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }, [categorySlug, limit])

  // Fetch images on mount and when categorySlug changes
  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // Auto-rotate images
  useEffect(() => {
    if (!autoPlay || images.length <= 1 || isPaused) return

    const intervalId = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length)
        setIsTransitioning(false)
      }, 300) // Half of the transition duration
    }, interval)

    return () => clearInterval(intervalId)
  }, [autoPlay, images.length, isPaused, interval])

  // Preload next image for smooth transitions
  useEffect(() => {
    if (images.length > 1) {
      const nextImage = images[(currentImageIndex + 1) % images.length]
      if (nextImage?.isValid && nextImage.src) {
        const img = new Image()
        img.src = nextImage.src
      }
    }
  }, [currentImageIndex, images])

  // Control functions
  const pauseSlideshow = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resumeSlideshow = useCallback(() => {
    setIsPaused(false)
  }, [])

  const nextImage = useCallback(() => {
    if (images.length <= 1) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length)
      setIsTransitioning(false)
    }, 300)
  }, [images.length])

  const previousImage = useCallback(() => {
    if (images.length <= 1) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)
      setIsTransitioning(false)
    }, 300)
  }, [images.length])

  const goToImage = useCallback((index: number) => {
    if (index < 0 || index >= images.length) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentImageIndex(index)
      setIsTransitioning(false)
    }, 300)
  }, [images.length])

  const refreshImages = useCallback(() => {
    // Clear cache for this category to force fresh fetch
    imageCache.delete(categorySlug)
    fetchImages()
  }, [categorySlug, fetchImages])

  // Memoized current image
  const currentImage = useMemo(() => {
    return images[currentImageIndex] || null
  }, [images, currentImageIndex])

  // Memoized next image
  const nextImageData = useMemo(() => {
    if (images.length <= 1) return currentImage
    return images[(currentImageIndex + 1) % images.length]
  }, [images, currentImageIndex, currentImage])

  return {
    images,
    isLoading,
    error,
    currentImageIndex,
    isTransitioning,
    isPaused,
    pauseSlideshow,
    resumeSlideshow,
    nextImage,
    previousImage,
    goToImage,
    refreshImages
  }
} 