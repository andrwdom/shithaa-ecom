"use client"

import { useEffect } from 'react'

interface PerformanceMonitorProps {
  enabled?: boolean
}

export default function PerformanceMonitor({ enabled = process.env.NODE_ENV === 'development' }: PerformanceMonitorProps) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Monitor image loading performance
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource' && entry.name.includes('.jpg') || entry.name.includes('.webp')) {
          console.log(`🖼️ Image loaded: ${entry.name}`, {
            duration: `${entry.duration.toFixed(2)}ms`,
            size: entry.transferSize ? `${(entry.transferSize / 1024).toFixed(2)}KB` : 'unknown'
          })
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })

    // Monitor Core Web Vitals
    const webVitalsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log(`🎯 LCP: ${entry.startTime.toFixed(2)}ms`)
        }
        if (entry.entryType === 'first-input') {
          console.log(`⚡ FID: ${entry.processingStart - entry.startTime}ms`)
        }
      })
    })

    webVitalsObserver.observe({ 
      entryTypes: ['largest-contentful-paint', 'first-input'] 
    })

    // Monitor layout shifts
    const layoutShiftObserver = new PerformanceObserver((list) => {
      let cumulativeLayoutShift = 0
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cumulativeLayoutShift += entry.value
        }
      })
      if (cumulativeLayoutShift > 0.1) {
        console.log(`📐 CLS: ${cumulativeLayoutShift.toFixed(3)}`)
      }
    })

    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })

    return () => {
      observer.disconnect()
      webVitalsObserver.disconnect()
      layoutShiftObserver.disconnect()
    }
  }, [enabled])

  return null
} 