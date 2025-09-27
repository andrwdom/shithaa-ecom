const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PaymentSession = require('./backend/models/paymentSessionModel.js').default;
const orderModel = require('./backend/models/orderModel.js').default;
const CheckoutSession = require('./backend/models/CheckoutSession.js').default;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const recoverMissingOrders = async () => {
  try {
    console.log('🔧 RECOVERING MISSING ORDERS\n');
    
    // Find payment sessions with successful payments but no corresponding orders
    const successfulPaymentSessions = await PaymentSession.find({
      status: 'success'
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${successfulPaymentSessions.length} successful payment sessions`);
    
    const missingOrders = [];
    
    for (const session of successfulPaymentSessions) {
      const existingOrder = await orderModel.findOne({
        phonepeTransactionId: session.phonepeTransactionId
      });
      
      if (!existingOrder) {
        missingOrders.push(session);
      }
    }
    
    console.log(`\nFound ${missingOrders.length} payment sessions without corresponding orders:`);
    
    if (missingOrders.length === 0) {
      console.log('✅ No missing orders found. All payments have corresponding orders.');
      return;
    }
    
    // Process each missing order
    for (let i = 0; i < missingOrders.length; i++) {
      const session = missingOrders[i];
      console.log(`\n${i + 1}. Processing missing order for payment session: ${session._id}`);
      console.log(`   PhonePe Transaction: ${session.phonepeTransactionId}`);
      console.log(`   User Email: ${session.userEmail}`);
      console.log(`   Amount: ₹${session.orderData?.amount || 'unknown'}`);
      console.log(`   Has orderPayload: ${!!session.orderPayload}`);
      console.log(`   Has orderData: ${!!session.orderData}`);
      
      try {
        let orderData;
        
        if (session.orderPayload) {
          // Use orderPayload if available
          orderData = { ...session.orderPayload };
          console.log('   ✅ Using orderPayload for order creation');
        } else if (session.orderData) {
          // Fallback to orderData
          orderData = {
            orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userInfo: {
              email: session.userEmail,
              userId: session.userId
            },
            shippingInfo: session.orderData.shipping || {},
            cartItems: session.orderData.cartItems || [],
            items: session.orderData.cartItems || [],
            totalAmount: session.orderData.amount || 0,
            total: session.orderData.amount || 0,
            subtotal: session.orderData.amount || 0,
            paymentStatus: 'paid',
            orderStatus: 'Pending',
            status: 'Pending',
            paymentMethod: 'PhonePe',
            phonepeTransactionId: session.phonepeTransactionId,
            paidAt: new Date(),
            phonepeResponse: session.phonepeResponse || {},
            stockConfirmed: false,
            metadata: {
              checkoutSessionId: session.sessionId,
              source: 'recovery_script',
              correlationId: `recovery_${Date.now()}`,
              recoveredAt: new Date()
            }
          };
          console.log('   ✅ Using orderData fallback for order creation');
        } else {
          console.log('   ❌ Cannot recover - no order data available');
          continue;
        }
        
        // Set payment status
        orderData.paymentStatus = 'paid';
        orderData.orderStatus = 'Pending';
        orderData.status = 'Pending';
        orderData.paidAt = new Date();
        orderData.phonepeResponse = session.phonepeResponse || {};
        orderData.stockConfirmed = false;
        
        // Create the order
        const order = await orderModel.create([orderData]);
        const createdOrder = order[0];
        
        console.log(`   ✅ Order created successfully: ${createdOrder.orderId}`);
        
        // Update payment session with order ID
        await PaymentSession.findByIdAndUpdate(session._id, {
          orderId: createdOrder._id,
          updatedAt: new Date()
        });
        
        console.log(`   ✅ Payment session updated with order ID`);
        
        // Try to confirm stock if checkout session exists
        try {
          const checkoutSession = await CheckoutSession.findOne({
            sessionId: session.sessionId
          });
          
          if (checkoutSession && checkoutSession.stockReserved) {
            console.log('   📦 Attempting to confirm stock...');
            
            // Import stock utils
            const { confirmStockReservation } = await import('./backend/utils/stock.js');
            
            let stockConfirmed = true;
            for (const item of checkoutSession.items) {
              const confirmed = await confirmStockReservation(
                item.productId,
                item.size,
                item.quantity
              );
              
              if (!confirmed) {
                console.log(`   ⚠️  Failed to confirm stock for ${item.name} (${item.size})`);
                stockConfirmed = false;
              } else {
                console.log(`   ✅ Stock confirmed for ${item.name} (${item.size}) x${item.quantity}`);
              }
            }
            
            if (stockConfirmed) {
              await orderModel.findByIdAndUpdate(createdOrder._id, {
                stockConfirmed: true,
                stockConfirmedAt: new Date()
              });
              console.log('   ✅ Stock confirmed for order');
            } else {
              console.log('   ⚠️  Some stock items could not be confirmed');
            }
          } else {
            console.log('   ⚠️  No checkout session found or stock not reserved');
          }
        } catch (stockError) {
          console.log(`   ⚠️  Stock confirmation failed: ${stockError.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to create order: ${error.message}`);
        console.log(`   Error details:`, error);
      }
    }
    
    console.log('\n✅ Order recovery process completed!');
    
    // Final verification
    const finalSuccessfulSessions = await PaymentSession.find({ status: 'success' });
    const finalOrders = await orderModel.find({ paymentStatus: 'paid' });
    
    console.log(`\n📊 Final counts:`);
    console.log(`   Successful payment sessions: ${finalSuccessfulSessions.length}`);
    console.log(`   Paid orders: ${finalOrders.length}`);
    
    const stillMissing = [];
    for (const session of finalSuccessfulSessions) {
      const order = await orderModel.findOne({
        phonepeTransactionId: session.phonepeTransactionId
      });
      if (!order) {
        stillMissing.push(session);
      }
    }
    
    if (stillMissing.length > 0) {
      console.log(`\n⚠️  Still missing ${stillMissing.length} orders that could not be recovered:`);
      stillMissing.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.phonepeTransactionId} - ${session.userEmail}`);
      });
    } else {
      console.log('\n🎉 All successful payments now have corresponding orders!');
    }
    
  } catch (error) {
    console.error('❌ Recovery error:', error);
  }
};

const main = async () => {
  await connectDB();
  await recoverMissingOrders();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
};

main().catch(console.error);
