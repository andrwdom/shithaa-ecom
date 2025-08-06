import mongoose from 'mongoose';
import productModel from './models/productModel.js';

mongoose.connect('mongodb://localhost:27017/shitha-maternity')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find products with old string-based sizes
    const productsWithStringSizes = await productModel.find({
      $or: [
        { sizes: { $type: 'string' } },
        { sizes: { $elemMatch: { $type: 'string' } } }
      ]
    });
    
    console.log(`Found ${productsWithStringSizes.length} products with string-based sizes`);
    
    if (productsWithStringSizes.length > 0) {
      console.log('Products with string sizes:');
      productsWithStringSizes.forEach(product => {
        console.log(`- ${product.name} (${product._id}): sizes =`, product.sizes);
      });
      
      // Fix the products by converting string sizes to object format
      for (const product of productsWithStringSizes) {
        if (Array.isArray(product.sizes)) {
          const fixedSizes = product.sizes.map(size => {
            if (typeof size === 'string') {
              return { size, stock: 0 }; // Default stock to 0 for old string sizes
            }
            return size; // Keep existing object sizes
          });
          
          await productModel.updateOne(
            { _id: product._id },
            { $set: { sizes: fixedSizes } }
          );
          
          console.log(`Fixed product: ${product.name}`);
        }
      }
    }
    
    // Also check for products with mixed structures
    const allProducts = await productModel.find({});
    console.log(`\nTotal products: ${allProducts.length}`);
    
    allProducts.forEach(product => {
      if (product.sizes && product.sizes.length > 0) {
        const hasStringSizes = product.sizes.some(size => typeof size === 'string');
        if (hasStringSizes) {
          console.log(`⚠️  Product "${product.name}" has mixed size types:`, product.sizes);
        }
      }
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  })
  .catch(console.error); 