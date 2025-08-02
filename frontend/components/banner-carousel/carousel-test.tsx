"use client"

import React from 'react'
import BannerCarousel from '../banner-carousel'
import { CarouselImage } from '@/types/carousel'

// Mock data for testing
const mockCarouselImages: CarouselImage[] = [
  {
    id: 'test-1',
    url: '/blue-dress.JPG',
    alt: 'Maternity Feeding Wear Collection',
    title: 'New Maternity Collection',
    link: '/collections/maternity-feeding-wear',
    order: 1,
    isActive: true
  },
  {
    id: 'test-2',
    url: '/prink-dress.JPG',
    alt: 'Zipless Feeding Lounge Wear',
    title: 'Revolutionary Zipless Design',
    link: '/collections/zipless-feeding-lounge-wear',
    order: 2,
    isActive: true
  },
  {
    id: 'test-3',
    url: '/leopard-dress.jpg',
    alt: 'Non-Feeding Lounge Wear',
    title: 'Comfortable Everyday Wear',
    link: '/collections/non-feeding-lounge-wear',
    order: 3,
    isActive: true
  }
]

export default function CarouselTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Banner Carousel Test
          </h1>
          <p className="text-gray-600">
            Testing the banner carousel component with mock data
          </p>
        </div>

        {/* Test 1: Default carousel */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test 1: Default Carousel (API + Fallback)
          </h2>
          <BannerCarousel />
        </div>

        {/* Test 2: Carousel with mock data */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test 2: Carousel with Mock Data
          </h2>
          <BannerCarousel images={mockCarouselImages} />
        </div>

        {/* Test 3: Carousel without auto-play */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test 3: Carousel without Auto-play
          </h2>
          <BannerCarousel 
            images={mockCarouselImages}
            autoPlay={false}
            showArrows={true}
            showDots={true}
          />
        </div>

        {/* Test 4: Carousel without controls */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test 4: Carousel without Controls
          </h2>
          <BannerCarousel 
            images={mockCarouselImages}
            showArrows={false}
            showDots={false}
          />
        </div>

        {/* Test 5: Fast auto-play */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test 5: Fast Auto-play (2 seconds)
          </h2>
          <BannerCarousel 
            images={mockCarouselImages}
            interval={2000}
          />
        </div>

        {/* Instructions */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Test Instructions
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• <strong>Test 1:</strong> Should fetch from API or show fallback</li>
            <li>• <strong>Test 2:</strong> Should display mock images with auto-play</li>
            <li>• <strong>Test 3:</strong> Should not auto-play, manual navigation only</li>
            <li>• <strong>Test 4:</strong> Should auto-play without visible controls</li>
            <li>• <strong>Test 5:</strong> Should auto-play every 2 seconds</li>
            <li>• <strong>Touch/Swipe:</strong> Try swiping on mobile devices</li>
            <li>• <strong>Keyboard:</strong> Use arrow keys to navigate</li>
            <li>• <strong>Hover:</strong> Hover to pause auto-play</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 