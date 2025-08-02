#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if sharp is installed
try {
  require('sharp');
} catch (error) {
  console.log('Installing sharp for image optimization...');
  execSync('npm install sharp', { stdio: 'inherit' });
}

const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '../public');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// Create optimized images directory
const OPTIMIZED_DIR = path.join(PUBLIC_DIR, 'optimized');
if (!fs.existsSync(OPTIMIZED_DIR)) {
  fs.mkdirSync(OPTIMIZED_DIR, { recursive: true });
}

async function optimizeImage(inputPath, outputPath, options = {}) {
  const {
    quality = 85,
    width,
    height,
    format = 'webp'
  } = options;

  try {
    let pipeline = sharp(inputPath);

    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality });
    }

    await pipeline.toFile(outputPath);
    console.log(`✅ Optimized: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
  }
}

async function processImages() {
  console.log('🔄 Starting image optimization...\n');

  const files = fs.readdirSync(PUBLIC_DIR);
  const imageFiles = files.filter(file => 
    IMAGE_EXTENSIONS.some(ext => file.endsWith(ext))
  );

  console.log(`Found ${imageFiles.length} images to optimize\n`);

  for (const file of imageFiles) {
    const inputPath = path.join(PUBLIC_DIR, file);
    const fileStats = fs.statSync(inputPath);
    
    // Skip if file is larger than 5MB (likely already optimized)
    if (fileStats.size > 5 * 1024 * 1024) {
      console.log(`⏭️  Skipping large file: ${file}`);
      continue;
    }

    const baseName = path.parse(file).name;
    const ext = path.parse(file).ext.toLowerCase();

    // Create WebP version
    const webpPath = path.join(OPTIMIZED_DIR, `${baseName}.webp`);
    await optimizeImage(inputPath, webpPath, { quality: 85 });

    // Create optimized JPEG version
    const jpegPath = path.join(OPTIMIZED_DIR, `${baseName}-optimized.jpg`);
    await optimizeImage(inputPath, jpegPath, { quality: 85, format: 'jpeg' });

    // Create thumbnail version (300x300)
    const thumbnailPath = path.join(OPTIMIZED_DIR, `${baseName}-thumb.webp`);
    await optimizeImage(inputPath, thumbnailPath, { 
      quality: 80, 
      width: 300, 
      height: 300 
    });
  }

  console.log('\n🎉 Image optimization completed!');
  console.log(`📁 Optimized images saved to: ${OPTIMIZED_DIR}`);
  console.log('\n📋 Next steps:');
  console.log('1. Update your image paths to use the optimized versions');
  console.log('2. Consider implementing a CDN for better performance');
  console.log('3. Test the website performance with tools like Lighthouse');
}

// Run the optimization
processImages().catch(console.error); 