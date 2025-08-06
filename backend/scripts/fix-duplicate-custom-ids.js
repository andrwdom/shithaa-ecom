import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Generate unique customId
const generateUniqueCustomId = async (prefix = 'SCF') => {
    let customId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        customId = `${prefix}L${randomNum.toString().padStart(5, '0')}`;
        
        const existingProduct = await productModel.findOne({ customId });
        if (!existingProduct) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Unable to generate unique customId after maximum attempts');
    }

    return customId;
};

// Fix duplicate customIds
const fixDuplicateCustomIds = async () => {
    try {
        console.log('🔍 Checking for duplicate customIds...');
        
        // Find all products and group by customId to identify duplicates
        const duplicates = await productModel.aggregate([
            {
                $group: {
                    _id: "$customId",
                    count: { $sum: 1 },
                    products: { $push: "$$ROOT" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('✅ No duplicate customIds found!');
            return;
        }

        console.log(`⚠️ Found ${duplicates.length} duplicate customId(s):`);
        
        for (const duplicate of duplicates) {
            console.log(`\n🔄 Processing customId: ${duplicate._id} (${duplicate.count} duplicates)`);
            
            // Keep the first product as is, update the others
            const [keepProduct, ...updateProducts] = duplicate.products;
            console.log(`   ✅ Keeping product: ${keepProduct.name} (ID: ${keepProduct._id})`);
            
            for (const product of updateProducts) {
                const newCustomId = await generateUniqueCustomId();
                await productModel.findByIdAndUpdate(product._id, { customId: newCustomId });
                console.log(`   🔄 Updated product: ${product.name} (ID: ${product._id})`);
                console.log(`      Old customId: ${product.customId} → New customId: ${newCustomId}`);
            }
        }

        console.log('\n✅ All duplicate customIds have been fixed!');
        
    } catch (error) {
        console.error('❌ Error fixing duplicate customIds:', error);
        throw error;
    }
};

// Check for products with missing customIds
const fixMissingCustomIds = async () => {
    try {
        console.log('\n🔍 Checking for products with missing customIds...');
        
        const productsWithoutCustomId = await productModel.find({
            $or: [
                { customId: { $exists: false } },
                { customId: null },
                { customId: "" }
            ]
        });

        if (productsWithoutCustomId.length === 0) {
            console.log('✅ All products have customIds!');
            return;
        }

        console.log(`⚠️ Found ${productsWithoutCustomId.length} product(s) without customId`);
        
        for (const product of productsWithoutCustomId) {
            const newCustomId = await generateUniqueCustomId();
            await productModel.findByIdAndUpdate(product._id, { customId: newCustomId });
            console.log(`   🔄 Added customId to: ${product.name} (ID: ${product._id})`);
            console.log(`      New customId: ${newCustomId}`);
        }

        console.log('\n✅ All products now have customIds!');
        
    } catch (error) {
        console.error('❌ Error fixing missing customIds:', error);
        throw error;
    }
};

// Main function
const main = async () => {
    try {
        console.log('🚀 Starting customId cleanup...\n');
        
        await connectDB();
        await fixDuplicateCustomIds();
        await fixMissingCustomIds();
        
        console.log('\n🎉 CustomId cleanup completed successfully!');
        console.log('💡 You can now restart your backend server.');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📝 Database connection closed.');
        process.exit(0);
    }
};

// Run the script
main();