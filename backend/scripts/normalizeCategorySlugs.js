import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha';

function normalizeCategory(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const products = await productModel.find({});
  let updatedCount = 0;
  for (const product of products) {
    if (product.category) {
      const newSlug = normalizeCategory(product.category);
      if (product.categorySlug !== newSlug) {
        product.categorySlug = newSlug;
        await product.save();
        updatedCount++;
        console.log(`Updated: ${product.name} → ${newSlug}`);
      }
    }
  }
  console.log(`All products normalized. Total updated: ${updatedCount}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error normalizing category slugs:', err);
  process.exit(1);
}); 