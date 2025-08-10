"use client"

import React, { useEffect, useState } from 'react'

interface PerformanceMetrics {
  imageLoadTimes: number[]
  totalImages: number
  failedImages: number
  averageLoadTime: number
  slowestImage: number
  fastestImage: number
}

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    imageLoadTimes: [],
    totalImages: 0,
    failedImages: 0,
    averageLoadTime: 0,
    slowestImage: 0,
    fastestImage: 0
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    // Listen for custom performance events
    const handleImageLoad = (event: CustomEvent) => {
      const { loadTime, success } = event.detail
      
      setMetrics(prev => {
        const newLoadTimes = success ? [...prev.imageLoadTimes, loadTime] : prev.imageLoadTimes
        const newFailedCount = success ? prev.failedImages : prev.failedImages + 1
        
        const newMetrics = {
          imageLoadTimes: newLoadTimes,
          totalImages: prev.totalImages + 1,
          failedImages: newFailedCount,
          averageLoadTime: newLoadTimes.length > 0 
            ? newLoadTimes.reduce((a, b) => a + b, 0) / newLoadTimes.length 
            : 0,
          slowestImage: newLoadTimes.length > 0 ? Math.max(...newLoadTimes) : 0,
          fastestImage: newLoadTimes.length > 0 ? Math.min(...newLoadTimes) : 0
        }
        
        return newMetrics
      })
    }

    const handlePerformanceEvent = (event: CustomEvent) => {
      if (event.type === 'image-load') {
        handleImageLoad(event)
      }
    }

    // Listen for performance events
    window.addEventListener('image-load', handlePerformanceEvent as EventListener)
    
    // Toggle visibility with Ctrl+Shift+P
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('image-load', handlePerformanceEvent as EventListener)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  if (!isVisible || process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-xs z-50 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Images:</span>
          <span className="text-green-400">{metrics.totalImages}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Failed Images:</span>
          <span className="text-red-400">{metrics.failedImages}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Success Rate:</span>
          <span className="text-blue-400">
            {metrics.totalImages > 0 
              ? Math.round(((metrics.totalImages - metrics.failedImages) / metrics.totalImages) * 100)
              : 0}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Avg Load Time:</span>
          <span className="text-yellow-400">
            {metrics.averageLoadTime > 0 ? `${Math.round(metrics.averageLoadTime)}ms` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Fastest:</span>
          <span className="text-green-400">
            {metrics.fastestImage > 0 ? `${Math.round(metrics.fastestImage)}ms` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Slowest:</span>
          <span className="text-red-400">
            {metrics.slowestImage > 0 ? `${Math.round(metrics.slowestImage)}ms` : 'N/A'}
          </span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-600">
        <p className="text-gray-400 text-xs">
          Press Ctrl+Shift+P to toggle
        </p>
      </div>
    </div>
  )
}

export default PerformanceMonitor 