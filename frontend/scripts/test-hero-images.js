#!/usr/bin/env node

/**
 * Test script for hero images endpoint
 * Run with: node scripts/test-hero-images.js
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function testHeroImages() {
  console.log('Testing Hero Images Endpoint...')
  console.log('API Base:', API_BASE)
  
  const testCategories = [
    'maternity-feeding-wear',
    'zipless-feeding-lounge-wear', 
    'non-feeding-lounge-wear',
    'zipless-feeding-dupatta-lounge-wear'
  ]
  
  for (const categorySlug of testCategories) {
    console.log(`\n--- Testing Category: ${categorySlug} ---`)
    
    try {
      // Test desktop endpoint
      const desktopUrl = `${API_BASE}/api/hero-images?categoryId=${categorySlug}&device=desktop`
      console.log('Desktop URL:', desktopUrl)
      
      const desktopResponse = await fetch(desktopUrl)
      console.log('Desktop Status:', desktopResponse.status)
      
      if (desktopResponse.ok) {
        const desktopData = await desktopResponse.json()
        console.log('Desktop Response:', {
          success: desktopData.success,
          imageCount: desktopData.images?.length || 0,
          images: desktopData.images?.map(img => ({
            productId: img.productId,
            productName: img.productName,
            thumbUrl: img.thumbUrl,
            hasLqip: !!img.lqip
          }))
        })
      } else {
        console.error('Desktop Error:', desktopResponse.statusText)
      }
      
      // Test mobile endpoint
      const mobileUrl = `${API_BASE}/api/hero-images?categoryId=${categorySlug}&device=mobile`
      console.log('Mobile URL:', mobileUrl)
      
      const mobileResponse = await fetch(mobileUrl)
      console.log('Mobile Status:', mobileResponse.status)
      
      if (mobileResponse.ok) {
        const mobileData = await mobileResponse.json()
        console.log('Mobile Response:', {
          success: mobileData.success,
          imageCount: mobileData.images?.length || 0,
          images: mobileData.images?.map(img => ({
            productId: img.productId,
            productName: img.productName,
            thumbUrl: img.thumbUrl,
            hasLqip: !!img.lqip
          }))
        })
      } else {
        console.error('Mobile Error:', mobileResponse.statusText)
      }
      
    } catch (error) {
      console.error(`Error testing ${categorySlug}:`, error.message)
    }
  }
}

// Run the test
testHeroImages().catch(console.error) 