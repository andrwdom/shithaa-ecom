import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentSession from '../models/paymentSessionModel.js';
import orderModel from '../models/orderModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

dotenv.config();

const recoverOrders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔧 STARTING ORDER RECOVERY\n');
    
    // Find successful payment sessions without orders
    const successfulSessions = await PaymentSession.find({ status: 'success' });
    const missingOrders = [];
    
    for (const session of successfulSessions) {
      const order = await orderModel.findOne({
        phonepeTransactionId: session.phonepeTransactionId
      });
      
      if (!order) {
        missingOrders.push(session);
      }
    }
    
    console.log(`Found ${missingOrders.length} missing orders to recover`);
    
    if (missingOrders.length === 0) {
      console.log('✅ No missing orders found. System is healthy!');
      await mongoose.connection.close();
      return;
    }
    
    let recoveredCount = 0;
    let failedCount = 0;
    
    for (const session of missingOrders) {
      try {
        console.log(`\n🔧 Recovering order for ${session.userEmail}...`);
        console.log(`   PhonePe Transaction: ${session.phonepeTransactionId}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Has orderPayload: ${!!session.orderPayload}`);
        console.log(`   Has orderData: ${!!session.orderData}`);
        
        let orderData;
        
        if (session.orderPayload) {
          // Use orderPayload if available
          orderData = { ...session.orderPayload };
          orderData.paymentStatus = 'paid';
          orderData.orderStatus = 'PENDING';
          orderData.status = 'PENDING';
          orderData.paidAt = new Date();
          orderData.phonepeResponse = session.phonepeResponse || {};
          orderData.stockConfirmed = false;
          
          console.log('   ✅ Using orderPayload for recovery');
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
            orderStatus: 'PENDING',
            status: 'PENDING',
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
          
          console.log('   ✅ Using orderData fallback for recovery');
        } else {
          console.log(`   ❌ Cannot recover - no order data available`);
          failedCount++;
          continue;
        }
        
        // Create the order
        const order = await orderModel.create([orderData]);
        const createdOrder = order[0];
        
        console.log(`   ✅ Order recovered: ${createdOrder.orderId}`);
        
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
            const { confirmStockReservation } = await import('../utils/stock.js');
            
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
        
        recoveredCount++;
        
      } catch (error) {
        console.error(`   ❌ Failed to recover order for ${session.userEmail}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n📊 RECOVERY SUMMARY:`);
    console.log(`   ✅ Successfully recovered: ${recoveredCount} orders`);
    console.log(`   ❌ Failed to recover: ${failedCount} orders`);
    console.log(`   📋 Total processed: ${missingOrders.length} orders`);
    
    if (recoveredCount > 0) {
      console.log(`\n🎉 Order recovery completed successfully!`);
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Recovery error:', error);
  }
};

recoverOrders();
