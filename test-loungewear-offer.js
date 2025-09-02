const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const productModel = require('./backend/models/productModel.js');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Mock the offer calculation function
function calculateLoungewearCategoryOffer(loungewearCategoryItems) {
    console.log(`🔧 CRITICAL DEBUG: calculateLoungewearCategoryOffer called with ${loungewearCategoryItems.length} items`);
    console.log(`🔧 CRITICAL DEBUG: Items:`, loungewearCategoryItems.map(item => `${item.name} (${item.size}) - ₹${item.originalPrice}`));
    
    // 🔧 CRITICAL FIX: Offer ONLY applies when there are 3 or more loungewear items
    if (loungewearCategoryItems.length < 3) {
        console.log(`🔧 CRITICAL: No loungewear offer applied: Only ${loungewearCategoryItems.length} item(s), need 3+ for offer`);
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        console.log(`🔧 CRITICAL DEBUG: Returning no offer, originalTotal: ₹${originalTotal}, discount: ₹0`);
        
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }

    // Calculate how many complete sets of 3
    const completeSets = Math.floor(loungewearCategoryItems.length / 3);
    const remainingItems = loungewearCategoryItems.length % 3;
    
    console.log(`🔧 Loungewear offer calculation: ${loungewearCategoryItems.length} items = ${completeSets} complete sets + ${remainingItems} remaining`);
    
    // Calculate totals
    const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
    
    // Calculate offer total based on the rule:
    // - Complete sets of 3: ₹1299 each
    // - Remaining items: ₹450 each
    const offerTotal = (completeSets * 1299) + (remainingItems * 450);
    
    console.log(`🔧 Offer calculation: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
    console.log(`🔧 Original total: ₹${originalTotal}, Offer total: ₹${offerTotal}`);
    
    // Ensure offer total is never higher than original total
    if (offerTotal >= originalTotal) {
        console.log(`🔧 Offer validation failed: Offer total ₹${offerTotal} >= Original total ₹${originalTotal}`);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }
    
    const discount = originalTotal - offerTotal;
    
    console.log(`🔧 Final discount: ₹${originalTotal} - ₹${offerTotal} = ₹${discount}`);
    
    // Additional safety check - discount should be positive
    if (discount <= 0) {
        console.log(`🔧 Offer validation failed: Invalid discount ₹${discount}`);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }
    
    const offerDetails = {     
        completeSets,
        remainingItems,
        offerPrice: offerTotal,
        originalPrice: originalTotal,
        savings: discount
    };

    return {    
        originalTotal,
        discount,
        offerApplied: true,
        offerDetails
    };
}

const testLoungewearOffer = async () => {
  try {
    console.log('🔍 Testing loungewear offer with real products...\n');
    
    // Find loungewear products
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    }).limit(5);
    
    console.log(`📊 Found ${loungewearProducts.length} loungewear products:`);
    loungewearProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - Category: ${product.categorySlug} - Price: ₹${product.price}`);
    });
    
    if (loungewearProducts.length >= 3) {
      console.log('\n🧪 Testing offer with 3 loungewear items...');
      
      // Create test items (simulating cart items)
      const testItems = loungewearProducts.slice(0, 3).map(product => ({
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        size: 'L', // Default size
        originalPrice: product.price
      }));
      
      console.log('\n📋 Test items:');
      testItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ₹${item.price}`);
      });
      
      const result = calculateLoungewearCategoryOffer(testItems);
      
      console.log('\n🎯 Offer Result:');
      console.log(`Offer Applied: ${result.offerApplied}`);
      console.log(`Original Total: ₹${result.originalTotal}`);
      console.log(`Discount: ₹${result.discount}`);
      if (result.offerDetails) {
        console.log(`Offer Details:`, result.offerDetails);
      }
      
      // Test with the exact scenario from the image
      console.log('\n🧪 Testing with exact scenario from image (3 items @ ₹450 each)...');
      const imageScenario = [
        { name: 'Navy blue with fish print feeding lounge wear', originalPrice: 450, size: 'L' },
        { name: 'Black glitter zipless feeding lounge wear', originalPrice: 450, size: 'XL' },
        { name: 'Purple with flower print feeding lounge wear', originalPrice: 450, size: 'XL' }
      ];
      
      const imageResult = calculateLoungewearCategoryOffer(imageScenario);
      
      console.log('\n🎯 Image Scenario Result:');
      console.log(`Offer Applied: ${imageResult.offerApplied}`);
      console.log(`Original Total: ₹${imageResult.originalTotal}`);
      console.log(`Discount: ₹${imageResult.discount}`);
      if (imageResult.offerDetails) {
        console.log(`Offer Details:`, imageResult.offerDetails);
      }
      
      // Expected: 3 × ₹450 = ₹1350, Offer: ₹1299, Discount: ₹51
      const expectedDiscount = 1350 - 1299; // ₹51
      console.log(`\n✅ Expected discount: ₹${expectedDiscount}`);
      console.log(`✅ Actual discount: ₹${imageResult.discount}`);
      console.log(`✅ Match: ${imageResult.discount === expectedDiscount ? 'YES' : 'NO'}`);
      
    } else {
      console.log('❌ Not enough loungewear products found for testing');
    }
    
  } catch (error) {
    console.error('❌ Error testing loungewear offer:', error);
  }
};

const main = async () => {
  await connectDB();
  await testLoungewearOffer();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
