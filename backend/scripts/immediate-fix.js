import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const main = async () => {
    try {
        console.log('🔧 IMMEDIATE FIX: Resolving SCFL00130 duplicate error...\n');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all products with the problematic customId
        const duplicateProducts = await productModel.find({ customId: "SCFL00130" });
        console.log(`\n🔍 Found ${duplicateProducts.length} products with customId "SCFL00130"`);

        if (duplicateProducts.length === 0) {
            console.log('✅ No duplicate SCFL00130 found!');
            return;
        }

        // Keep the first product, update the others
        for (let i = 1; i < duplicateProducts.length; i++) {
            const product = duplicateProducts[i];
            const newCustomId = `SCFL${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`;
            
            await productModel.findByIdAndUpdate(product._id, { customId: newCustomId });
            console.log(`🔄 Updated duplicate product:`);
            console.log(`   Name: ${product.name}`);
            console.log(`   Old ID: SCFL00130 → New ID: ${newCustomId}`);
        }

        console.log('\n✅ SCFL00130 duplicate error fixed!');
        console.log('💡 You can now add products without conflicts.');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📝 Database connection closed.');
        process.exit(0);
    }
};

main();