#!/usr/bin/env node

/**
 * Quick Verification Script for Filtering Fix
 * 
 * This script quickly verifies that the filtering fixes are working
 * by making a few key API calls and checking the results.
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

async function quickVerify() {
  console.log('🔍 Quick Verification of Filtering Fix');
  console.log('=====================================');

  try {
    // Test 1: Basic category filtering
    console.log('\n1️⃣ Testing basic category filtering...');
    const response1 = await axios.get(`${BACKEND_URL}/api/products`, {
      params: {
        categorySlug: 'zipless-feeding-lounge-wear',
        page: 1,
        limit: 12
      },
      headers: { token: ADMIN_TOKEN }
    });

    const data1 = response1.data;
    console.log(`   📊 Found ${data1.products?.length || 0} products`);
    console.log(`   📄 Total pages: ${data1.pages || 0}`);
    console.log(`   📈 Total products: ${data1.total || 0}`);

    if (data1.products && data1.products.length > 0) {
      console.log('   ✅ Basic filtering working');
    } else {
      console.log('   ⚠️  No products found - check if category exists');
    }

    // Test 2: Check for duplicates between pages
    console.log('\n2️⃣ Testing pagination (no duplicates)...');
    const response2 = await axios.get(`${BACKEND_URL}/api/products`, {
      params: {
        categorySlug: 'zipless-feeding-lounge-wear',
        page: 2,
        limit: 12
      },
      headers: { token: ADMIN_TOKEN }
    });

    const data2 = response2.data;
    if (data1.products && data2.products) {
      const page1Ids = new Set(data1.products.map(p => p._id));
      const page2Ids = new Set(data2.products.map(p => p._id));
      const duplicates = [...page1Ids].filter(id => page2Ids.has(id));

      if (duplicates.length === 0) {
        console.log('   ✅ No duplicates between pages');
      } else {
        console.log(`   ❌ Found ${duplicates.length} duplicates between pages`);
      }
    }

    // Test 3: Stock filtering
    console.log('\n3️⃣ Testing stock filtering...');
    const response3 = await axios.get(`${BACKEND_URL}/api/products`, {
      params: {
        categorySlug: 'zipless-feeding-lounge-wear',
        stockFilter: 'low',
        page: 1,
        limit: 50
      },
      headers: { token: ADMIN_TOKEN }
    });

    const data3 = response3.data;
    console.log(`   📊 Low stock products: ${data3.products?.length || 0}`);

    if (data3.products && data3.products.length > 0) {
      // Check if products actually have low stock
      const invalidProducts = data3.products.filter(product => {
        const totalStock = product.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
        return totalStock === 0 || totalStock > 3;
      });

      if (invalidProducts.length === 0) {
        console.log('   ✅ Stock filtering working correctly');
      } else {
        console.log(`   ⚠️  ${invalidProducts.length} products incorrectly filtered as low stock`);
      }
    }

    // Test 4: Search functionality
    console.log('\n4️⃣ Testing search functionality...');
    const response4 = await axios.get(`${BACKEND_URL}/api/products`, {
      params: {
        categorySlug: 'zipless-feeding-lounge-wear',
        search: 'feeding',
        page: 1,
        limit: 50
      },
      headers: { token: ADMIN_TOKEN }
    });

    const data4 = response4.data;
    console.log(`   📊 Search results: ${data4.products?.length || 0}`);

    // Summary
    console.log('\n📋 Summary:');
    console.log(`   • Basic filtering: ${data1.products?.length > 0 ? '✅ Working' : '❌ Not working'}`);
    console.log(`   • Pagination: ${duplicates?.length === 0 ? '✅ No duplicates' : '❌ Has duplicates'}`);
    console.log(`   • Stock filtering: ${data3.products?.length > 0 ? '✅ Working' : '⚠️  No results'}`);
    console.log(`   • Search: ${data4.products?.length > 0 ? '✅ Working' : '⚠️  No results'}`);

    if (data1.products?.length > 0 && duplicates?.length === 0) {
      console.log('\n🎉 Filtering fix appears to be working correctly!');
    } else {
      console.log('\n⚠️  Some issues detected. Check the backend logs for more details.');
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running on', BACKEND_URL);
    } else if (error.response?.status === 401) {
      console.log('\n💡 Make sure you have a valid admin token');
    }
  }
}

// Run verification
quickVerify();
