#!/usr/bin/env node

/**
 * Test script to verify invoice generation fixes
 * Tests both product name display and loungewear offer discount
 */

import { generateInvoiceBuffer } from './backend/utils/invoiceGenerator.js';

// Mock order data with loungewear offer
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
      name: 'Navy blue with fish print feeding loungewear set',
      price: 450,
      quantity: 1,
      size: 'M'
    },
    {
      name: 'Purple with flower print feeding loungewear set',
      price: 450,
      quantity: 1,
      size: 'M'
    },
    {
      name: 'Black zip-less feeding lounge wear',
      price: 450,
      quantity: 1,
      size: 'L'
    }
  ],
  subtotal: 1350, // 450 * 3
  shippingCost: 39,
  totalAmount: 1339, // 1350 - 51 (offer discount) + 39 (shipping)
  paymentMethod: 'PhonePe',
  status: 'Shipped',
  // 🔧 FIX: Include offer details for testing
  offerDetails: {
    offerApplied: true,
    offerType: 'loungewear_buy3_1299',
    offerDiscount: 51, // 1350 - 1299 = 51
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

async function testInvoiceGeneration() {
  try {
    console.log('🧪 Testing invoice generation with fixes...');
    console.log('📋 Test order details:');
    console.log(`   - Order ID: ${testOrder.orderId}`);
    console.log(`   - Items: ${testOrder.cartItems.length}`);
    console.log(`   - Subtotal: ₹${testOrder.subtotal}`);
    console.log(`   - Offer Applied: ${testOrder.offerDetails.offerApplied}`);
    console.log(`   - Offer Discount: ₹${testOrder.offerDetails.offerDiscount}`);
    console.log(`   - Total: ₹${testOrder.totalAmount}`);
    
    console.log('\n🔧 Testing fixes:');
    console.log('   1. Product names should not be truncated (wider column)');
    console.log('   2. Loungewear offer discount should be displayed in order summary');
    
    // Generate invoice buffer
    const pdfBuffer = await generateInvoiceBuffer(testOrder);
    
    console.log('\n✅ Invoice generated successfully!');
    console.log(`   - PDF size: ${pdfBuffer.length} bytes`);
    console.log('   - Product names should now fit properly in wider columns');
    console.log('   - Order summary should show: "Loungewear Offer (Buy 3 @ ₹1299): -INR 51"');
    
    // Save test PDF for manual inspection
    const fs = await import('fs');
    const path = await import('path');
    const testPdfPath = path.join(process.cwd(), 'test-invoice-fixes.pdf');
    fs.writeFileSync(testPdfPath, pdfBuffer);
    console.log(`\n📄 Test PDF saved to: ${testPdfPath}`);
    console.log('   You can open this file to verify the fixes visually.');
    
  } catch (error) {
    console.error('❌ Error testing invoice generation:', error);
    process.exit(1);
  }
}

// Run the test
testInvoiceGeneration();
