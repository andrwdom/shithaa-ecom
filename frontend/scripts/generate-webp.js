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

async function generateWebP(inputPath, outputPath, quality = 85) {
  try {
    await sharp(inputPath)
      .webp({ quality })
      .toFile(outputPath);
    console.log(`✅ Generated: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`❌ Error generating WebP for ${inputPath}:`, error.message);
  }
}

async function processImages() {
  console.log('🔄 Generating WebP versions of existing images...\n');

  const files = fs.readdirSync(PUBLIC_DIR);
  const imageFiles = files.filter(file => 
    IMAGE_EXTENSIONS.some(ext => file.endsWith(ext))
  );

  console.log(`Found ${imageFiles.length} images to convert to WebP\n`);

  for (const file of imageFiles) {
    const inputPath = path.join(PUBLIC_DIR, file);
    const baseName = path.parse(file).name;
    const outputPath = path.join(PUBLIC_DIR, `${baseName}.webp`);

    // Skip if WebP already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  WebP already exists: ${baseName}.webp`);
      continue;
    }

    await generateWebP(inputPath, outputPath);
  }

  console.log('\n🎉 WebP generation completed!');
  console.log('📁 WebP files saved to: public/');
  console.log('\n📋 Next steps:');
  console.log('1. Test the website to ensure WebP images load correctly');
  console.log('2. Update the layout.tsx to include WebP preload links');
  console.log('3. Monitor performance improvements');
}

// Run the WebP generation
processImages().catch(console.error); 