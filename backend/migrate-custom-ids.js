import mongoose from 'mongoose';
import 'dotenv/config';
import productModel from './models/productModel.js';

const migrateCustomIds = async () => {
  console.log('Starting migration script...');

  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in your .env file.');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully.');

    const result = await productModel.updateMany(
      { customId: { $exists: false } },
      [{ $set: { customId: { $toString: '$_id' } } }]
    );

    console.log('Migration complete.');
    console.log(`- Matched ${result.matchedCount} documents.`);
    console.log(`- Modified ${result.modifiedCount} documents.`);

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

migrateCustomIds(); 