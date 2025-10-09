#!/bin/bash

echo "🚨 QUICK FIX FOR PAYMENT ISSUE..."

# 1. Fix the stuck order immediately
echo "🔧 Fixing stuck order..."
node -e "
const mongoose = require('mongoose');
const orderModel = require('./backend/models/orderModel.js');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom').then(async () => {
  const order = await orderModel.findOne({
    phonepeTransactionId: '2e735989-2aff-4769-914d-2dacbb82896c'
  });
  
  if (order && order.phonepeResponse && order.phonepeResponse.state === 'COMPLETED') {
    await orderModel.findByIdAndUpdate(order._id, {
      status: 'CONFIRMED',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      confirmedAt: new Date(),
      paidAt: new Date(),
      stockConfirmed: true,
      stockConfirmedAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Order fixed!');
  } else {
    console.log('❌ Order not found or payment not successful');
  }
  
  process.exit(0);
});
"

# 2. Restart the backend to apply the stock fix
echo "🔄 Restarting backend..."
pm2 restart shithaa-backend

echo "✅ QUICK FIX COMPLETED!"
echo "🎉 The customer should now see their order as confirmed"
