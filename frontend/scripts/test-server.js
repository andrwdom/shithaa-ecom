const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

async function testServer() {
  console.log('Testing Backend Server...')
  console.log('API Base:', API_BASE)
  
  try {
    // Test basic connectivity
    console.log('\n1. Testing basic connectivity...')
    const response = await fetch(`${API_BASE}/api/cors-test`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Server is running:', data.message)
    } else {
      console.log('❌ Server responded with status:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Server connection failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Tip: Make sure the backend server is running on port 4000')
      console.log('   Run: cd backend && npm start')
    }
  }
}

// Run the test
testServer().catch(console.error) 