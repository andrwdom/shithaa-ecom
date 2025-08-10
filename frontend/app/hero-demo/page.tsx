"use client"

import React, { useState } from 'react'
import HeroSectionOptimized from '@/components/hero-section-optimized'
import HeroSection from '@/components/hero-section'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'
import { useImagePreloader } from '@/lib/image-preloader'

export default function HeroDemoPage() {
  const [showOptimized, setShowOptimized] = useState(true)
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(true)
  
  const { metrics } = usePerformanceMonitor(showPerformanceMetrics)
  
  // Sample images for preloading demo
  const sampleImages = [
    '/blue-dress.JPG',
    '/zipless-feeding-lounge-wear.JPG',
    '/maternity-feeding-wear.JPG',
    '/zipless-feeding-lounge-wear-2.JPG'
  ]
  
  const { isPreloading, progress, isComplete } = useImagePreloader(sampleImages)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Hero Section Performance Demo
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Compare the original vs optimized hero section performance
          </p>
          
          {/* Performance Metrics */}
          {showPerformanceMetrics && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics.fps}</div>
                  <div className="text-sm text-gray-500">FPS</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics.frameTime}ms</div>
                  <div className="text-sm text-gray-500">Frame Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{metrics.droppedFrames}</div>
                  <div className="text-sm text-gray-500">Dropped Frames</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${metrics.isSmooth ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.isSmooth ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-gray-500">Smooth</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Image Preloading Status */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Image Preloading Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Preloading Images:</span>
                <span className={`font-semibold ${isPreloading ? 'text-yellow-600' : 'text-green-600'}`}>
                  {isPreloading ? 'In Progress' : 'Complete'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500 text-center">
                {progress.loaded} / {progress.total} images loaded
              </div>
            </div>
          </div>
          
          {/* Toggle Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowOptimized(true)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                showOptimized 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Optimized Version
            </button>
            <button
              onClick={() => setShowOptimized(false)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                !showOptimized 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Original Version
            </button>
            <button
              onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
              className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
            >
              {showPerformanceMetrics ? 'Hide' : 'Show'} Performance Metrics
            </button>
          </div>
        </div>
        
        {/* Hero Section Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {showOptimized ? (
            <div>
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                <h3 className="text-lg font-semibold text-blue-800">
                  🚀 Optimized Hero Section
                </h3>
                <p className="text-sm text-blue-600">
                  Features: GPU acceleration, intersection observer, image preloading, staggered animations
                </p>
              </div>
              <HeroSectionOptimized />
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  📱 Original Hero Section
                </h3>
                <p className="text-sm text-gray-600">
                  Basic implementation with standard CSS transitions
                </p>
              </div>
              <HeroSection />
            </div>
          )}
        </div>
        
        {/* Performance Tips */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Optimization Tips</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-700 mb-2">✅ What's Optimized</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• GPU-accelerated animations using transform3d</li>
                <li>• Intersection Observer to pause off-screen animations</li>
                <li>• Image preloading to prevent flickering</li>
                <li>• Staggered animation timing for smooth performance</li>
                <li>• Visibility change detection to pause when tab is inactive</li>
                <li>• Mobile-optimized animation speeds</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-700 mb-2">🔧 Technical Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• React.memo for component memoization</li>
                <li>• useCallback and useMemo for stable references</li>
                <li>• CSS will-change property for GPU hints</li>
                <li>• Cubic-bezier easing for natural motion</li>
                <li>• Performance monitoring with FPS tracking</li>
                <li>• Responsive design with mobile-first approach</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 