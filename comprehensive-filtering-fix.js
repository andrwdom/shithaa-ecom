#!/usr/bin/env node

/**
 * Comprehensive Filtering Fix
 * 
 * This script will:
 * 1. Fix all database inconsistencies
 * 2. Ensure proper category/categorySlug mapping
 * 3. Fix display order issues
 * 4. Remove duplicates
 * 5. Test the complete solution
 */

import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Product schema
const productSchema = new mongoose.Schema({
  customId: String,
  name: String,
  category: String,
  categorySlug: String,
  price: Number,
  sizes: [{
    size: String,
    stock: Number
  }],
  displayOrder: Number,
  createdAt: Date
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

class ComprehensiveFilteringFix {
  constructor() {
    this.fixesApplied = [];
    this.productsFixed = 0;
    this.duplicatesRemoved = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async connectDatabase() {
    try {
      this.log('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI);
      this.log('Connected to MongoDB successfully');
      return true;
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async fixCategoryInconsistencies() {
    this.log('Fixing category inconsistencies...');
    
    // Get all products that should be in feeding lounge wear category
    const allProducts = await Product.find({
      $or: [
        { category: { $regex: /feeding.*lounge.*wear/i } },
        { categorySlug: { $regex: /feeding.*lounge.*wear/i } },
        { category: 'Zipless Feeding Lounge Wear' },
        { categorySlug: 'zipless-feeding-lounge-wear' }
      ]
    });

    this.log(`Found ${allProducts.length} products to process`);

    const categoryMapping = {
      'Zipless Feeding Lounge Wear': 'zipless-feeding-lounge-wear',
      'Non-Feeding Lounge Wear': 'non-feeding-lounge-wear',
      'Zipless Feeding Dupatta Lounge Wear': 'zipless-feeding-dupatta-lounge-wear',
      'Maternity Feeding Wear': 'maternity-feeding-wear'
    };

    let fixedCount = 0;

    for (const product of allProducts) {
      let needsUpdate = false;
      const updates = {};

      // Fix categorySlug if missing or incorrect
      if (product.category && (!product.categorySlug || product.categorySlug !== categoryMapping[product.category])) {
        updates.categorySlug = categoryMapping[product.category] || 
                              product.category.toLowerCase().replace(/\s+/g, '-');
        needsUpdate = true;
        this.log(`  📝 ${product.name}: Fixed categorySlug to "${updates.categorySlug}"`);
      }

      // Fix category if missing but categorySlug exists
      if (!product.category && product.categorySlug) {
        const categoryName = Object.keys(categoryMapping).find(
          key => categoryMapping[key] === product.categorySlug
        );
        if (categoryName) {
          updates.category = categoryName;
          needsUpdate = true;
          this.log(`  📝 ${product.name}: Added category "${categoryName}"`);
        }
      }

      if (needsUpdate) {
        await Product.updateOne({ _id: product._id }, { $set: updates });
        fixedCount++;
      }
    }

    this.fixesApplied.push(`Fixed ${fixedCount} category inconsistencies`);
    this.productsFixed += fixedCount;
    this.log(`Fixed ${fixedCount} category inconsistencies`, 'success');
  }

  async fixDisplayOrderIssues() {
    this.log('Fixing display order issues...');
    
    // Get all feeding lounge wear products
    const products = await Product.find({
      categorySlug: 'zipless-feeding-lounge-wear'
    }).sort({ createdAt: 1 });

    this.log(`Processing ${products.length} products for display order`);

    // Assign sequential display orders
    for (let i = 0; i < products.length; i++) {
      const newDisplayOrder = i + 1;
      if (products[i].displayOrder !== newDisplayOrder) {
        await Product.updateOne(
          { _id: products[i]._id },
          { $set: { displayOrder: newDisplayOrder } }
        );
        this.log(`  📝 ${products[i].name}: Set displayOrder to ${newDisplayOrder}`);
      }
    }

    this.fixesApplied.push(`Fixed display order for ${products.length} products`);
    this.log(`Fixed display order for ${products.length} products`, 'success');
  }

  async removeDuplicateProducts() {
    this.log('Removing duplicate products...');
    
    // Find products with duplicate names
    const nameGroups = await Product.aggregate([
      {
        $match: {
          $or: [
            { category: { $regex: /feeding.*lounge.*wear/i } },
            { categorySlug: { $regex: /feeding.*lounge.*wear/i } }
          ]
        }
      },
      {
        $group: {
          _id: '$name',
          products: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    this.log(`Found ${nameGroups.length} groups with duplicate names`);

    let duplicatesRemoved = 0;

    for (const group of nameGroups) {
      // Keep the first product (oldest), remove the rest
      const products = group.products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const toKeep = products[0];
      const toRemove = products.slice(1);

      this.log(`  🔍 Duplicate group: "${group._id}" (${products.length} products)`);
      this.log(`    ✅ Keeping: ${toKeep.name} (${toKeep._id})`);
      
      for (const duplicate of toRemove) {
        await Product.deleteOne({ _id: duplicate._id });
        this.log(`    🗑️  Removed: ${duplicate.name} (${duplicate._id})`);
        duplicatesRemoved++;
      }
    }

    this.duplicatesRemoved = duplicatesRemoved;
    this.fixesApplied.push(`Removed ${duplicatesRemoved} duplicate products`);
    this.log(`Removed ${duplicatesRemoved} duplicate products`, 'success');
  }

  async testAPIEndpoints() {
    this.log('Testing API endpoints after fixes...');
    
    const testCases = [
      {
        name: 'All feeding lounge wear products',
        params: { categorySlug: 'zipless-feeding-lounge-wear', page: 1, limit: 12 }
      },
      {
        name: 'Page 2 of feeding lounge wear',
        params: { categorySlug: 'zipless-feeding-lounge-wear', page: 2, limit: 12 }
      },
      {
        name: 'Page 3 of feeding lounge wear',
        params: { categorySlug: 'zipless-feeding-lounge-wear', page: 3, limit: 12 }
      }
    ];

    const results = [];
    const allProductIds = new Set();

    for (const testCase of testCases) {
      try {
        this.log(`Testing: ${testCase.name}`);
        
        const response = await axios.get(`${BACKEND_URL}/api/products`, {
          params: testCase.params,
          headers: { token: ADMIN_TOKEN }
        });

        const data = response.data;
        const productIds = (data.products || []).map(p => p._id);
        
        // Check for duplicates
        const duplicates = productIds.filter(id => allProductIds.has(id));
        if (duplicates.length > 0) {
          this.log(`  ❌ Found ${duplicates.length} duplicates in ${testCase.name}`, 'warning');
        }

        // Add to tracking set
        productIds.forEach(id => allProductIds.add(id));

        results.push({
          name: testCase.name,
          success: true,
          productCount: data.products?.length || 0,
          totalPages: data.pages || 0,
          totalProducts: data.total || 0,
          duplicates: duplicates.length
        });

        this.log(`  ✅ ${data.products?.length || 0} products, ${data.pages || 0} pages, ${data.total || 0} total`);

      } catch (error) {
        this.log(`  ❌ Failed: ${error.message}`, 'error');
        results.push({
          name: testCase.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async generateFinalReport() {
    this.log('Generating final report...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPREHENSIVE FILTERING FIX COMPLETED');
    console.log('='.repeat(80));

    console.log('\n📊 FIXES APPLIED:');
    this.fixesApplied.forEach(fix => {
      console.log(`  ✅ ${fix}`);
    });

    console.log(`\n📈 SUMMARY:`);
    console.log(`  - Products fixed: ${this.productsFixed}`);
    console.log(`  - Duplicates removed: ${this.duplicatesRemoved}`);
    console.log(`  - Total fixes applied: ${this.fixesApplied.length}`);

    console.log('\n🧪 NEXT STEPS:');
    console.log('1. Test the admin panel with feeding lounge wear filter');
    console.log('2. Verify all products appear without duplicates');
    console.log('3. Check pagination works correctly');
    console.log('4. Test stock filtering and search functionality');

    console.log('\n' + '='.repeat(80));
  }

  async run() {
    try {
      this.log('Starting comprehensive filtering fix...');
      
      // Connect to database
      const dbConnected = await this.connectDatabase();
      if (!dbConnected) {
        return;
      }

      // Apply all fixes
      await this.fixCategoryInconsistencies();
      await this.fixDisplayOrderIssues();
      await this.removeDuplicateProducts();

      // Test API endpoints
      const testResults = await this.testAPIEndpoints();

      // Generate final report
      await this.generateFinalReport();

      // Show test results
      console.log('\n🧪 API TEST RESULTS:');
      testResults.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.name}: ${result.productCount} products, ${result.totalPages} pages, ${result.duplicates} duplicates`);
        } else {
          console.log(`  ❌ ${result.name}: ${result.error}`);
        }
      });

    } catch (error) {
      this.log(`Comprehensive fix failed: ${error.message}`, 'error');
    } finally {
      await mongoose.disconnect();
      this.log('Disconnected from database');
    }
  }
}

// Run comprehensive fix
const fix = new ComprehensiveFilteringFix();
fix.run();
