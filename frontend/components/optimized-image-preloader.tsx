"use client"

import React, { useEffect, useRef, useState } from 'react'
import { preloadImages, ImageLoadResult } from '@/lib/image-utils'

interface OptimizedImagePreloaderProps {
  images: string[]
  onImagesLoaded?: (loadedImages: Set<string>) => void
  priority?: boolean
}

export default function OptimizedImagePreloader({ 
  images, 
  onImagesLoaded, 
  priority = false 
}: OptimizedImagePreloaderProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const preloadQueue = useRef<Set<string>>(new Set())
  const isPreloading = useRef(false)

  // Preload images efficiently
  useEffect(() => {
    if (!images || images.length === 0) return

    const preloadImage = async (src: string) => {
      if (loadedImages.has(src) || failedImages.has(src) || preloadQueue.current.has(src)) {
        return
      }

      preloadQueue.current.add(src)

      try {
        // Create a promise that resolves when image loads
        const imageLoadPromise = new Promise<void>((resolve, reject) => {
          const img = new Image()
          
          img.onload = () => {
            setLoadedImages(prev => new Set(prev).add(src))
            preloadQueue.current.delete(src)
            resolve()
          }
          
          img.onerror = () => {
            setFailedImages(prev => new Set(prev).add(src))
            preloadQueue.current.delete(src)
            reject(new Error(`Failed to load image: ${src}`))
          }
          
          // Set crossOrigin for external images
          if (src.startsWith('http') && !src.includes(window.location.origin)) {
            img.crossOrigin = 'anonymous'
          }
          
          img.src = src
        })

        // Add timeout for image loading
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Image load timeout')), 10000)
        })

        await Promise.race([imageLoadPromise, timeoutPromise])

      } catch (error) {
        console.warn(`Image preload failed for ${src}:`, error)
        setFailedImages(prev => new Set(prev).add(src))
        preloadQueue.current.delete(src)
      }
    }

    // Preload images with priority handling
    const preloadImagesBatch = async () => {
      if (isPreloading.current) return
      isPreloading.current = true

      try {
        if (priority) {
          // Load first image immediately, then others
          if (images.length > 0) {
            await preloadImage(images[0])
          }
          
          // Load remaining images in parallel (but limit concurrency)
          const remainingImages = images.slice(1)
          const concurrencyLimit = 3
          
          for (let i = 0; i < remainingImages.length; i += concurrencyLimit) {
            const batch = remainingImages.slice(i, i + concurrencyLimit)
            await Promise.allSettled(batch.map(preloadImage))
          }
        } else {
          // Load all images in parallel with limited concurrency
          const concurrencyLimit = 2
          
          for (let i = 0; i < images.length; i += concurrencyLimit) {
            const batch = images.slice(i, i + concurrencyLimit)
            await Promise.allSettled(batch.map(preloadImage))
          }
        }
      } finally {
        isPreloading.current = false
      }
    }

    preloadImagesBatch()
  }, [images, priority, loadedImages, failedImages])

  // Notify parent when images are loaded
  useEffect(() => {
    if (onImagesLoaded && loadedImages.size > 0) {
      onImagesLoaded(loadedImages)
    }
  }, [loadedImages, onImagesLoaded])

  // This component doesn't render anything visible
  return null
}

// Hook for using the preloader
export function useImagePreloader(images: string[], priority = false) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (images.length === 0) {
      setIsLoading(false)
      return
    }

    const allImagesLoaded = images.every(img => loadedImages.has(img))
    const anyImagesFailed = images.some(img => failedImages.has(img))

    if (allImagesLoaded || anyImagesFailed) {
      setIsLoading(false)
    }
  }, [images, loadedImages, failedImages])

  const handleImagesLoaded = (loaded: Set<string>) => {
    setLoadedImages(loaded)
  }

  return {
    loadedImages,
    failedImages,
    isLoading,
    handleImagesLoaded
  }
} 