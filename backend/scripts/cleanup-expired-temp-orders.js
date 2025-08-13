import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TempOrder from '../models/TempOrder.js';

dotenv.config();

async function cleanupExpiredTempOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all expired temporary orders
    const expiredOrders = await TempOrder.find({
      expiresAt: { $lt: new Date() }
    });

    console.log(`Found ${expiredOrders.length} expired temporary orders to clean up`);

    if (expiredOrders.length > 0) {
      // Delete all expired orders
      const result = await TempOrder.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`Deleted ${result.deletedCount} expired temporary orders`);
    }

    // Show summary
    const totalTempOrders = await TempOrder.countDocuments();
    console.log(`Total temporary orders remaining: ${totalTempOrders}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupExpiredTempOrders().then(() => {
  console.log('Expired temp orders cleanup finished');
  process.exit(0);
}).catch((error) => {
  console.error('Expired temp orders cleanup failed:', error);
  process.exit(1);
}); 