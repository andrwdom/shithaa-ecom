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

const fixLoungewearOfferIssue = async () => {
  try {
    console.log('🔧 Fixing loungewear offer issue...\n');
    
    // 1. Check and fix product categories
    console.log('🔧 Step 1: Checking and fixing product categories...');
    
    const allProducts = await productModel.find({
      $or: [
        { name: { $regex: /lounge/i } },
        { name: { $regex: /loungwear/i } },
        { categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] } }
      ]
    });
    
    console.log(`Found ${allProducts.length} potential loungewear products:`);
    
    let fixedCount = 0;
    for (const product of allProducts) {
      let newCategorySlug = product.categorySlug;
      let needsUpdate = false;
      
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
      }
      
      if (needsUpdate) {
        await productModel.findByIdAndUpdate(product._id, { categorySlug: newCategorySlug });
        console.log(`✅ Fixed: ${product.name} -> ${newCategorySlug}`);
        fixedCount++;
      } else {
        console.log(`✅ Already correct: ${product.name} -> ${product.categorySlug}`);
      }
    }
    
    console.log(`\n📊 Fixed ${fixedCount} product categories\n`);
    
    // 2. Test the offer calculation with real products
    console.log('🧪 Step 2: Testing offer calculation...');
    
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    }).limit(3);
    
    if (loungewearProducts.length >= 3) {
      console.log('Found loungewear products for testing:');
      loungewearProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - ₹${product.price} - ${product.categorySlug}`);
      });
      
      // Test the exact calculation
      const testItems = loungewearProducts.slice(0, 3).map(product => ({
        _id: product._id.toString(),
        name: product.name,
        price: product.price,
        quantity: 1,
        size: 'L'
      }));
      
      const originalTotal = testItems.reduce((sum, item) => sum + item.price, 0);
      const offerTotal = 1299; // 3 for ₹1299
      const discount = originalTotal - offerTotal;
      
      console.log(`\n🎯 Test Results:`);
      console.log(`Original total: ₹${originalTotal}`);
      console.log(`Offer total: ₹${offerTotal}`);
      console.log(`Expected discount: ₹${discount}`);
      console.log(`Should apply offer: ${testItems.length >= 3 ? 'YES' : 'NO'}`);
      
      if (discount > 0) {
        console.log(`✅ Offer calculation is working correctly!`);
      } else {
        console.log(`❌ Offer calculation issue detected`);
      }
    } else {
      console.log('❌ Not enough loungewear products found for testing');
    }
    
    // 3. Create a test API endpoint
    console.log('\n🌐 Step 3: Testing API endpoint...');
    
    // Test the API call
    try {
      const testCartItems = loungewearProducts.slice(0, 3).map(product => ({
        _id: product._id.toString(),
        name: product.name,
        price: product.price,
        quantity: 1,
        size: 'L'
      }));
      
      const response = await fetch('http://localhost:4000/api/cart/calculate-total', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: testCartItems }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Response:', JSON.stringify(data, null, 2));
        
        if (data.success && data.data) {
          console.log(`✅ API working correctly!`);
          console.log(`Total: ₹${data.data.total}`);
          console.log(`Offer applied: ${data.data.offerApplied}`);
          console.log(`Discount: ₹${data.data.offerDiscount || 0}`);
        } else {
          console.log(`❌ API returned error: ${data.message}`);
        }
      } else {
        console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
        console.log('🔧 Backend server might not be running. Please start it with: cd backend && npm start');
      }
    } catch (error) {
      console.log(`❌ API call error: ${error.message}`);
      console.log('🔧 Backend server might not be running. Please start it with: cd backend && npm start');
    }
    
    // 4. Provide manual fix instructions
    console.log('\n🔧 Step 4: Manual fix instructions...');
    console.log('If the API is not working, please:');
    console.log('1. Start the backend server: cd backend && npm start');
    console.log('2. Check if the server is running on port 4000');
    console.log('3. Test the API endpoint manually');
    console.log('4. Clear browser cache and try again');
    
    console.log('\n✅ Fix completed!');
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixLoungewearOfferIssue();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
