#!/usr/bin/env node

/**
 * Image Optimization Script for Cloudflare CDN
 * Converts existing images to WebP format and optimizes them for Cloudflare
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '../public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const LOGOS_DIR = path.join(IMAGES_DIR, 'logos');
const CATEGORIES_DIR = path.join(IMAGES_DIR, 'categories');

// Image optimization settings
const QUALITY = 85;
const SIZES = {
  logo: { width: 200, height: 60 },
  category: { width: 400, height: 300 },
  hero: { width: 800, height: 600 }
};

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function convertToWebP(inputPath, outputPath, width, height) {
  try {
    const command = `cwebp "${inputPath}" -o "${outputPath}" -q ${QUALITY} -resize ${width} ${height}`;
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to convert ${inputPath}:`, error.message);
    return false;
  }
}

async function optimizeExistingImages() {
  console.log('🚀 Starting image optimization for Cloudflare CDN...\n');

  // Ensure directories exist
  await ensureDirectoryExists(IMAGES_DIR);
  await ensureDirectoryExists(LOGOS_DIR);
  await ensureDirectoryExists(CATEGORIES_DIR);

  // Convert logo
  const logoPath = path.join(PUBLIC_DIR, 'shithaa-logo.jpg');
  const logoWebPPath = path.join(LOGOS_DIR, 'shithaa-logo.webp');
  
  if (await fs.access(logoPath).then(() => true).catch(() => false)) {
    await convertToWebP(logoPath, logoWebPPath, SIZES.logo.width, SIZES.logo.height);
  } else {
    console.log('⚠️ Logo file not found, creating placeholder...');
    // Create a simple placeholder logo
    const placeholderContent = `# Placeholder for shithaa-logo.webp
# This file should be replaced with the actual logo converted to WebP format
# Run: cwebp shithaa-logo.jpg -o images/logos/shithaa-logo.webp -q 85 -resize 200 60`;
    await fs.writeFile(logoWebPPath, placeholderContent);
  }

  // Convert category images from placeholders
  const placeholdersDir = path.join(PUBLIC_DIR, 'placeholders');
  const categoryMappings = [
    { src: 'hero1.JPG', dest: 'maternity-feeding.webp', category: 'maternity-feeding-wear' },
    { src: 'hero2.JPG', dest: 'zipless-feeding.webp', category: 'zipless-feeding-lounge-wear' },
    { src: 'hero3.JPG', dest: 'non-feeding.webp', category: 'non-feeding-lounge-wear' },
    { src: 'hero4.JPG', dest: 'dupatta-lounge.webp', category: 'zipless-feeding-dupatta-lounge-wear' }
  ];

  for (const mapping of categoryMappings) {
    const srcPath = path.join(placeholdersDir, mapping.src);
    const destPath = path.join(CATEGORIES_DIR, mapping.dest);
    
    if (await fs.access(srcPath).then(() => true).catch(() => false)) {
      await convertToWebP(srcPath, destPath, SIZES.category.width, SIZES.category.height);
    } else {
      console.log(`⚠️ Placeholder ${mapping.src} not found, creating placeholder...`);
      const placeholderContent = `# Placeholder for ${mapping.dest}
# This file should be replaced with the actual category image converted to WebP format
# Category: ${mapping.category}`;
      await fs.writeFile(destPath, placeholderContent);
    }
  }

  // Convert other static images
  const staticImages = [
    { src: 'about-us.jpg', dest: 'about-us.webp', width: 400, height: 500 },
    { src: 'maternity-sizechart.jpeg', dest: 'maternity-sizechart.webp', width: 600, height: 800 },
    { src: 'zipless-feeding-sizechart.jpeg', dest: 'zipless-feeding-sizechart.webp', width: 600, height: 800 }
  ];

  for (const image of staticImages) {
    const srcPath = path.join(PUBLIC_DIR, image.src);
    const destPath = path.join(IMAGES_DIR, image.dest);
    
    if (await fs.access(srcPath).then(() => true).catch(() => false)) {
      await convertToWebP(srcPath, destPath, image.width, image.height);
    }
  }

  console.log('\n🎉 Image optimization completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Replace placeholder files with actual optimized images');
  console.log('2. Update component imports to use new image paths');
  console.log('3. Test image loading through Cloudflare CDN');
  console.log('4. Verify WebP format is being served');
}

// Run the optimization
optimizeExistingImages().catch(console.error);
