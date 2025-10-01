// Diagnostic script to check why hero images aren't loading
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import productModel from './models/productModel.js';
import { config } from './config.js';

dotenv.config();

async function diagnoseHeroImages() {
  try {
    console.log('🔍 Starting Hero Images Diagnostic...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
    console.log('✅ Connected to MongoDB\n');

    // Check configuration
    console.log('📋 Configuration:');
    console.log('  VPS_BASE_URL:', config.vpsBaseUrl);
    console.log('  NODE_ENV:', config.nodeEnv);
    console.log('');

    // Define category slugs to check
    const categories = [
      'maternity-feeding-wear',
      'zipless-feeding-lounge-wear',
      'non-feeding-lounge-wear',
      'zipless-feeding-dupatta-lounge-wear'
    ];

    // Check each category
    for (const categorySlug of categories) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Category: ${categorySlug}`);
      console.log('='.repeat(60));

      // Query products
      const products = await productModel.find({
        $or: [
          { category: categorySlug },
          { categorySlug: categorySlug }
        ]
      }).select('_id customId name images category categorySlug').lean();

      console.log(`  Products found: ${products.length}`);

      if (products.length === 0) {
        console.log('  ❌ No products found for this category');
        
        // Try to find similar products
        const similarByCategory = await productModel.find({ 
          category: { $regex: categorySlug.split('-')[0], $options: 'i' } 
        }).select('category categorySlug name').limit(3).lean();
        
        const similarBySlug = await productModel.find({ 
          categorySlug: { $regex: categorySlug.split('-')[0], $options: 'i' } 
        }).select('category categorySlug name').limit(3).lean();
        
        if (similarByCategory.length > 0 || similarBySlug.length > 0) {
          console.log('\n  💡 Found similar products with different slugs:');
          [...similarByCategory, ...similarBySlug].forEach(p => {
            console.log(`     - ${p.name}`);
            console.log(`       category: "${p.category}"`);
            console.log(`       categorySlug: "${p.categorySlug}"`);
          });
        }
        continue;
      }

      // Check first 3 products
      console.log(`\n  📸 Checking first ${Math.min(3, products.length)} products:\n`);
      
      for (let i = 0; i < Math.min(3, products.length); i++) {
        const product = products[i];
        console.log(`  Product ${i + 1}: ${product.name}`);
        console.log(`    ID: ${product._id}`);
        console.log(`    Category: "${product.category}"`);
        console.log(`    CategorySlug: "${product.categorySlug}"`);
        console.log(`    Images array length: ${Array.isArray(product.images) ? product.images.length : 0}`);
        
        if (Array.isArray(product.images) && product.images.length > 0) {
          const imagePath = product.images[0];
          console.log(`    First image path: "${imagePath}"`);
          
          // Build full URL as backend does
          const baseUrl = config.vpsBaseUrl;
          const fullImageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;
          console.log(`    Full URL: "${fullImageUrl}"`);
          
          // Check if path looks correct
          if (imagePath.startsWith('/images/') || imagePath.startsWith('/uploads/')) {
            console.log(`    ✅ Image path format looks correct`);
          } else if (imagePath.startsWith('http')) {
            console.log(`    ✅ Image is full URL`);
          } else {
            console.log(`    ⚠️  Image path format may be incorrect`);
          }
        } else {
          console.log(`    ❌ No images array or empty`);
        }
        console.log('');
      }
    }

    // Check total products in database
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Overall Database Statistics');
    console.log('='.repeat(60));
    
    const totalProducts = await productModel.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);
    
    const productsWithImages = await productModel.countDocuments({
      images: { $exists: true, $ne: [], $not: { $size: 0 } }
    });
    console.log(`Products with images: ${productsWithImages}`);
    
    const productsWithoutImages = totalProducts - productsWithImages;
    console.log(`Products without images: ${productsWithoutImages}`);
    
    // Check unique category values
    const uniqueCategories = await productModel.distinct('category');
    const uniqueCategorySlugs = await productModel.distinct('categorySlug');
    
    console.log(`\nUnique category values (${uniqueCategories.length}):`);
    uniqueCategories.forEach(cat => console.log(`  - "${cat}"`));
    
    console.log(`\nUnique categorySlug values (${uniqueCategorySlugs.length}):`);
    uniqueCategorySlugs.forEach(slug => console.log(`  - "${slug}"`));

    console.log('\n✅ Diagnostic complete!\n');
    
  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

diagnoseHeroImages();

