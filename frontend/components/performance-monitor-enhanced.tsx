"use client"

import { useEffect } from 'react'

interface PerformanceMonitorEnhancedProps {
  enabled?: boolean
  logToConsole?: boolean
  sendToAnalytics?: boolean
}

export default function PerformanceMonitorEnhanced({ 
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = true,
  sendToAnalytics = false
}: PerformanceMonitorEnhancedProps) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Core Web Vitals monitoring
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          const lcp = entry.startTime
          if (logToConsole) {
            console.log('🎯 LCP (Largest Contentful Paint):', `${lcp.toFixed(2)}ms`)
            if (lcp > 2500) {
              console.warn('⚠️ LCP is above recommended threshold (2.5s)')
            }
          }
          if (sendToAnalytics) {
            // Send to analytics service
            console.log('📊 Sending LCP to analytics:', lcp)
          }
        }

        if (entry.entryType === 'first-input') {
          const fid = entry.processingStart - entry.startTime
          if (logToConsole) {
            console.log('⚡ FID (First Input Delay):', `${fid.toFixed(2)}ms`)
            if (fid > 100) {
              console.warn('⚠️ FID is above recommended threshold (100ms)')
            }
          }
        }

        if (entry.entryType === 'layout-shift') {
          const cls = (entry as any).value
          if (logToConsole) {
            console.log('📐 CLS (Cumulative Layout Shift):', cls.toFixed(4))
            if (cls > 0.1) {
              console.warn('⚠️ CLS is above recommended threshold (0.1)')
            }
          }
        }
      }
    })

    // Image loading performance
    const imageObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'img' || entry.initiatorType === 'image') {
          const loadTime = entry.responseEnd - entry.fetchStart
          const size = entry.transferSize || 0
          
          if (logToConsole) {
            console.log(`🖼️ Image loaded: ${entry.name}`, {
              loadTime: `${loadTime.toFixed(2)}ms`,
              size: `${(size / 1024).toFixed(2)}KB`,
              type: entry.initiatorType
            })
            
            // Warn about slow images
            if (loadTime > 1000) {
              console.warn(`🐌 Slow image: ${entry.name} took ${loadTime.toFixed(2)}ms`)
            }
            
            // Warn about large images
            if (size > 500 * 1024) {
              console.warn(`📦 Large image: ${entry.name} is ${(size / 1024).toFixed(2)}KB`)
            }
          }
        }
      }
    })

    // Resource loading performance
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'css' || entry.initiatorType === 'script') {
          const loadTime = entry.responseEnd - entry.fetchStart
          
          if (logToConsole) {
            console.log(`📦 Resource loaded: ${entry.name}`, {
              type: entry.initiatorType,
              loadTime: `${loadTime.toFixed(2)}ms`,
              size: `${((entry.transferSize || 0) / 1024).toFixed(2)}KB`
            })
          }
        }
      }
    })

    // Navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          
          if (logToConsole) {
            console.log('🚀 Page Load Performance:', {
              'DOM Content Loaded': `${(nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart).toFixed(2)}ms`,
              'Load Complete': `${(nav.loadEventEnd - nav.loadEventStart).toFixed(2)}ms`,
              'Total Load Time': `${(nav.loadEventEnd - nav.fetchStart).toFixed(2)}ms`,
              'Time to First Byte': `${(nav.responseStart - nav.requestStart).toFixed(2)}ms`
            })
          }
        }
      }
    })

    // Start observing
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
      imageObserver.observe({ entryTypes: ['resource'] })
      resourceObserver.observe({ entryTypes: ['resource'] })
      navigationObserver.observe({ entryTypes: ['navigation'] })
    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
    }

    // Fashion-specific metrics
    const trackFashionMetrics = () => {
      // Track product image loading
      const productImages = document.querySelectorAll('img[src*="product"], img[src*="dress"], img[src*="clothing"]')
      console.log(`👗 Product images found: ${productImages.length}`)
      
      // Track hero/banner images
      const heroImages = document.querySelectorAll('img[src*="hero"], img[src*="banner"], img[src*="carousel"]')
      console.log(`🎯 Hero images found: ${heroImages.length}`)
      
      // Check for WebP support
      const webpSupport = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0
      console.log(`🌐 WebP support: ${webpSupport ? '✅ Yes' : '❌ No'}`)
      
      // Check for lazy loading support
      const lazySupport = 'loading' in HTMLImageElement.prototype
      console.log(`😴 Lazy loading support: ${lazySupport ? '✅ Yes' : '❌ No'}`)
    }

    // Run fashion metrics after page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', trackFashionMetrics)
    } else {
      trackFashionMetrics()
    }

    // Cleanup
    return () => {
      observer.disconnect()
      imageObserver.disconnect()
      resourceObserver.disconnect()
      navigationObserver.disconnect()
    }
  }, [enabled, logToConsole, sendToAnalytics])

  return null
} 