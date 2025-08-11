#!/usr/bin/env node

/**
 * Test script for responsive image pipeline
 * Tests backend image optimization and frontend responsive image handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Responsive Image Pipeline...\n');

// Test 1: Check if backend image optimizer has been updated
console.log('1️⃣ Testing Backend Image Optimizer...');
try {
  const imageOptimizerPath = path.join(__dirname, '../backend/utils/imageOptimizer.js');
  const imageOptimizerContent = fs.readFileSync(imageOptimizerPath, 'utf8');
  
  const requiredFeatures = [
    'sizeVariants',
    'generateSizeVariants',
    'generateAVIFFilename',
    'generateResponsiveUrls'
  ];
  
  let passedTests = 0;
  for (const feature of requiredFeatures) {
    if (imageOptimizerContent.includes(feature)) {
      console.log(`   ✅ ${feature} - Found`);
      passedTests++;
    } else {
      console.log(`   ❌ ${feature} - Missing`);
    }
  }
  
  if (passedTests === requiredFeatures.length) {
    console.log('   🎯 Backend Image Optimizer: PASSED\n');
  } else {
    console.log('   ⚠️ Backend Image Optimizer: PARTIALLY PASSED\n');
  }
} catch (error) {
  console.log('   ❌ Backend Image Optimizer: FAILED - File not found\n');
}

// Test 2: Check if frontend responsive image utilities exist
console.log('2️⃣ Testing Frontend Responsive Image Utilities...');
try {
  const responsiveImagesPath = path.join(__dirname, '../frontend/lib/responsive-images.ts');
  const responsiveImagesContent = fs.readFileSync(responsiveImagesPath, 'utf8');
  
  const requiredFeatures = [
    'ResponsiveImageUrls',
    'generateWebPSrcSet',
    'generateAVIFSrcSet',
    'getSizesAttribute'
  ];
  
  let passedTests = 0;
  for (const feature of requiredFeatures) {
    if (responsiveImagesContent.includes(feature)) {
      console.log(`   ✅ ${feature} - Found`);
      passedTests++;
    } else {
      console.log(`   ❌ ${feature} - Missing`);
    }
  }
  
  if (passedTests === requiredFeatures.length) {
    console.log('   🎯 Frontend Responsive Image Utilities: PASSED\n');
  } else {
    console.log('   ⚠️ Frontend Responsive Image Utilities: PARTIALLY PASSED\n');
  }
} catch (error) {
  console.log('   ❌ Frontend Responsive Image Utilities: FAILED - File not found\n');
}

// Test 3: Check if ResponsiveImage component exists
console.log('3️⃣ Testing ResponsiveImage Component...');
try {
  const responsiveImagePath = path.join(__dirname, '../frontend/components/responsive-image.tsx');
  const responsiveImageContent = fs.readFileSync(responsiveImagePath, 'utf8');
  
  const requiredFeatures = [
    'ResponsiveImage',
    'picture',
    'source',
    'AVIF',
    'WebP'
  ];
  
  let passedTests = 0;
  for (const feature of requiredFeatures) {
    if (responsiveImageContent.includes(feature)) {
      console.log(`   ✅ ${feature} - Found`);
      passedTests++;
    } else {
      console.log(`   ❌ ${feature} - Missing`);
    }
  }
  
  if (passedTests === requiredFeatures.length) {
    console.log('   🎯 ResponsiveImage Component: PASSED\n');
  } else {
    console.log('   ⚠️ ResponsiveImage Component: PARTIALLY PASSED\n');
  }
} catch (error) {
  console.log('   ❌ ResponsiveImage Component: FAILED - File not found\n');
}

// Test 4: Check if components have been updated to use ResponsiveImage
console.log('4️⃣ Testing Component Updates...');
try {
  const dynamicHeroCardPath = path.join(__dirname, '../frontend/components/dynamic-hero-card.tsx');
  const productCardPath = path.join(__dirname, '../frontend/components/product-card.tsx');
  const productPagePath = path.join(__dirname, '../frontend/app/product/[productId]/ProductPageClient.tsx');
  
  let passedTests = 0;
  
  // Check dynamic-hero-card
  if (fs.existsSync(dynamicHeroCardPath)) {
    const content = fs.readFileSync(dynamicHeroCardPath, 'utf8');
    if (content.includes('ResponsiveImage') && content.includes('componentType="hero"')) {
      console.log('   ✅ dynamic-hero-card - Updated');
      passedTests++;
    } else {
      console.log('   ❌ dynamic-hero-card - Not updated');
    }
  }
  
  // Check product-card
  if (fs.existsSync(productCardPath)) {
    const content = fs.readFileSync(productCardPath, 'utf8');
    if (content.includes('ResponsiveImage') && content.includes('componentType="product-card"')) {
      console.log('   ✅ product-card - Updated');
      passedTests++;
    } else {
      console.log('   ❌ product-card - Not updated');
    }
  }
  
  // Check ProductPageClient
  if (fs.existsSync(productPagePath)) {
    const content = fs.readFileSync(productPagePath, 'utf8');
    if (content.includes('ResponsiveImage') && content.includes('componentType="product-detail"')) {
      console.log('   ✅ ProductPageClient - Updated');
      passedTests++;
    } else {
      console.log('   ❌ ProductPageClient - Not updated');
    }
  }
  
  if (passedTests === 3) {
    console.log('   🎯 Component Updates: PASSED\n');
  } else {
    console.log('   ⚠️ Component Updates: PARTIALLY PASSED\n');
  }
} catch (error) {
  console.log('   ❌ Component Updates: FAILED - Error checking files\n');
}

// Test 5: Check if Nginx configuration has been updated
console.log('5️⃣ Testing Nginx Configuration...');
try {
  const nginxConfigPath = path.join(__dirname, '../nginx-config/shithaa.conf');
  const nginxConfigContent = fs.readFileSync(nginxConfigPath, 'utf8');
  
  const requiredFeatures = [
    'format negotiation',
    'image/avif',
    'image/webp',
    'Vary "Accept"'
  ];
  
  let passedTests = 0;
  for (const feature of requiredFeatures) {
    if (nginxConfigContent.includes(feature)) {
      console.log(`   ✅ ${feature} - Found`);
      passedTests++;
    } else {
      console.log(`   ❌ ${feature} - Missing`);
    }
  }
  
  if (passedTests === requiredFeatures.length) {
    console.log('   🎯 Nginx Configuration: PASSED\n');
  } else {
    console.log('   ⚠️ Nginx Configuration: PARTIALLY PASSED\n');
  }
} catch (error) {
  console.log('   ❌ Nginx Configuration: FAILED - File not found\n');
}

console.log('🏁 Responsive Image Pipeline Test Complete!');
console.log('\n📋 Next Steps:');
console.log('   1. Restart the backend server to apply image optimizer changes');
console.log('   2. Rebuild the frontend to include new components');
console.log('   3. Reload Nginx configuration');
console.log('   4. Upload a test image to verify size variants are generated');
console.log('   5. Test on slow 3G to verify performance improvement'); 