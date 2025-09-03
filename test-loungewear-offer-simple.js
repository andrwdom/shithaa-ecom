require('dotenv').config();
const mongoose = require('mongoose');
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

const testLoungewearOffer = async () => {
  try {
    console.log('🔍 Testing current loungewear offer state...\n');
    
    // Find loungewear products
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    }).limit(5);
    
    console.log(`📊 Found ${loungewearProducts.length} loungewear products:`);
    loungewearProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Category: ${product.categorySlug}`);
      console.log(`   Price: ₹${product.price}`);
      console.log('');
    });
    
    if (loungewearProducts.length >= 3) {
      console.log('🧪 Testing offer calculation with 3 products...');
      
      // Test the exact scenario mentioned by the user
      const testScenario = [
        { name: 'Loungewear Item 1', originalPrice: 450, categorySlug: 'zipless-feeding-lounge-wear' },
        { name: 'Loungewear Item 2', originalPrice: 450, categorySlug: 'non-feeding-lounge-wear' },
        { name: 'Loungewear Item 3', originalPrice: 450, categorySlug: 'zipless-feeding-lounge-wear' }
      ];
      
      // Simulate the backend calculation
      function calculateLoungewearCategoryOffer(loungewearCategoryItems) {
        console.log(`\n🔧 Calculating offer for ${loungewearCategoryItems.length} items:`);
        loungewearCategoryItems.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.name} - ₹${item.originalPrice}`);
        });
        
        if (loungewearCategoryItems.length < 3) {
          console.log(`❌ No offer applied: Need 3+ items, have ${loungewearCategoryItems.length}`);
          return {
            originalTotal: loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0),
            discount: 0,
            offerApplied: false
          };
        }

        const completeSets = Math.floor(loungewearCategoryItems.length / 3);
        const remainingItems = loungewearCategoryItems.length % 3;
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        const offerTotal = (completeSets * 1299) + (remainingItems * 450);
        
        console.log(`\n📊 Calculation:`);
        console.log(`   Original total: ₹${originalTotal}`);
        console.log(`   Complete sets of 3: ${completeSets}`);
        console.log(`   Remaining items: ${remainingItems}`);
        console.log(`   Offer total: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
        
        const discount = originalTotal - offerTotal;
        console.log(`   Discount: ₹${originalTotal} - ₹${offerTotal} = ₹${discount}`);
        
        if (discount <= 0) {
          console.log(`❌ Invalid discount: ₹${discount}`);
          return {
            originalTotal,
            discount: 0,
            offerApplied: false
          };
        }
        
        return {
          originalTotal,
          discount,
          offerApplied: true,
          offerDetails: {
            completeSets,
            remainingItems,
            offerPrice: offerTotal,
            originalPrice: originalTotal,
            savings: discount
          }
        };
      }
      
      const result = calculateLoungewearCategoryOffer(testScenario);
      
      console.log('\n🎯 Final Result:');
      console.log(`   Offer Applied: ${result.offerApplied}`);
      console.log(`   Original Total: ₹${result.originalTotal}`);
      console.log(`   Discount: ₹${result.discount}`);
      
      // Check if it matches expected result
      const expectedDiscount = 51; // 1350 - 1299 = 51
      console.log(`\n✅ Expected discount: ₹${expectedDiscount}`);
      console.log(`✅ Actual discount: ₹${result.discount}`);
      
      if (result.discount === expectedDiscount && result.offerApplied) {
        console.log(`🎉 SUCCESS: Offer calculation is correct!`);
        console.log(`   - 3 loungewear items @ ₹450 each = ₹1350`);
        console.log(`   - Offer: 3 for ₹1299`);
        console.log(`   - Discount: ₹51`);
      } else {
        console.log(`❌ ISSUE: Offer calculation is not working as expected.`);
      }
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
  console.log('\n✅ Test completed');
};

main().catch(console.error);
