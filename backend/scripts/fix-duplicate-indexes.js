import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function fixDuplicateIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n🔍 Checking collection: ${collectionName}`);
      
      try {
        // Get indexes for this collection
        const indexes = await mongoose.connection.db.collection(collectionName).indexes();
        
        // Check for duplicate indexes
        const indexMap = new Map();
        const duplicates = [];
        
        for (const index of indexes) {
          const key = JSON.stringify(index.key);
          if (indexMap.has(key)) {
            duplicates.push({
              name: index.name,
              key: index.key,
              duplicateOf: indexMap.get(key).name
            });
          } else {
            indexMap.set(key, index);
          }
        }
        
        if (duplicates.length > 0) {
          console.log(`⚠️  Found ${duplicates.length} duplicate indexes:`);
          for (const dup of duplicates) {
            console.log(`   - ${dup.name} (duplicate of ${dup.duplicateOf})`);
            
            // Drop duplicate index
            try {
              await mongoose.connection.db.collection(collectionName).dropIndex(dup.name);
              console.log(`   ✅ Dropped duplicate index: ${dup.name}`);
            } catch (dropError) {
              console.log(`   ❌ Failed to drop index ${dup.name}:`, dropError.message);
            }
          }
        } else {
          console.log(`✅ No duplicate indexes found`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking collection ${collectionName}:`, error.message);
      }
    }
    
    console.log('\n✅ Duplicate index cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
fixDuplicateIndexes();
