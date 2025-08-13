import mongoose from 'mongoose';
import dotenv from 'dotenv';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';

dotenv.config();

// Function to restore product stock
const restoreProductStock = async (items) => {
  for (const item of items) {
    const product = await productModel.findById(item._id);
    if (product) {
      const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
      if (sizeIndex !== -1) {
        product.sizes[sizeIndex].stock += item.quantity;
        await product.save();
        console.log(`Restored ${item.quantity} units of ${item.name} (${item.size})`);
      }
    }
  }
};

async function cleanupPendingOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all pending orders that are not paid
    const pendingOrders = await orderModel.find({
      $or: [
        { paymentStatus: 'pending' },
        { payment: false },
        { orderStatus: 'Pending' }
      ],
      phonepeTransactionId: { $exists: true, $ne: null }
    });

    console.log(`Found ${pendingOrders.length} pending orders to clean up`);

    for (const order of pendingOrders) {
      console.log(`\nProcessing order: ${order._id}`);
      console.log(`Payment status: ${order.paymentStatus}`);
      console.log(`Payment: ${order.payment}`);
      console.log(`Order status: ${order.orderStatus}`);
      console.log(`PhonePe Transaction ID: ${order.phonepeTransactionId}`);

      // Check if this order is older than 1 hour (likely abandoned)
      const orderAge = Date.now() - order.date;
      const oneHour = 60 * 60 * 1000;

      if (orderAge > oneHour) {
        console.log(`Order is older than 1 hour (${Math.round(orderAge / (60 * 1000))} minutes), cleaning up...`);
        
        // Restore product stock
        await restoreProductStock(order.items);
        
        // Delete the order
        await orderModel.findByIdAndDelete(order._id);
        console.log(`Order ${order._id} deleted and stock restored`);
      } else {
        console.log(`Order is recent (${Math.round(orderAge / (60 * 1000))} minutes), keeping for now`);
      }
    }

    console.log('\nCleanup completed!');
    
    // Show summary of remaining orders
    const remainingPending = await orderModel.countDocuments({
      $or: [
        { paymentStatus: 'pending' },
        { payment: false },
        { orderStatus: 'Pending' }
      ],
      phonepeTransactionId: { $exists: true, $ne: null }
    });
    
    console.log(`Remaining pending orders: ${remainingPending}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupPendingOrders().then(() => {
  console.log('Cleanup script finished');
  process.exit(0);
}).catch((error) => {
  console.error('Cleanup script failed:', error);
  process.exit(1);
}); 