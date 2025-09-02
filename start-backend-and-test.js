const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server and testing lounge wear offer...\n');

// Start backend server
console.log('1️⃣ Starting backend server...');
const backendProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe'
});

backendProcess.stdout.on('data', (data) => {
  console.log(`Backend: ${data.toString().trim()}`);
});

backendProcess.stderr.on('data', (data) => {
  console.error(`Backend Error: ${data.toString().trim()}`);
});

// Wait for server to start
setTimeout(async () => {
  console.log('\n2️⃣ Testing API endpoint...');
  
  try {
    const response = await fetch('http://localhost:4000/api/cart/calculate-total', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { _id: 'test1', name: 'Navy blue with fish print feeding lounge wear', price: 450, quantity: 1, size: 'L' },
          { _id: 'test2', name: 'Black glitter zipless feeding lounge wear', price: 450, quantity: 1, size: 'XL' },
          { _id: 'test3', name: 'Purple with flower print feeding lounge wear', price: 450, quantity: 1, size: 'XL' }
        ]
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log(`\n🎯 Test Results:`);
        console.log(`Total: ₹${data.data.total}`);
        console.log(`Offer applied: ${data.data.offerApplied}`);
        console.log(`Discount: ₹${data.data.offerDiscount || 0}`);
        
        if (data.data.offerApplied && data.data.offerDiscount > 0) {
          console.log(`\n✅ SUCCESS! Lounge wear offer is working correctly!`);
          console.log(`Expected: ₹51 discount for 3 items @ ₹450 each`);
          console.log(`Actual: ₹${data.data.offerDiscount} discount`);
        } else {
          console.log(`\n❌ ISSUE: Offer is not being applied correctly`);
        }
      } else {
        console.log(`❌ API returned error: ${data.message}`);
      }
    } else {
      console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ API call error: ${error.message}`);
  }
  
  // Clean up
  console.log('\n3️⃣ Stopping backend server...');
  backendProcess.kill();
  process.exit(0);
  
}, 5000); // Wait 5 seconds for server to start

// Handle process exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping backend server...');
  backendProcess.kill();
  process.exit(0);
});
