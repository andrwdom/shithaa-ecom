#!/usr/bin/env node

/**
 * Fix Category Data Inconsistencies
 * 
 * This script fixes inconsistencies between category and categorySlug fields
 * in the product collection, specifically for feeding lounge wear products.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

// Category mapping for consistency
const CATEGORY_MAPPING = {
  'Zipless Feeding Lounge Wear': 'zipless-feeding-lounge-wear',
  'Non-Feeding Lounge Wear': 'non-feeding-lounge-wear', 
  'Zipless Feeding Dupatta Lounge Wear': 'zipless-feeding-dupatta-lounge-wear',
  'Maternity Feeding Wear': 'maternity-feeding-wear'
};

// Product schema (simplified)
const productSchema = new mongoose.Schema({
  customId: String,
  name: String,
  category: String,
  categorySlug: String,
  // ... other fields
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function fixCategoryData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Analyzing category data inconsistencies...');
    
    // Find products with inconsistent category/categorySlug
    const inconsistentProducts = await Product.find({
      $or: [
        { category: { $exists: true }, categorySlug: { $exists: false } },
        { category: { $exists: false }, categorySlug: { $exists: true } },
        { category: { $ne: null }, categorySlug: { $ne: null }, 
          $expr: { $ne: ['$category', { $toLower: '$categorySlug' }] } }
      ]
    });

    console.log(`📊 Found ${inconsistentProducts.length} products with category inconsistencies`);

    if (inconsistentProducts.length === 0) {
      console.log('✅ No category inconsistencies found!');
      return;
    }

    console.log('\n🔧 Fixing category data...');
    let fixedCount = 0;

    for (const product of inconsistentProducts) {
      let needsUpdate = false;
      const updates = {};

      // Fix categorySlug if missing or inconsistent
      if (product.category && !product.categorySlug) {
        const slug = CATEGORY_MAPPING[product.category] || 
                     product.category.toLowerCase().replace(/\s+/g, '-');
        updates.categorySlug = slug;
        needsUpdate = true;
        console.log(`  📝 ${product.name}: Added categorySlug "${slug}"`);
      }

      // Fix category if missing but categorySlug exists
      if (!product.category && product.categorySlug) {
        const categoryName = Object.keys(CATEGORY_MAPPING).find(
          key => CATEGORY_MAPPING[key] === product.categorySlug
        );
        if (categoryName) {
          updates.category = categoryName;
          needsUpdate = true;
          console.log(`  📝 ${product.name}: Added category "${categoryName}"`);
        }
      }

      // Fix inconsistent category/categorySlug pairs
      if (product.category && product.categorySlug) {
        const expectedSlug = CATEGORY_MAPPING[product.category] || 
                            product.category.toLowerCase().replace(/\s+/g, '-');
        if (product.categorySlug !== expectedSlug) {
          updates.categorySlug = expectedSlug;
          needsUpdate = true;
          console.log(`  📝 ${product.name}: Fixed categorySlug "${product.categorySlug}" → "${expectedSlug}"`);
        }
      }

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} products`);

    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const remainingInconsistent = await Product.find({
      $or: [
        { category: { $exists: true }, categorySlug: { $exists: false } },
        { category: { $exists: false }, categorySlug: { $exists: true } },
        { category: { $ne: null }, categorySlug: { $ne: null }, 
          $expr: { $ne: ['$category', { $toLower: '$categorySlug' }] } }
      ]
    });

    if (remainingInconsistent.length === 0) {
      console.log('✅ All category inconsistencies have been resolved!');
    } else {
      console.log(`⚠️  ${remainingInconsistent.length} products still have inconsistencies`);
    }

    // Show feeding lounge wear products specifically
    console.log('\n👗 Feeding Lounge Wear Products:');
    const feedingProducts = await Product.find({
      $or: [
        { categorySlug: 'zipless-feeding-lounge-wear' },
        { category: 'Zipless Feeding Lounge Wear' }
      ]
    }).select('name category categorySlug customId');

    console.log(`Found ${feedingProducts.length} feeding lounge wear products:`);
    feedingProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.customId}): category="${product.category}", categorySlug="${product.categorySlug}"`);
    });

  } catch (error) {
    console.error('❌ Error fixing category data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCategoryData();
}

export { fixCategoryData };
