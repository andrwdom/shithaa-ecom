import mongoose from 'mongoose';
import 'dotenv/config';
import productModel from './models/productModel.js';
import connectDB from './config/mongodb.js';

async function checkAndFixCategory() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check current product distribution
    const products = await productModel.find({}).lean();
    console.log('\n📊 Current Product Distribution:');
    console.log('Total products:', products.length);
    
    const categoryCounts = {};
    products.forEach(p => {
      const cat = p.categorySlug || 'NO_CATEGORY_SLUG';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`- ${cat}: ${count} products`);
    });

    // Check specific category
    const dupattaProducts = await productModel.find({ 
      categorySlug: 'zipless-feeding-dupatta-lounge-wear' 
    }).lean();
    
    console.log(`\n🎯 Zipless Feeding Dupatta Lounge Wear Category:`);
    console.log(`Products found: ${dupattaProducts.length}`);
    
    if (dupattaProducts.length === 0) {
      console.log('\n❌ No products found in this category!');
      console.log('This is why the page shows an error.');
      
      // Check if we have products in similar categories that we can duplicate
      const similarProducts = await productModel.find({
        categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear', 'maternity-feeding-wear', 'zipless-feeding-dupatta-lounge-wear'] }
      }).lean();
      
      if (similarProducts.length > 0) {
        console.log('\n💡 Found similar products that could be added to this category:');
        similarProducts.forEach(p => {
          console.log(`- ${p.name} (${p.categorySlug})`);
        });
        
        console.log('\n🔧 To fix this, you can:');
        console.log('1. Add new products through the admin panel');
        console.log('2. Duplicate existing products and change their category');
        console.log('3. Move some products from similar categories');
        
        // Option: Create a sample product for this category
        console.log('\n📝 Would you like me to create a sample product for this category?');
        console.log('This would help test the page functionality.');
        
      }
    } else {
      console.log('✅ Category has products - page should work fine');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkAndFixCategory(); 