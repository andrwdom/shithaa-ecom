import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import dotenv from 'dotenv';

dotenv.config();

const main = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📊 DUPLICATE CUSTOMID DIAGNOSIS');
        console.log('================================\n');

        // Find the specific problematic customId
        const problematicProducts = await productModel.find({ customId: "SCFL00130" });
        console.log(`🔍 Products with customId "SCFL00130": ${problematicProducts.length}`);
        
        if (problematicProducts.length > 0) {
            console.log('\n📋 Details of duplicate products:');
            problematicProducts.forEach((product, index) => {
                console.log(`\n   Product ${index + 1}:`);
                console.log(`   - ID: ${product._id}`);
                console.log(`   - Name: ${product.name}`);
                console.log(`   - Created: ${product.createdAt}`);
                console.log(`   - CustomId: ${product.customId}`);
            });
        }

        // Find ALL duplicate customIds in the database
        console.log('\n🔍 Searching for ALL duplicate customIds...');
        const duplicates = await productModel.aggregate([
            {
                $group: {
                    _id: "$customId",
                    count: { $sum: 1 },
                    products: { $push: { id: "$_id", name: "$name", created: "$createdAt" } }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('✅ No other duplicates found!');
        } else {
            console.log(`\n⚠️ Found ${duplicates.length} duplicate customId(s):`);
            duplicates.forEach(dup => {
                console.log(`\n   CustomId: ${dup._id} (${dup.count} duplicates)`);
                dup.products.forEach((prod, idx) => {
                    console.log(`     ${idx + 1}. ${prod.name} (${prod.id})`);
                });
            });
        }

        // Check total products count
        const totalProducts = await productModel.countDocuments();
        console.log(`\n📈 Total products in database: ${totalProducts}`);

        console.log('\n💡 RECOMMENDATIONS:');
        console.log('   1. Run the immediate-fix.js script to resolve SCFL00130');
        console.log('   2. Run fix-duplicate-custom-ids.js for all duplicates');
        console.log('   3. Use the updated product controller with auto-generation');

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

main();