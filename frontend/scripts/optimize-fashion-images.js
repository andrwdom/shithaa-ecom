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

// Fashion-specific optimization settings
const FASHION_OPTIMIZATION = {
  // Product images (3:4 aspect ratio)
  product: {
    aspectRatio: 3/4,
    sizes: [300, 400, 600, 800, 1200],
    quality: 85,
    format: 'webp'
  },
  // Hero/Banner images (16:9 aspect ratio)
  hero: {
    aspectRatio: 16/9,
    sizes: [600, 800, 1200, 1920],
    quality: 90,
    format: 'webp'
  },
  // Category images (2:3 aspect ratio)
  category: {
    aspectRatio: 2/3,
    sizes: [300, 400, 600, 800],
    quality: 85,
    format: 'webp'
  },
  // Thumbnail images (1:1 aspect ratio)
  thumbnail: {
    aspectRatio: 1/1,
    sizes: [150, 200, 300],
    quality: 80,
    format: 'webp'
  }
};

// Create optimized images directory structure
const OPTIMIZED_DIR = path.join(PUBLIC_DIR, 'optimized');
const createDirectories = () => {
  const dirs = [
    OPTIMIZED_DIR,
    path.join(OPTIMIZED_DIR, 'products'),
    path.join(OPTIMIZED_DIR, 'hero'),
    path.join(OPTIMIZED_DIR, 'categories'),
    path.join(OPTIMIZED_DIR, 'thumbnails'),
    path.join(OPTIMIZED_DIR, 'webp'),
    path.join(OPTIMIZED_DIR, 'jpeg')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

async function optimizeFashionImage(inputPath, outputPath, options = {}) {
  const {
    width,
    height,
    quality = 85,
    format = 'webp',
    aspectRatio,
    fit = 'cover'
  } = options;

  try {
    let pipeline = sharp(inputPath);

    // Resize with aspect ratio preservation
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
        withoutEnlargement: true,
        position: 'center'
      });
    }

    // Apply fashion-specific optimizations
    if (format === 'webp') {
      pipeline = pipeline.webp({ 
        quality,
        effort: 6, // Higher compression effort
        nearLossless: true // Better quality for fashion images
      });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ 
        quality,
        progressive: true, // Progressive JPEG for better perceived loading
        mozjpeg: true // Better compression
      });
    } else if (format === 'png') {
      pipeline = pipeline.png({ 
        quality,
        compressionLevel: 9,
        progressive: true
      });
    }

    await pipeline.toFile(outputPath);
    console.log(`✅ Optimized: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`❌ Error optimizing ${inputPath}:`, error.message);
  }
}

async function generateResponsiveImages(inputPath, baseName, type) {
  const config = FASHION_OPTIMIZATION[type];
  if (!config) return;

  const { sizes, quality, format, aspectRatio } = config;
  
  for (const size of sizes) {
    const width = size;
    const height = Math.round(size / aspectRatio);
    
    // WebP version
    const webpPath = path.join(OPTIMIZED_DIR, type, `${baseName}-${size}.webp`);
    await optimizeFashionImage(inputPath, webpPath, {
      width,
      height,
      quality,
      format: 'webp',
      aspectRatio
    });

    // JPEG fallback
    const jpegPath = path.join(OPTIMIZED_DIR, type, `${baseName}-${size}.jpg`);
    await optimizeFashionImage(inputPath, jpegPath, {
      width,
      height,
      quality: quality - 5, // Slightly lower quality for JPEG
      format: 'jpeg',
      aspectRatio
    });
  }
}

async function processFashionImages() {
  console.log('🔄 Starting fashion image optimization...\n');
  createDirectories();

  const files = fs.readdirSync(PUBLIC_DIR);
  const imageFiles = files.filter(file => 
    IMAGE_EXTENSIONS.some(ext => file.endsWith(ext))
  );

  console.log(`Found ${imageFiles.length} images to optimize\n`);

  for (const file of imageFiles) {
    const inputPath = path.join(PUBLIC_DIR, file);
    const fileStats = fs.statSync(inputPath);
    const baseName = path.parse(file).name;
    
    // Skip if file is larger than 10MB (likely already optimized)
    if (fileStats.size > 10 * 1024 * 1024) {
      console.log(`⏭️  Skipping large file: ${file}`);
      continue;
    }

    console.log(`\n📸 Processing: ${file}`);

    // Determine image type based on filename or size
    let imageType = 'product'; // default
    if (file.toLowerCase().includes('hero') || file.toLowerCase().includes('banner')) {
      imageType = 'hero';
    } else if (file.toLowerCase().includes('category') || file.toLowerCase().includes('cat')) {
      imageType = 'category';
    } else if (file.toLowerCase().includes('thumb') || fileStats.size < 100 * 1024) {
      imageType = 'thumbnail';
    }

    // Generate responsive images for each type
    await generateResponsiveImages(inputPath, baseName, imageType);

    // Create original format optimized version
    const ext = path.parse(file).ext.toLowerCase();
    const optimizedPath = path.join(OPTIMIZED_DIR, 'jpeg', `${baseName}-optimized${ext}`);
    await optimizeFashionImage(inputPath, optimizedPath, {
      quality: 85,
      format: ext === '.png' ? 'png' : 'jpeg'
    });
  }

  console.log('\n🎉 Fashion image optimization completed!');
  console.log(`📁 Optimized images saved to: ${OPTIMIZED_DIR}`);
  console.log('\n📋 Generated formats:');
  console.log('• WebP (primary) - Best compression, modern browsers');
  console.log('• JPEG (fallback) - Universal compatibility');
  console.log('• Responsive sizes - Mobile, tablet, desktop');
  console.log('\n📋 Next steps:');
  console.log('1. Update image paths in components to use optimized versions');
  console.log('2. Implement srcset for responsive images');
  console.log('3. Test performance improvements');
  console.log('4. Monitor Core Web Vitals');
}

// Run the optimization
processFashionImages().catch(console.error); 