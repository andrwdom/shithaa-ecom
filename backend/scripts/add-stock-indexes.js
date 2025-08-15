import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa';

async function addStockIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        const db = mongoose.connection.db;
        
        console.log('Creating stock-related indexes...');
        
        // Create compound index for efficient stock updates
        await db.collection('products').createIndex(
            { 
                _id: 1, 
                'sizes.size': 1, 
                'sizes.stock': 1 
            },
            { 
                name: 'stock_update_index',
                background: true 
            }
        );
        console.log('✅ Created compound index: { _id: 1, "sizes.size": 1, "sizes.stock": 1 }');
        
        // Create index for stock queries
        await db.collection('products').createIndex(
            { 'sizes.stock': 1 },
            { 
                name: 'stock_query_index',
                background: true 
            }
        );
        console.log('✅ Created index: { "sizes.stock": 1 }');
        
        // Create index for low stock monitoring
        await db.collection('products').createIndex(
            { 'sizes.stock': 1, category: 1 },
            { 
                name: 'low_stock_monitoring_index',
                background: true 
            }
        );
        console.log('✅ Created index: { "sizes.stock": 1, category: 1 }');
        
        console.log('\n🎉 All stock indexes created successfully!');
        
        // Show existing indexes
        console.log('\n📊 Current indexes on products collection:');
        const indexes = await db.collection('products').indexes();
        indexes.forEach(index => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the script
addStockIndexes(); 