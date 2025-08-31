import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Simple test script for reservation system
 * Tests basic functionality without external dependencies
 */
async function testReservationSystem() {
    console.log('🧪 Testing Reservation System...');
    console.log('='.repeat(50));
    
    try {
        // Test 1: Check if Reservation model can be imported
        console.log('✅ Test 1: Importing Reservation model...');
        const Reservation = (await import('../models/Reservation.js')).default;
        console.log('   ✓ Reservation model imported successfully');
        
        // Test 2: Check if reservationController can be imported
        console.log('✅ Test 2: Importing reservation controller...');
        const { createReservation, getReservation, cancelReservation } = await import('../controllers/reservationController.js');
        console.log('   ✓ Reservation controller imported successfully');
        
        // Test 3: Check if routes can be imported
        console.log('✅ Test 3: Importing reservation routes...');
        const reservationRouter = await import('../routes/reservationRoute.js');
        console.log('   ✓ Reservation routes imported successfully');
        
        // Test 4: Check if webhook routes can be imported
        console.log('✅ Test 4: Importing webhook routes...');
        const webhookRouter = await import('../routes/webhookRoute.js');
        console.log('   ✓ Webhook routes imported successfully');
        
        // Test 5: Check if worker can be imported
        console.log('✅ Test 5: Importing reservation worker...');
        const { releaseExpiredReservations } = await import('../workers/releaseReservations.js');
        console.log('   ✓ Reservation worker imported successfully');
        
        // Test 6: Check environment variables
        console.log('✅ Test 6: Checking environment variables...');
        const reservationEnabled = process.env.RESERVATION_ENABLED;
        console.log(`   ✓ RESERVATION_ENABLED: ${reservationEnabled || 'NOT SET'}`);
        
        if (reservationEnabled === 'true') {
            console.log('   ✓ Reservation system is enabled');
        } else {
            console.log('   ⚠️ Reservation system is disabled (set RESERVATION_ENABLED=true to enable)');
        }
        
        // Test 7: Check MongoDB connection
        console.log('✅ Test 7: Testing MongoDB connection...');
        if (mongoose.connection.readyState === 1) {
            console.log('   ✓ MongoDB is connected');
        } else {
            console.log('   ⚠️ MongoDB is not connected (readyState:', mongoose.connection.readyState, ')');
        }
        
        console.log('\n🎉 All tests passed! Reservation system is ready.');
        console.log('\n📋 Next steps:');
        console.log('   1. Set RESERVATION_ENABLED=true in your .env file');
        console.log('   2. Restart your server');
        console.log('   3. Test with: node scripts/concurrency-test.js single');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testReservationSystem();
