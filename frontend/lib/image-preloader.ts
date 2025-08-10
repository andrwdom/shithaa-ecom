import { useState, useEffect, useCallback } from 'react'

interface ImagePreloadOptions {
  timeout?: number
  onProgress?: (loaded: number, total: number) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export class ImagePreloader {
  private images: string[] = []
  private loadedImages: Map<string, HTMLImageElement> = new Map()
  private failedImages: Set<string> = new Set()
  private isPreloading = false

  constructor(images: string[]) {
    this.images = images
  }

  async preload(options: ImagePreloadOptions = {}): Promise<Map<string, HTMLImageElement>> {
    if (this.isPreloading) {
      return this.loadedImages
    }

    this.isPreloading = true
    const { timeout = 10000, onProgress, onComplete, onError } = options

    const totalImages = this.images.length
    let loadedCount = 0

    const preloadPromises = this.images.map(async (src) => {
      try {
        const img = await this.loadImage(src, timeout)
        this.loadedImages.set(src, img)
        loadedCount++
        
        if (onProgress) {
          onProgress(loadedCount, totalImages)
        }
        
        return img
      } catch (error) {
        this.failedImages.add(src)
        if (onError) {
          onError(error as Error)
        }
        throw error
      }
    })

    try {
      await Promise.allSettled(preloadPromises)
      
      if (onComplete) {
        onComplete()
      }
      
      return this.loadedImages
    } finally {
      this.isPreloading = false
    }
  }

  private loadImage(src: string, timeout: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image preload timeout: ${src}`))
      }, timeout)

      img.onload = () => {
        clearTimeout(timeoutId)
        resolve(img)
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to load image: ${src}`))
      }

      // Set crossOrigin for external images if needed
      if (src.startsWith('http') && !src.includes(window.location.origin)) {
        img.crossOrigin = 'anonymous'
      }

      img.src = src
    })
  }

  getLoadedImage(src: string): HTMLImageElement | undefined {
    return this.loadedImages.get(src)
  }

  isImageLoaded(src: string): boolean {
    return this.loadedImages.has(src)
  }

  getLoadedCount(): number {
    return this.loadedImages.size
  }

  getTotalCount(): number {
    return this.images.length
  }

  getFailedImages(): string[] {
    return Array.from(this.failedImages)
  }

  clear(): void {
    this.loadedImages.clear()
    this.failedImages.clear()
    this.isPreloading = false
  }
}

// Utility function for quick preloading
export async function preloadImages(
  images: string[], 
  options?: ImagePreloadOptions
): Promise<Map<string, HTMLImageElement>> {
  const preloader = new ImagePreloader(images)
  return preloader.preload(options)
}

// Hook for React components
export function useImagePreloader(images: string[]) {
  const [isPreloading, setIsPreloading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const startPreloading = useCallback(async () => {
    if (images.length === 0) return

    setIsPreloading(true)
    setError(null)
    setIsComplete(false)

    try {
      await preloadImages(images, {
        onProgress: (loaded, total) => {
          setProgress({ loaded, total })
        },
        onComplete: () => {
          setIsComplete(true)
          setIsPreloading(false)
        },
        onError: (err) => {
          setError(err)
          setIsPreloading(false)
        }
      })
    } catch (err) {
      setError(err as Error)
      setIsPreloading(false)
    }
  }, [images])

  useEffect(() => {
    startPreloading()
  }, [startPreloading])

  return {
    isPreloading,
    progress,
    isComplete,
    error,
    startPreloading
  }
} 