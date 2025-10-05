#!/usr/bin/env node

/**
 * Test Filtering Fix
 * 
 * This script tests the fixed filtering functionality for feeding lounge wear products
 * to ensure no duplicates, missing products, or pagination issues.
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Test configuration
const TEST_CONFIG = {
  baseUrl: `${BACKEND_URL}/api/products`,
  headers: {
    'Content-Type': 'application/json',
    'token': ADMIN_TOKEN
  },
  testCategory: 'zipless-feeding-lounge-wear',
  pageSize: 12
};

class FilteringTester {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    };
  }

  async test(name, testFn) {
    this.results.totalTests++;
    console.log(`\n🧪 Testing: ${name}`);
    
    try {
      await testFn();
      this.results.passedTests++;
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push({ test: name, error: error.message });
      console.log(`❌ FAILED: ${name} - ${error.message}`);
    }
  }

  async makeRequest(params = {}) {
    const url = new URL(TEST_CONFIG.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });

    const response = await axios.get(url.toString(), {
      headers: TEST_CONFIG.headers
    });

    return response.data;
  }

  async testBasicFiltering() {
    const data = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      page: 1,
      limit: TEST_CONFIG.pageSize
    });

    if (!data.success) {
      throw new Error('API request failed');
    }

    if (!Array.isArray(data.products)) {
      throw new Error('Products should be an array');
    }

    console.log(`  📊 Found ${data.products.length} products on page 1`);
    console.log(`  📄 Total pages: ${data.pages}, Total products: ${data.total}`);

    // Verify all products belong to the correct category
    const wrongCategoryProducts = data.products.filter(product => 
      product.categorySlug !== TEST_CONFIG.testCategory
    );

    if (wrongCategoryProducts.length > 0) {
      throw new Error(`Found ${wrongCategoryProducts.length} products with wrong category`);
    }
  }

  async testPagination() {
    const page1 = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      page: 1,
      limit: TEST_CONFIG.pageSize
    });

    const page2 = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      page: 2,
      limit: TEST_CONFIG.pageSize
    });

    // Check for duplicates between pages
    const page1Ids = new Set(page1.products.map(p => p._id));
    const page2Ids = new Set(page2.products.map(p => p._id));
    const duplicates = [...page1Ids].filter(id => page2Ids.has(id));

    if (duplicates.length > 0) {
      throw new Error(`Found ${duplicates.length} duplicate products between page 1 and 2`);
    }

    console.log(`  📊 Page 1: ${page1.products.length} products`);
    console.log(`  📊 Page 2: ${page2.products.length} products`);
    console.log(`  ✅ No duplicates found between pages`);
  }

  async testStockFiltering() {
    // Test low stock filter
    const lowStockData = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      stockFilter: 'low',
      page: 1,
      limit: 100
    });

    console.log(`  📊 Low stock products: ${lowStockData.products.length}`);

    // Verify all products actually have low stock
    const invalidLowStock = lowStockData.products.filter(product => {
      const totalStock = product.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
      return totalStock === 0 || totalStock > 3;
    });

    if (invalidLowStock.length > 0) {
      throw new Error(`Found ${invalidLowStock.length} products incorrectly marked as low stock`);
    }

    // Test out of stock filter
    const outOfStockData = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      stockFilter: 'out',
      page: 1,
      limit: 100
    });

    console.log(`  📊 Out of stock products: ${outOfStockData.products.length}`);

    // Verify all products actually have zero stock
    const invalidOutOfStock = outOfStockData.products.filter(product => {
      const totalStock = product.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
      return totalStock > 0;
    });

    if (invalidOutOfStock.length > 0) {
      throw new Error(`Found ${invalidOutOfStock.length} products incorrectly marked as out of stock`);
    }
  }

  async testSearchFiltering() {
    const searchData = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      search: 'feeding',
      page: 1,
      limit: 100
    });

    console.log(`  📊 Search results for "feeding": ${searchData.products.length}`);

    // Verify search results contain the search term
    const invalidSearchResults = searchData.products.filter(product => 
      !product.name.toLowerCase().includes('feeding') && 
      !product.customId.toLowerCase().includes('feeding')
    );

    if (invalidSearchResults.length > 0) {
      throw new Error(`Found ${invalidSearchResults.length} products that don't match search term`);
    }
  }

  async testSorting() {
    const sortedData = await this.makeRequest({
      categorySlug: TEST_CONFIG.testCategory,
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: 100
    });

    console.log(`  📊 Sorted products: ${sortedData.products.length}`);

    // Verify sorting
    const names = sortedData.products.map(p => p.name);
    const sortedNames = [...names].sort();
    
    const isSorted = names.every((name, index) => name === sortedNames[index]);
    if (!isSorted) {
      throw new Error('Products are not sorted by name');
    }
  }

  async testNoDuplicatesAcrossAllPages() {
    const allProducts = new Set();
    const duplicates = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const data = await this.makeRequest({
        categorySlug: TEST_CONFIG.testCategory,
        page: page,
        limit: TEST_CONFIG.pageSize
      });

      for (const product of data.products) {
        if (allProducts.has(product._id)) {
          duplicates.push(product);
        } else {
          allProducts.add(product._id);
        }
      }

      hasMorePages = page < data.pages;
      page++;
    }

    if (duplicates.length > 0) {
      throw new Error(`Found ${duplicates.length} duplicate products across all pages`);
    }

    console.log(`  📊 Total unique products: ${allProducts.size}`);
    console.log(`  ✅ No duplicates found across all pages`);
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.errors.forEach(({ test, error }) => {
        console.log(`  • ${test}: ${error}`);
      });
    }

    const successRate = (this.results.passedTests / this.results.totalTests) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (this.results.failedTests === 0) {
      console.log('\n🎉 All tests passed! Filtering is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Filtering Tests...');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log(`🎯 Test Category: ${TEST_CONFIG.testCategory}`);
  
  const tester = new FilteringTester();

  await tester.test('Basic Category Filtering', () => tester.testBasicFiltering());
  await tester.test('Pagination (No Duplicates)', () => tester.testPagination());
  await tester.test('Stock Filtering', () => tester.testStockFiltering());
  await tester.test('Search Filtering', () => tester.testSearchFiltering());
  await tester.test('Sorting', () => tester.testSorting());
  await tester.test('No Duplicates Across All Pages', () => tester.testNoDuplicatesAcrossAllPages());

  tester.printResults();
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
