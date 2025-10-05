#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Script for Filtering Issues
 * 
 * This script will:
 * 1. Check database for all feeding lounge wear products
 * 2. Verify category and categorySlug consistency
 * 3. Test the API endpoints
 * 4. Identify exact causes of duplicates and missing products
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

class FilteringDiagnostic {
  constructor() {
    this.issues = [];
    this.products = [];
    this.apiResults = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
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

  async analyzeDatabase() {
    this.log('Analyzing database for feeding lounge wear products...');
    
    // Get all products that should be in feeding lounge wear category
    const allFeedingProducts = await Product.find({
      $or: [
        { category: { $regex: /feeding.*lounge.*wear/i } },
        { categorySlug: { $regex: /feeding.*lounge.*wear/i } },
        { category: 'Zipless Feeding Lounge Wear' },
        { categorySlug: 'zipless-feeding-lounge-wear' }
      ]
    }).sort({ displayOrder: 1, createdAt: 1 });

    this.log(`Found ${allFeedingProducts.length} products in database`);

    // Analyze each product
    const analysis = {
      totalProducts: allFeedingProducts.length,
      categoryInconsistencies: [],
      missingCategorySlug: [],
      missingCategory: [],
      duplicateNames: [],
      displayOrderIssues: []
    };

    const nameCounts = {};
    const displayOrders = [];

    allFeedingProducts.forEach((product, index) => {
      // Check for category inconsistencies
      if (product.category && product.categorySlug) {
        const expectedSlug = product.category.toLowerCase().replace(/\s+/g, '-');
        if (product.categorySlug !== expectedSlug) {
          analysis.categoryInconsistencies.push({
            id: product._id,
            name: product.name,
            category: product.category,
            categorySlug: product.categorySlug,
            expectedSlug: expectedSlug
          });
        }
      }

      // Check for missing fields
      if (!product.categorySlug) {
        analysis.missingCategorySlug.push({
          id: product._id,
          name: product.name,
          category: product.category
        });
      }

      if (!product.category) {
        analysis.missingCategory.push({
          id: product._id,
          name: product.name,
          categorySlug: product.categorySlug
        });
      }

      // Check for duplicate names
      if (product.name) {
        nameCounts[product.name] = (nameCounts[product.name] || 0) + 1;
        if (nameCounts[product.name] > 1) {
          analysis.duplicateNames.push(product.name);
        }
      }

      // Check display order
      if (product.displayOrder !== undefined) {
        displayOrders.push(product.displayOrder);
      }
    });

    // Check for display order duplicates
    const uniqueDisplayOrders = new Set(displayOrders);
    if (displayOrders.length !== uniqueDisplayOrders.size) {
      analysis.displayOrderIssues = displayOrders.filter((order, index) => 
        displayOrders.indexOf(order) !== index
      );
    }

    this.products = allFeedingProducts;
    this.analysis = analysis;

    this.log(`Analysis complete:`);
    this.log(`  - Total products: ${analysis.totalProducts}`);
    this.log(`  - Category inconsistencies: ${analysis.categoryInconsistencies.length}`);
    this.log(`  - Missing categorySlug: ${analysis.missingCategorySlug.length}`);
    this.log(`  - Missing category: ${analysis.missingCategory.length}`);
    this.log(`  - Duplicate names: ${analysis.duplicateNames.length}`);
    this.log(`  - Display order issues: ${analysis.displayOrderIssues.length}`);

    return analysis;
  }

  async testAPIEndpoints() {
    this.log('Testing API endpoints...');
    
    const endpoints = [
      {
        name: 'All products (no filter)',
        params: { page: 1, limit: 12 }
      },
      {
        name: 'Category filter by categorySlug',
        params: { categorySlug: 'zipless-feeding-lounge-wear', page: 1, limit: 12 }
      },
      {
        name: 'Category filter by category name',
        params: { category: 'Zipless Feeding Lounge Wear', page: 1, limit: 12 }
      },
      {
        name: 'Page 2 with category filter',
        params: { categorySlug: 'zipless-feeding-lounge-wear', page: 2, limit: 12 }
      }
    ];

    for (const endpoint of endpoints) {
      try {
        this.log(`Testing: ${endpoint.name}`);
        
        const response = await axios.get(`${BACKEND_URL}/api/products`, {
          params: endpoint.params,
          headers: { token: ADMIN_TOKEN }
        });

        const data = response.data;
        this.apiResults[endpoint.name] = {
          success: data.success,
          products: data.products || [],
          total: data.total || 0,
          pages: data.pages || 0,
          productIds: (data.products || []).map(p => p._id)
        };

        this.log(`  ✅ Found ${data.products?.length || 0} products, ${data.pages || 0} pages, ${data.total || 0} total`);

      } catch (error) {
        this.log(`  ❌ Failed: ${error.message}`, 'error');
        this.apiResults[endpoint.name] = { error: error.message };
      }
    }
  }

  async checkForDuplicates() {
    this.log('Checking for duplicates across API calls...');
    
    const allProductIds = [];
    const duplicateIds = [];

    Object.entries(this.apiResults).forEach(([endpoint, result]) => {
      if (result.productIds) {
        result.productIds.forEach(id => {
          if (allProductIds.includes(id)) {
            duplicateIds.push({ id, endpoint });
          } else {
            allProductIds.push(id);
          }
        });
      }
    });

    if (duplicateIds.length > 0) {
      this.log(`Found ${duplicateIds.length} duplicate product IDs across API calls`, 'warning');
      duplicateIds.forEach(dup => {
        this.log(`  - Product ${dup.id} appears in ${dup.endpoint}`, 'warning');
      });
    } else {
      this.log('No duplicates found across API calls');
    }

    return duplicateIds;
  }

  async generateReport() {
    this.log('Generating comprehensive report...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 COMPREHENSIVE FILTERING DIAGNOSTIC REPORT');
    console.log('='.repeat(80));

    // Database Analysis
    console.log('\n📊 DATABASE ANALYSIS:');
    console.log(`Total feeding lounge wear products: ${this.analysis?.totalProducts || 0}`);
    
    if (this.analysis?.categoryInconsistencies?.length > 0) {
      console.log('\n❌ CATEGORY INCONSISTENCIES:');
      this.analysis.categoryInconsistencies.forEach(issue => {
        console.log(`  - ${issue.name}: category="${issue.category}", categorySlug="${issue.categorySlug}"`);
      });
    }

    if (this.analysis?.missingCategorySlug?.length > 0) {
      console.log('\n⚠️  MISSING CATEGORY SLUGS:');
      this.analysis.missingCategorySlug.forEach(issue => {
        console.log(`  - ${issue.name}: category="${issue.category}"`);
      });
    }

    if (this.analysis?.duplicateNames?.length > 0) {
      console.log('\n⚠️  DUPLICATE PRODUCT NAMES:');
      this.analysis.duplicateNames.forEach(name => {
        console.log(`  - ${name}`);
      });
    }

    // API Analysis
    console.log('\n🌐 API ENDPOINT ANALYSIS:');
    Object.entries(this.apiResults).forEach(([endpoint, result]) => {
      if (result.error) {
        console.log(`❌ ${endpoint}: ${result.error}`);
      } else {
        console.log(`✅ ${endpoint}: ${result.products?.length || 0} products, ${result.pages || 0} pages, ${result.total || 0} total`);
      }
    });

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (this.analysis?.categoryInconsistencies?.length > 0) {
      console.log('1. Fix category/categorySlug inconsistencies in database');
    }
    
    if (this.analysis?.missingCategorySlug?.length > 0) {
      console.log('2. Add missing categorySlug fields to products');
    }
    
    if (this.analysis?.duplicateNames?.length > 0) {
      console.log('3. Review duplicate product names - may need unique identifiers');
    }

    console.log('4. Ensure API uses consistent filtering logic');
    console.log('5. Verify pagination logic handles all edge cases');

    console.log('\n' + '='.repeat(80));
  }

  async run() {
    try {
      this.log('Starting comprehensive filtering diagnostic...');
      
      // Connect to database
      const dbConnected = await this.connectDatabase();
      if (!dbConnected) {
        return;
      }

      // Analyze database
      await this.analyzeDatabase();

      // Test API endpoints
      await this.testAPIEndpoints();

      // Check for duplicates
      await this.checkForDuplicates();

      // Generate report
      await this.generateReport();

    } catch (error) {
      this.log(`Diagnostic failed: ${error.message}`, 'error');
    } finally {
      await mongoose.disconnect();
      this.log('Disconnected from database');
    }
  }
}

// Run diagnostic
const diagnostic = new FilteringDiagnostic();
diagnostic.run();
