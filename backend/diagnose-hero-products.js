import mongoose from 'mongoose';
import dotenv from 'dotenv';
import productModel from './models/productModel.js';

dotenv.config();

async function diagnoseHeroProducts() {
  try {
    console.log('🔍 Diagnosing Hero Images Product Fetch Issue\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
    console.log('✅ Connected to MongoDB\n');

    // Test categories
    const testCategories = [
      'maternity-feeding-wear',
      'zipless-feeding-lounge-wear',
      'non-feeding-lounge-wear',
      'zipless-feeding-dupatta-lounge-wear'
    ];

    console.log('📊 Checking products for each category:\n');

    for (const categoryId of testCategories) {
      console.log(`\n🔹 Category: ${categoryId}`);
      console.log('─'.repeat(60));

      // Test 1: Query with $or (exactly as hero controller does)
      const products = await productModel.find({
        $or: [
          { category: categoryId },
          { categorySlug: categoryId }
        ]
      }).select('_id customId name images category categorySlug').lean();

      console.log(`   Products found with $or query: ${products.length}`);

      if (products.length > 0) {
        console.log(`   ✅ Products exist for this category`);
        console.log(`\n   Sample product:`);
        const sample = products[0];
        console.log(`   - ID: ${sample._id}`);
        console.log(`   - Name: ${sample.name}`);
        console.log(`   - Category: ${sample.category}`);
        console.log(`   - CategorySlug: ${sample.categorySlug}`);
        console.log(`   - Images: ${sample.images ? sample.images.length : 0} image(s)`);
        if (sample.images && sample.images.length > 0) {
          console.log(`   - First Image: ${sample.images[0]}`);
        }
      } else {
        console.log(`   ❌ No products found!`);
        
        // Additional diagnostic queries
        console.log(`\n   Checking alternative queries:`);
        
        // Try with just categorySlug
        const byCategorySlug = await productModel.countDocuments({ categorySlug: categoryId });
        console.log(`   - By categorySlug only: ${byCategorySlug} products`);
        
        // Try with just category
        const byCategory = await productModel.countDocuments({ category: categoryId });
        console.log(`   - By category only: ${byCategory} products`);
        
        // Try case-insensitive
        const byCategorySlugInsensitive = await productModel.countDocuments({ 
          categorySlug: { $regex: new RegExp(`^${categoryId}$`, 'i') }
        });
        console.log(`   - By categorySlug (case-insensitive): ${byCategorySlugInsensitive} products`);
      }
    }

    // Check all products
    console.log(`\n\n📈 Overall Database Statistics:`);
    console.log('─'.repeat(60));
    const totalProducts = await productModel.countDocuments({});
    console.log(`Total products in database: ${totalProducts}`);

    if (totalProducts > 0) {
      // Get unique category slugs
      const uniqueCategorySlugs = await productModel.distinct('categorySlug');
      console.log(`\nUnique categorySlug values:`);
      uniqueCategorySlugs.forEach(slug => {
        console.log(`  - ${slug || '(empty)'}`);
      });

      // Get unique categories
      const uniqueCategories = await productModel.distinct('category');
      console.log(`\nUnique category values:`);
      uniqueCategories.forEach(cat => {
        console.log(`  - ${cat || '(empty)'}`);
      });

      // Count products per categorySlug
      console.log(`\nProducts per categorySlug:`);
      const categorySlugCounts = await productModel.aggregate([
        { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      categorySlugCounts.forEach(item => {
        console.log(`  - ${item._id || '(empty)'}: ${item.count} products`);
      });

      // Check for products with images
      const productsWithImages = await productModel.countDocuments({ 
        images: { $exists: true, $ne: [], $not: { $size: 0 } }
      });
      console.log(`\nProducts with images: ${productsWithImages} out of ${totalProducts}`);

      // Sample a few products
      console.log(`\n\n📝 Sample Products:`);
      console.log('─'.repeat(60));
      const sampleProducts = await productModel.find({}).limit(3).select('name category categorySlug images').lean();
      sampleProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Category: ${product.category || '(not set)'}`);
        console.log(`   CategorySlug: ${product.categorySlug || '(not set)'}`);
        console.log(`   Images: ${product.images ? product.images.length : 0}`);
        if (product.images && product.images.length > 0) {
          console.log(`   First image: ${product.images[0]}`);
        }
      });
    } else {
      console.log(`\n❌ Database is EMPTY! No products found at all.`);
      console.log(`\nPossible reasons:`);
      console.log(`  1. Products haven't been imported yet`);
      console.log(`  2. Connected to wrong database`);
      console.log(`  3. Products were deleted`);
    }

    console.log(`\n\n✅ Diagnosis complete!`);
    console.log(`\nRecommendations:`);
    console.log(`  1. If no products exist, import them from backup`);
    console.log(`  2. If categorySlug values don't match, update them`);
    console.log(`  3. If products have no images, add product images`);
    console.log(`  4. Verify VPS_BASE_URL in .env is correct`);

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

diagnoseHeroProducts();

