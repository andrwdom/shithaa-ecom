// check-session-status.js
import mongoose from 'mongoose';
import CheckoutSession from '../models/CheckoutSession.js';

// The specific session ID for the abandoned order
const sessionId = '4b20784e-cc96-4b99-9bf4-61f3ac5c7deb';

const checkSessionStatus = async () => {
  try {
    // Connect to the database
    await mongoose.connect('mongodb://localhost:27017/shithaa-ecom', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB.');

    // Find the checkout session
    const session = await CheckoutSession.findOne({ sessionId });

    if (session) {
      console.log(`\n--- Session Found (ID: ${sessionId}) ---`);
      console.log(`Status: ${session.status}`);
      console.log(`Created At: ${session.createdAt.toISOString()}`);
      console.log(`Expires At: ${session.expiresAt.toISOString()}`);
      console.log(`Stock Reserved: ${session.stockReserved}`);
      console.log('-------------------------------------\n');
    } else {
      console.log(`\n--- Session with ID ${sessionId} was not found. ---\n`);
    }
  } catch (error) {
    console.error('\n--- An error occurred ---');
    console.error(error);
    console.log('---------------------------\n');
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

// Run the script
checkSessionStatus();
