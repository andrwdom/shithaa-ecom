import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function debugStock() {
  try {
    console.log('🔍 DEBUGGING STOCK ISSUES...');
    console.log('================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const { default: productModel } = await import('./models/productModel.js');
    
    // Search for the specific product
    const product = await productModel.findOne({
      name: { $regex: /Black Glitter With Shawl/i }
    });
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }
    
    console.log('📦 Product found:', product.name);
    console.log('🆔 Product ID:', product._id);
    console.log('📏 Available sizes and stock:');
    
    if (product.sizes && product.sizes.length > 0) {
      product.sizes.forEach(size => {
        console.log(`  - ${size.size}: ${size.stock} units available`);
      });
    } else {
      console.log('  ❌ No sizes found in product');
    }
    
    // Check if there are any stock-related issues
    console.log('\n🔍 Checking for stock issues...');
    
    // Look for negative stock values
    const negativeStock = product.sizes?.filter(s => s.stock < 0);
    if (negativeStock && negativeStock.length > 0) {
      console.log('⚠️  NEGATIVE STOCK DETECTED:');
      negativeStock.forEach(s => {
        console.log(`    ${s.size}: ${s.stock} (This will cause reservation failures!)`);
      });
    }
    
    // Check for zero stock
    const zeroStock = product.sizes?.filter(s => s.stock === 0);
    if (zeroStock && zeroStock.length > 0) {
      console.log('⚠️  ZERO STOCK DETECTED:');
      zeroStock.forEach(s => {
        console.log(`    ${s.size}: ${s.stock} (This will cause reservation failures!)`);
      });
    }
    
    // Check for missing stock field
    const missingStock = product.sizes?.filter(s => s.stock === undefined || s.stock === null);
    if (missingStock && missingStock.length > 0) {
      console.log('⚠️  MISSING STOCK FIELD:');
      missingStock.forEach(s => {
        console.log(`    ${s.size}: stock field is ${s.stock}`);
      });
    }
    
    console.log('\n================================');
    console.log('🔧 RECOMMENDED FIXES:');
    
    if (negativeStock && negativeStock.length > 0) {
      console.log('1. Fix negative stock values immediately');
      console.log('2. Run stock correction script');
    }
    
    if (zeroStock && zeroStock.length > 0) {
      console.log('3. Restock items with zero stock');
      console.log('4. Update inventory management');
    }
    
    if (missingStock && missingStock.length > 0) {
      console.log('5. Fix missing stock fields in database');
      console.log('6. Validate product data structure');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugStock();
