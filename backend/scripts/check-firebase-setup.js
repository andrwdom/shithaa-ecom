import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔧 Firebase Setup Check');
console.log('========================');

// Check environment variables
const firebasePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = process.env.FIREBASE_PROJECT_ID;
const nodeEnv = process.env.NODE_ENV;

console.log(`NODE_ENV: ${nodeEnv}`);
console.log(`FIREBASE_PROJECT_ID: ${projectId || 'NOT SET'}`);
console.log(`GOOGLE_APPLICATION_CREDENTIALS: ${firebasePath || 'NOT SET'}`);

if (firebasePath) {
  console.log(`\n🔍 Checking Firebase credentials file...`);
  
  if (existsSync(firebasePath)) {
    console.log(`✅ Firebase credentials file exists: ${firebasePath}`);
  } else {
    console.log(`❌ Firebase credentials file NOT found: ${firebasePath}`);
    console.log(`\n📋 To fix this issue:`);
    console.log(`1. Download your Firebase service account key from Firebase Console`);
    console.log(`2. Place it at: ${firebasePath}`);
    console.log(`3. Ensure the file has proper permissions (readable by Node.js)`);
    console.log(`4. Restart your server`);
  }
} else {
  console.log(`\n⚠️  GOOGLE_APPLICATION_CREDENTIALS not set`);
  console.log(`\n📋 To set up Firebase:`);
  console.log(`1. Go to Firebase Console > Project Settings > Service Accounts`);
  console.log(`2. Generate new private key (JSON file)`);
  console.log(`3. Add to your .env file:`);
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json`);
  console.log(`4. Restart your server`);
}

if (nodeEnv === 'development' && !firebasePath) {
  console.log(`\n💡 Development Mode: You can run without Firebase credentials`);
  console.log(`   The server will initialize with project ID only`);
}

console.log(`\n📚 For more information, see:`);
console.log(`   https://firebase.google.com/docs/admin/setup#initialize-sdk`);
