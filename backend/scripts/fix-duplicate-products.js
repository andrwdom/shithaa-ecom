import mongoose from 'mongoose';
import dotenv from 'dotenv';
import productModel from '../models/productModel.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixDuplicateProducts = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Finding duplicate customIds...');
    
    // Find all products with duplicate customIds
    const duplicates = await productModel.aggregate([
      {
        $group: {
          _id: '$customId',
          count: { $sum: 1 },
          products: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    console.log(`Found ${duplicates.length} duplicate customIds`);
    
    for (const duplicate of duplicates) {
      console.log(`\n📦 Processing customId: ${duplicate._id}`);
      console.log(`Found ${duplicate.count} products with this ID`);
      
      // Keep the first product, remove the rest
      const productsToKeep = duplicate.products.slice(0, 1);
      const productsToRemove = duplicate.products.slice(1);
      
      console.log(`Keeping: ${productsToKeep[0]}`);
      console.log(`Removing: ${productsToRemove.length} duplicates`);
      
      // Remove duplicate products
      const result = await productModel.deleteMany({
        _id: { $in: productsToRemove }
      });
      
      console.log(`✅ Removed ${result.deletedCount} duplicate products`);
    }
    
    // Generate new customIds for any remaining duplicates
    console.log('\n🔧 Generating new customIds for any remaining duplicates...');
    
    const allProducts = await productModel.find({});
    const customIdCounts = {};
    
    for (const product of allProducts) {
      if (customIdCounts[product.customId]) {
        customIdCounts[product.customId]++;
      } else {
        customIdCounts[product.customId] = 1;
      }
    }
    
    let counter = 1;
    for (const product of allProducts) {
      if (customIdCounts[product.customId] > 1) {
        // Generate new customId
        const newCustomId = `SCFL${String(counter).padStart(5, '0')}`;
        
        // Check if new ID already exists
        const existingProduct = await productModel.findOne({ customId: newCustomId });
        if (!existingProduct) {
          await productModel.updateOne(
            { _id: product._id },
            { customId: newCustomId }
          );
          console.log(`✅ Updated product ${product._id} with new customId: ${newCustomId}`);
          customIdCounts[product.customId]--;
          counter++;
        }
      }
    }
    
    console.log('\n✅ Duplicate product fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing duplicate products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

fixDuplicateProducts(); 