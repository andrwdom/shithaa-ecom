// Usage: npx ts-node --transpile-only scripts/printUser.js user@example.com
import mongoose from 'mongoose';
import userModel from '../backend/models/userModel.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node printUser.js <email>');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shitha';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await userModel.findOne({ email });
    if (!user) {
      console.log('User not found');
    } else {
      console.log('User:', user);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main(); 