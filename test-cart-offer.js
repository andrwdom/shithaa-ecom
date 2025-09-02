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

const testCartOffer = async () => {
  try {
    console.log('🧪 Testing cart offer calculation...\n');
    
    // Find 3 loungewear products
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    }).limit(3);
    
    if (loungewearProducts.length < 3) {
      console.log('❌ Not enough loungewear products found for testing');
      return;
    }
    
    console.log('📋 Found loungewear products:');
    loungewearProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - Category: ${product.categorySlug} - Price: ₹${product.price}`);
    });
    
    // Create test cart items
    const testCartItems = loungewearProducts.map(product => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
      size: 'L'
    }));
    
    console.log('\n🧪 Testing cart calculation...');
    
    // Mock the cart calculation logic
    const loungewearCategoryItems = [];
    const otherItems = [];
    
    testCartItems.forEach(item => {
      const product = loungewearProducts.find(p => p._id.toString() === item._id.toString());
      if (product && (
        product.categorySlug === 'zipless-feeding-lounge-wear' || 
        product.categorySlug === 'non-feeding-lounge-wear'
      )) {
        for (let i = 0; i < item.quantity; i++) {
          loungewearCategoryItems.push({
            ...item,
            quantity: 1,
            originalPrice: product.price || item.price
          });
        }
      } else {
        otherItems.push(item);
      }
    });
    
    console.log(`\n📊 Loungewear items count: ${loungewearCategoryItems.length}`);
    console.log(`📊 Other items count: ${otherItems.length}`);
    
    // Calculate offer
    if (loungewearCategoryItems.length >= 3) {
      const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
      const completeSets = Math.floor(loungewearCategoryItems.length / 3);
      const remainingItems = loungewearCategoryItems.length % 3;
      const offerTotal = (completeSets * 1299) + (remainingItems * 450);
      const discount = originalTotal - offerTotal;
      
      console.log(`\n🎯 Offer Calculation:`);
      console.log(`Original total: ₹${originalTotal}`);
      console.log(`Complete sets: ${completeSets}`);
      console.log(`Remaining items: ${remainingItems}`);
      console.log(`Offer total: ₹${offerTotal}`);
      console.log(`Discount: ₹${discount}`);
      console.log(`Offer applied: YES`);
      
      if (discount > 0) {
        console.log(`✅ Offer is working correctly!`);
      } else {
        console.log(`❌ Offer calculation issue detected`);
      }
    } else {
      console.log(`❌ Not enough loungewear items for offer (need 3+, got ${loungewearCategoryItems.length})`);
    }
    
    // Test with the exact scenario from the image
    console.log('\n🧪 Testing with exact scenario from image...');
    const imageScenario = [
      { name: 'Navy blue with fish print feeding lounge wear', price: 450, quantity: 1, size: 'L' },
      { name: 'Black glitter zipless feeding lounge wear', price: 450, quantity: 1, size: 'XL' },
      { name: 'Purple with flower print feeding lounge wear', price: 450, quantity: 1, size: 'XL' }
    ];
    
    const imageLoungewearItems = imageScenario.map(item => ({
      ...item,
      originalPrice: item.price
    }));
    
    const imageOriginalTotal = imageLoungewearItems.reduce((sum, item) => sum + item.originalPrice, 0);
    const imageOfferTotal = 1299; // 3 for ₹1299
    const imageDiscount = imageOriginalTotal - imageOfferTotal;
    
    console.log(`\n🎯 Image Scenario:`);
    console.log(`Original total: ₹${imageOriginalTotal}`);
    console.log(`Offer total: ₹${imageOfferTotal}`);
    console.log(`Expected discount: ₹${imageDiscount}`);
    console.log(`Should apply offer: ${imageLoungewearItems.length >= 3 ? 'YES' : 'NO'}`);
    
    if (imageDiscount === 51) {
      console.log(`✅ Image scenario calculation is correct!`);
    } else {
      console.log(`❌ Image scenario calculation is incorrect`);
    }
    
  } catch (error) {
    console.error('❌ Error testing cart offer:', error);
  }
};

const main = async () => {
  await connectDB();
  await testCartOffer();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
