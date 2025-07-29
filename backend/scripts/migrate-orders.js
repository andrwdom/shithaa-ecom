const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha');

// Import Order model
const Order = require('../models/Order');

async function migrateOrders() {
  try {
    console.log('Starting order migration...');
    
    // Find all orders
    const orders = await Order.find({});
    console.log(`Found ${orders.length} orders to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const order of orders) {
      let needsUpdate = false;
      const updateData = {};
      
      // Check if order has top-level email field
      if (!order.email && order.userInfo?.email) {
        updateData.email = order.userInfo.email;
        needsUpdate = true;
      }
      
      // Check if order has userInfo.email field
      if (!order.userInfo?.email && order.email) {
        if (!updateData.userInfo) updateData.userInfo = {};
        updateData.userInfo.email = order.email;
        needsUpdate = true;
      }
      
      // Check if order has userInfo object but missing email
      if (order.userInfo && !order.userInfo.email && order.email) {
        updateData.userInfo = { ...order.userInfo, email: order.email };
        needsUpdate = true;
      }
      
      // Check if order has shippingInfo.email but missing top-level email
      if (!order.email && order.shippingInfo?.email) {
        updateData.email = order.shippingInfo.email;
        needsUpdate = true;
      }
      
      // Check if order has billingInfo.email but missing top-level email
      if (!order.email && order.billingInfo?.email) {
        updateData.email = order.billingInfo.email;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await Order.findByIdAndUpdate(order._id, updateData);
        updatedCount++;
        console.log(`Updated order ${order._id}:`, updateData);
      } else {
        skippedCount++;
      }
    }
    
    console.log('\nMigration completed!');
    console.log(`Updated: ${updatedCount} orders`);
    console.log(`Skipped: ${skippedCount} orders (already correct)`);
    console.log(`Total processed: ${orders.length} orders`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateOrders();
}

module.exports = migrateOrders; 