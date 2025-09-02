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

const debugCartOffer = async () => {
  try {
    console.log('🔍 Debugging cart offer issue...\n');
    
    // 1. Check loungewear products
    console.log('📊 Step 1: Checking loungewear products...');
    const loungewearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear'] }
    }).limit(5);
    
    console.log(`Found ${loungewearProducts.length} loungewear products:`);
    loungewearProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Category: ${product.categorySlug}`);
      console.log(`   Price: ₹${product.price}`);
      console.log(`   ID: ${product._id}`);
      console.log('   ---');
    });
    
    if (loungewearProducts.length < 3) {
      console.log('❌ Not enough loungewear products found!');
      return;
    }
    
    // 2. Test the exact cart calculation logic
    console.log('\n🧪 Step 2: Testing cart calculation logic...');
    
    // Create test cart items (simulating what frontend sends)
    const testCartItems = loungewearProducts.slice(0, 3).map(product => ({
      _id: product._id.toString(),
      name: product.name,
      price: product.price,
      quantity: 1,
      size: 'L',
      categorySlug: product.categorySlug
    }));
    
    console.log('Test cart items:');
    testCartItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - ₹${item.price} - Category: ${item.categorySlug}`);
    });
    
    // 3. Mock the backend calculation logic
    console.log('\n🔧 Step 3: Mocking backend calculation...');
    
    // Fetch product details (simulating backend)
    const productIds = [...new Set(testCartItems.map(item => item._id))];
    const products = await productModel.find({ _id: { $in: productIds } });
    
    const productMap = {};
    products.forEach(product => {
      productMap[product._id.toString()] = product;
    });
    
    console.log('Product map created:');
    Object.keys(productMap).forEach(id => {
      const product = productMap[id];
      console.log(`  ${id}: ${product.name} - ${product.categorySlug} - ₹${product.price}`);
    });
    
    // Separate loungewear items
    const loungewearCategoryItems = [];
    const otherItems = [];
    
    testCartItems.forEach(item => {
      const product = productMap[item._id];
      console.log(`\nProcessing item: ${item.name}`);
      console.log(`  Product found: ${!!product}`);
      if (product) {
        console.log(`  Product category: ${product.categorySlug}`);
        console.log(`  Is loungewear: ${product.categorySlug === 'zipless-feeding-lounge-wear' || product.categorySlug === 'non-feeding-lounge-wear'}`);
      }
      
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
        console.log(`  ✅ Added to loungewear items`);
      } else {
        otherItems.push(item);
        console.log(`  ❌ Added to other items`);
      }
    });
    
    console.log(`\n📊 Results:`);
    console.log(`Loungewear items count: ${loungewearCategoryItems.length}`);
    console.log(`Other items count: ${otherItems.length}`);
    
    // 4. Test offer calculation
    console.log('\n🎯 Step 4: Testing offer calculation...');
    
    if (loungewearCategoryItems.length >= 3) {
      const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
      const completeSets = Math.floor(loungewearCategoryItems.length / 3);
      const remainingItems = loungewearCategoryItems.length % 3;
      const offerTotal = (completeSets * 1299) + (remainingItems * 450);
      const discount = originalTotal - offerTotal;
      
      console.log(`Original total: ₹${originalTotal}`);
      console.log(`Complete sets: ${completeSets}`);
      console.log(`Remaining items: ${remainingItems}`);
      console.log(`Offer total: ₹${offerTotal}`);
      console.log(`Discount: ₹${discount}`);
      console.log(`Offer should apply: YES`);
      
      if (discount > 0) {
        console.log(`✅ Offer calculation is working correctly!`);
      } else {
        console.log(`❌ Offer calculation issue detected`);
      }
    } else {
      console.log(`❌ Not enough loungewear items for offer (need 3+, got ${loungewearCategoryItems.length})`);
    }
    
    // 5. Test API call simulation
    console.log('\n🌐 Step 5: Testing API call simulation...');
    
    try {
      const response = await fetch('http://localhost:4000/api/cart/calculate-total', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: testCartItems }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        
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
      }
    } catch (error) {
      console.log(`❌ API call error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
};

const main = async () => {
  await connectDB();
  await debugCartOffer();
  await mongoose.disconnect();
  console.log('\n✅ Database connection closed');
};

main().catch(console.error);
