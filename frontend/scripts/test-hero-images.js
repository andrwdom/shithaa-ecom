#!/usr/bin/env node

/**
 * Test script for hero images endpoint
 * Run with: node scripts/test-hero-images.js
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function testHeroImages() {
  console.log('🧪 Testing Hero Images Endpoint...\n')
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...')
    const healthResponse = await fetch(`${API_BASE}/api/hero-images/health`)
    const healthData = await healthResponse.json()
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed:', healthData.message)
    } else {
      console.log('❌ Health check failed:', healthData.message)
    }
    
    // Test hero images endpoint with a valid category
    console.log('\n2. Testing hero images endpoint...')
    const testCategories = [
      'maternity-feeding-wear',
      'zipless-feeding-lounge-wear',
      'non-feeding-lounge-wear',
      'zipless-feeding-dupatta-lounge-wear'
    ]
    
    for (const category of testCategories) {
      console.log(`\n   Testing category: ${category}`)
      
      const response = await fetch(`${API_BASE}/api/hero-images?categoryId=${category}&limit=3`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log(`   ✅ Success: ${data.images.length} images loaded`)
        if (data.images.length > 0) {
          const firstImage = data.images[0]
          console.log(`   📸 First image: ${firstImage.thumbUrl}`)
          console.log(`   📏 Dimensions: ${firstImage.width}x${firstImage.height}`)
        }
      } else {
        console.log(`   ❌ Failed: ${data.message || 'Unknown error'}`)
      }
    }
    
    // Test with invalid category
    console.log('\n3. Testing with invalid category...')
    const invalidResponse = await fetch(`${API_BASE}/api/hero-images?categoryId=invalid-category`)
    const invalidData = await invalidResponse.json()
    
    if (invalidResponse.ok && invalidData.success && invalidData.images.length === 0) {
      console.log('✅ Invalid category handled correctly (empty result)')
    } else {
      console.log('❌ Invalid category not handled correctly')
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testHeroImages() 