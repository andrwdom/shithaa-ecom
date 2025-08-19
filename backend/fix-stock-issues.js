import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function fixStockIssues() {
  try {
    console.log('🔧 FIXING STOCK ISSUES...');
    console.log('================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const { default: productModel } = await import('./models/productModel.js');
    
    // Find all products with stock issues
    const productsWithIssues = await productModel.find({
      $or: [
        { 'sizes.stock': { $lt: 0 } },           // Negative stock
        { 'sizes.stock': { $exists: false } },   // Missing stock field
        { 'sizes.stock': null }                  // Null stock values
      ]
    });
    
    if (productsWithIssues.length === 0) {
      console.log('✅ No stock issues found!');
      return;
    }
    
    console.log(`⚠️  Found ${productsWithIssues.length} products with stock issues`);
    
    let fixedCount = 0;
    
    for (const product of productsWithIssues) {
      console.log(`\n🔍 Fixing product: ${product.name}`);
      
      let hasChanges = false;
      
      if (product.sizes && product.sizes.length > 0) {
        for (let i = 0; i < product.sizes.length; i++) {
          const size = product.sizes[i];
          const originalStock = size.stock;
          
          // Fix negative stock
          if (size.stock < 0) {
            console.log(`  ❌ Size ${size.size}: ${size.stock} → 0 (negative stock fixed)`);
            product.sizes[i].stock = 0;
            hasChanges = true;
          }
          
          // Fix missing/null stock
          if (size.stock === undefined || size.stock === null) {
            console.log(`  ❌ Size ${size.size}: ${size.stock} → 0 (missing stock fixed)`);
            product.sizes[i].stock = 0;
            hasChanges = true;
          }
          
          // Ensure stock is a number
          if (typeof size.stock !== 'number') {
            console.log(`  ❌ Size ${size.size}: ${size.stock} → 0 (invalid stock type fixed)`);
            product.sizes[i].stock = 0;
            hasChanges = true;
          }
        }
      }
      
      if (hasChanges) {
        try {
          await product.save();
          console.log(`  ✅ Product ${product.name} fixed successfully`);
          fixedCount++;
        } catch (saveError) {
          console.error(`  ❌ Failed to save ${product.name}:`, saveError.message);
        }
      } else {
        console.log(`  ℹ️  No changes needed for ${product.name}`);
      }
    }
    
    console.log('\n================================');
    console.log(`🎉 STOCK FIX COMPLETED!`);
    console.log(`✅ Fixed ${fixedCount} products`);
    console.log(`📊 Total products checked: ${productsWithIssues.length}`);
    
    // Now let's verify the fix
    console.log('\n🔍 Verifying fixes...');
    const remainingIssues = await productModel.find({
      $or: [
        { 'sizes.stock': { $lt: 0 } },
        { 'sizes.stock': { $exists: false } },
        { 'sizes.stock': null }
      ]
    });
    
    if (remainingIssues.length === 0) {
      console.log('✅ All stock issues resolved!');
    } else {
      console.log(`⚠️  ${remainingIssues.length} products still have issues`);
      remainingIssues.forEach(p => {
        console.log(`  - ${p.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixStockIssues();
