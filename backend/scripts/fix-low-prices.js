Vimport mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import dotenv from 'dotenv';

dotenv.config();

// 🔧 FIX: Database migration script to fix products with extremely low prices
async function fixLowPrices() {
    try {
        console.log('🔧 Starting database migration to fix low prices...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find products with prices below ₹100
        const lowPriceProducts = await productModel.find({ price: { $lt: 100 } });
        console.log(`🔍 Found ${lowPriceProducts.length} products with prices below ₹100`);
        
        if (lowPriceProducts.length === 0) {
            console.log('✅ No products with low prices found');
            return;
        }
        
        // Update products with low prices to minimum safe price
        const updatePromises = lowPriceProducts.map(async (product) => {
            const oldPrice = product.price;
            const newPrice = 100; // Minimum safe price
            
            console.log(`🔧 Updating product "${product.name}" (${product.customId}): ₹${oldPrice} → ₹${newPrice}`);
            
            return productModel.findByIdAndUpdate(
                product._id,
                { 
                    price: newPrice,
                    originalPrice: oldPrice < 100 ? newPrice : product.originalPrice || newPrice
                },
                { new: true }
            );
        });
        
        const updatedProducts = await Promise.all(updatePromises);
        console.log(`✅ Successfully updated ${updatedProducts.length} products`);
        
        // Verify the fix
        const remainingLowPriceProducts = await productModel.find({ price: { $lt: 100 } });
        if (remainingLowPriceProducts.length === 0) {
            console.log('✅ All low price products have been fixed');
        } else {
            console.log(`⚠️ Warning: ${remainingLowPriceProducts.length} products still have low prices`);
        }
        
    } catch (error) {
        console.error('❌ Error during migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    fixLowPrices();
}

export default fixLowPrices;
