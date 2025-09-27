import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentMonitor from '../utils/paymentMonitor.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const startMonitoring = async () => {
  try {
    console.log('🔍 STARTING REAL-TIME PAYMENT MONITORING\n');
    
    // Check for missing orders immediately
    console.log('Checking for missing orders...');
    const missingOrders = await PaymentMonitor.checkForMissingOrders();
    
    if (missingOrders.length > 0) {
      console.log(`\n🚨 FOUND ${missingOrders.length} MISSING ORDERS!`);
      missingOrders.forEach((session, index) => {
        console.log(`\n${index + 1}. Missing Order:`);
        console.log(`   Session ID: ${session._id}`);
        console.log(`   PhonePe Transaction: ${session.phonepeTransactionId}`);
        console.log(`   User Email: ${session.userEmail}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Has orderPayload: ${!!session.orderPayload}`);
        console.log(`   Status: ${session.status}`);
      });
    } else {
      console.log('✅ No missing orders found');
    }
    
    // Check payment flow health
    console.log('\nChecking payment flow health...');
    const health = await PaymentMonitor.monitorPaymentFlowHealth();
    
    console.log('\n📊 Payment Flow Health:');
    console.log(`   Recent Sessions (1h): ${health.recentSessions}`);
    console.log(`   Recent Orders (1h): ${health.recentOrders}`);
    console.log(`   Failed Sessions (1h): ${health.failedSessions}`);
    console.log(`   Pending Sessions (1h): ${health.pendingSessions}`);
    
    // Set up continuous monitoring
    console.log('\n🔄 Starting continuous monitoring...');
    console.log('Monitoring every 30 seconds...');
    
    setInterval(async () => {
      try {
        const missingOrders = await PaymentMonitor.checkForMissingOrders();
        const health = await PaymentMonitor.monitorPaymentFlowHealth();
        
        if (missingOrders.length > 0) {
          console.log(`\n🚨 ALERT: ${missingOrders.length} missing orders detected!`);
        }
        
        if (health.failedSessions > 0) {
          console.log(`\n⚠️  WARNING: ${health.failedSessions} failed sessions in the last hour`);
        }
        
        console.log(`\n[${new Date().toLocaleTimeString()}] Health: Sessions: ${health.recentSessions}, Orders: ${health.recentOrders}, Failed: ${health.failedSessions}`);
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
    
  } catch (error) {
    console.error('❌ Monitoring error:', error);
  }
};

const main = async () => {
  await connectDB();
  await startMonitoring();
  
  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping monitoring...');
    await mongoose.connection.close();
    process.exit(0);
  });
};

main().catch(console.error);
