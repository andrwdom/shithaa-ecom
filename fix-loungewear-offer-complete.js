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

const fixLoungewearOffer = async () => {
  try {
    console.log('🔧 Starting comprehensive loungewear offer fix...\n');
    
    // Step 1: Check and fix product categories
    console.log('🔧 Step 1: Checking and fixing product categories...');
    
    const allProducts = await productModel.find({});
    console.log(`📊 Total products in database: ${allProducts.length}`);
    
    // Find products that should be loungewear based on their names
    const potentialLoungewearProducts = allProducts.filter(product => 
      product.name.toLowerCase().includes('lounge') || 
      product.name.toLowerCase().includes('loungwear') ||
      product.name.toLowerCase().includes('feeding')
    );
    
    console.log(`📊 Found ${potentialLoungewearProducts.length} potential loungewear products:`);
    
    let fixedCount = 0;
    for (const product of potentialLoungewearProducts) {
      let newCategorySlug = product.categorySlug;
      let needsUpdate = false;
      
      console.log(`\n🔍 Checking: "${product.name}"`);
      console.log(`   Current category: ${product.categorySlug}`);
      console.log(`   Price: ₹${product.price}`);
      
      // Fix category based on product name
      if (product.name.toLowerCase().includes('zipless') && product.name.toLowerCase().includes('feeding')) {
        if (product.categorySlug !== 'zipless-feeding-lounge-wear') {
          newCategorySlug = 'zipless-feeding-lounge-wear';
          needsUpdate = true;
        }
      } else if (product.name.toLowerCase().includes('lounge') && !product.name.toLowerCase().includes('feeding')) {
        if (product.categorySlug !== 'non-feeding-lounge-wear') {
          newCategorySlug = 'non-feeding-lounge-wear';
          needsUpdate = true;
        }
      } else if (product.name.toLowerCase().includes('feeding') && !product.name.toLowerCase().includes('lounge')) {
        if (product.categorySlug !== 'maternity-feeding-wear') {
          newCategorySlug = 'maternity-feeding-wear';
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await productModel.findByIdAndUpdate(product._id, { categorySlug: newCategorySlug });
        console.log(`   ✅ Fixed: ${product.categorySlug} → ${newCategorySlug}`);
        fixedCount++;
      } else {
        console.log(`   ✅ Already correct: ${product.categorySlug}`);
      }
    }
    
    console.log(`\n📊 Fixed ${fixedCount} product categories\n`);
    
    // Step 2: Verify loungewear products
    console.log('🔧 Step 2: Verifying loungewear products...');
    
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    });
    
    console.log(`📊 Found ${loungewearProducts.length} loungewear products:`);
    loungewearProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.categorySlug} - ₹${product.price}`);
    });
    
    // Step 3: Test the offer calculation
    if (loungewearProducts.length >= 3) {
      console.log('\n🧪 Step 3: Testing offer calculation...');
      
      // Test with 3 products at ₹450 each (the scenario from the user's description)
      const testItems = loungewearProducts.slice(0, 3).map(product => ({
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        size: 'L',
        originalPrice: product.price,
        categorySlug: product.categorySlug
      }));
      
      console.log('\n📋 Test items:');
      testItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ₹${item.price} - ${item.categorySlug}`);
      });
      
      // Mock the offer calculation function from the backend
      function calculateLoungewearCategoryOffer(loungewearCategoryItems) {
        console.log(`\n🔧 Testing offer calculation with ${loungewearCategoryItems.length} items`);
        
        if (loungewearCategoryItems.length < 3) {
          console.log(`❌ No offer: Only ${loungewearCategoryItems.length} items, need 3+`);
          return {
            originalTotal: loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0),
            discount: 0,
            offerApplied: false,
            offerDetails: null
          };
        }

        const completeSets = Math.floor(loungewearCategoryItems.length / 3);
        const remainingItems = loungewearCategoryItems.length % 3;
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        const offerTotal = (completeSets * 1299) + (remainingItems * 450);
        
        console.log(`🔧 Calculation: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
        console.log(`🔧 Original total: ₹${originalTotal}`);
        
        if (offerTotal >= originalTotal) {
          console.log(`❌ Offer validation failed: Offer total ₹${offerTotal} >= Original total ₹${originalTotal}`);
          return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
          };
        }
        
        const discount = originalTotal - offerTotal;
        console.log(`✅ Discount: ₹${discount}`);
        
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
      
      const result = calculateLoungewearCategoryOffer(testItems);
      
      console.log('\n🎯 Test Result:');
      console.log(`Offer Applied: ${result.offerApplied}`);
      console.log(`Original Total: ₹${result.originalTotal}`);
      console.log(`Discount: ₹${result.discount}`);
      if (result.offerDetails) {
        console.log(`Offer Details:`, result.offerDetails);
      }
      
      // Test with the exact scenario: 3 items @ ₹450 each = ₹1350, should get ₹51 discount
      console.log('\n🧪 Testing with exact scenario (3 × ₹450 = ₹1350)...');
      const exactScenario = [
        { name: 'Test Item 1', originalPrice: 450, size: 'L', categorySlug: 'zipless-feeding-lounge-wear' },
        { name: 'Test Item 2', originalPrice: 450, size: 'XL', categorySlug: 'non-feeding-lounge-wear' },
        { name: 'Test Item 3', originalPrice: 450, size: 'L', categorySlug: 'zipless-feeding-lounge-wear' }
      ];
      
      const exactResult = calculateLoungewearCategoryOffer(exactScenario);
      
      console.log('\n🎯 Exact Scenario Result:');
      console.log(`Offer Applied: ${exactResult.offerApplied}`);
      console.log(`Original Total: ₹${exactResult.originalTotal}`);
      console.log(`Discount: ₹${exactResult.discount}`);
      
      const expectedDiscount = 1350 - 1299; // ₹51
      console.log(`\n✅ Expected discount: ₹${expectedDiscount}`);
      console.log(`✅ Actual discount: ₹${exactResult.discount}`);
      console.log(`✅ Match: ${exactResult.discount === expectedDiscount ? 'YES' : 'NO'}`);
      
    } else {
      console.log('❌ Not enough loungewear products found for testing');
    }
    
    console.log('\n✅ Loungewear offer fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing loungewear offer:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixLoungewearOffer();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
