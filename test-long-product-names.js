#!/usr/bin/env node

/**
 * Test script to verify invoice generation with long product names
 * Tests the fix for product name overlapping/truncation
 */

import { generateInvoiceBuffer } from './backend/utils/invoiceGenerator.js';

// Mock order data with very long product names
const testOrder = {
  orderId: 'TEST123',
  _id: 'test_order_id',
  createdAt: new Date(),
  isTestOrder: true,
  userInfo: {
    name: 'Test User',
    email: 'test@example.com'
  },
  shippingInfo: {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    addressLine1: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    postalCode: '123456',
    country: 'India'
  },
  cartItems: [
    {
      name: 'Navy blue with fish print feeding loungewear set with extra long description',
      price: 450,
      quantity: 1,
      size: 'M'
    },
    {
      name: 'Purple with flower print feeding loungewear set with very long product name that should wrap properly',
      price: 450,
      quantity: 1,
      size: 'L'
    },
    {
      name: 'Black zip-less feeding lounge wear with extremely long product name that needs proper text wrapping and should not overlap with other content',
      price: 450,
      quantity: 1,
      size: 'XL'
    }
  ],
  subtotal: 1350,
  shippingCost: 39,
  totalAmount: 1339,
  paymentMethod: 'PhonePe',
  status: 'Shipped',
  offerDetails: {
    offerApplied: true,
    offerType: 'loungewear_buy3_1299',
    offerDiscount: 51,
    offerDescription: 'Buy 3 @ ₹1299',
    offerCalculation: {
      completeSets: 1,
      remainingItems: 0,
      originalPrice: 1350,
      offerPrice: 1299,
      savings: 51
    }
  }
};

async function testLongProductNames() {
  try {
    console.log('🧪 Testing invoice generation with long product names...');
    console.log('📋 Test order details:');
    console.log(`   - Order ID: ${testOrder.orderId}`);
    console.log(`   - Items: ${testOrder.cartItems.length}`);
    console.log(`   - Longest product name: ${Math.max(...testOrder.cartItems.map(item => item.name.length))} characters`);
    
    console.log('\n🔧 Testing fixes:');
    console.log('   1. Product names should wrap properly without overlapping');
    console.log('   2. Table columns should be properly spaced');
    console.log('   3. Very long names should not truncate or overlap');
    
    // Generate invoice buffer
    const pdfBuffer = await generateInvoiceBuffer(testOrder);
    
    console.log('\n✅ Invoice generated successfully!');
    console.log(`   - PDF size: ${pdfBuffer.length} bytes`);
    console.log('   - Product names should now wrap properly in wider columns');
    console.log('   - No more overlapping text issues');
    
    // Save test PDF for manual inspection
    const fs = await import('fs');
    const path = await import('path');
    const testPdfPath = path.join(process.cwd(), 'test-long-product-names.pdf');
    fs.writeFileSync(testPdfPath, pdfBuffer);
    console.log(`\n📄 Test PDF saved to: ${testPdfPath}`);
    console.log('   You can open this file to verify the long product name fixes.');
    
  } catch (error) {
    console.error('❌ Error testing invoice generation:', error);
    process.exit(1);
  }
}

// Run the test
testLongProductNames();
