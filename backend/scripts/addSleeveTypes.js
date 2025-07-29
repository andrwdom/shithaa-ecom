import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha';

async function addSleeveTypesToProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find products that mention sleeve types in their names
    const products = await productModel.find({
      $or: [
        { name: { $regex: /puff sleeve/i } },
        { name: { $regex: /sleeveless/i } },
        { name: { $regex: /short sleeve/i } },
        { name: { $regex: /long sleeve/i } }
      ]
    });

    console.log(`Found ${products.length} products with sleeve mentions in names`);

    // Update products based on their names
    for (const product of products) {
      let sleeveType = '';
      
      if (product.name.toLowerCase().includes('puff sleeve')) {
        sleeveType = 'Puff Sleeve';
      } else if (product.name.toLowerCase().includes('sleeveless')) {
        sleeveType = 'Sleeveless';
      } else if (product.name.toLowerCase().includes('short sleeve')) {
        sleeveType = 'Short Sleeve';
      } else if (product.name.toLowerCase().includes('long sleeve')) {
        sleeveType = 'Long Sleeve';
      }

      if (sleeveType) {
        await productModel.findByIdAndUpdate(product._id, { sleeveType });
        console.log(`Updated "${product.name}" with sleeve type: ${sleeveType}`);
      }
    }

    // Also add some default sleeve types to other lounge wear products
    const loungeWearProducts = await productModel.find({
      categorySlug: { $in: ['zipless-feeding-lounge-wear', 'non-feeding-lounge-wear', 'maternity-feeding-wear', 'zipless-feeding-dupatta-lounge-wear'] },
      sleeveType: { $exists: false }
    }).limit(10);

    console.log(`Found ${loungeWearProducts.length} lounge wear products without sleeve types`);

    const sleeveTypes = ['Puff Sleeve', 'Normal Sleeve'];
    
    for (let i = 0; i < loungeWearProducts.length; i++) {
      const product = loungeWearProducts[i];
      const randomSleeveType = sleeveTypes[i % sleeveTypes.length];
      
      await productModel.findByIdAndUpdate(product._id, { sleeveType: randomSleeveType });
      console.log(`Updated "${product.name}" with sleeve type: ${randomSleeveType}`);
    }

    console.log('Sleeve types added successfully!');
    
  } catch (error) {
    console.error('Error adding sleeve types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addSleeveTypesToProducts();
