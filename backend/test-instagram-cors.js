/**
 * Test script for Instagram in-app browser CORS and cookie compatibility
 * Run with: node test-instagram-cors.js
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_URL || 'http://localhost:4000';

// Test different user agents to simulate Instagram in-app browser
const testUserAgents = [
    {
        name: 'Regular Chrome',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        origin: 'https://shithaa.in'
    },
    {
        name: 'Instagram In-App Browser',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 155.0.0.37.107',
        origin: 'https://www.instagram.com'
    },
    {
        name: 'Facebook In-App Browser',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/324.0.0.42.70;]',
        origin: 'https://www.facebook.com'
    },
    {
        name: 'No Origin (Mobile App)',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        origin: null
    }
];

async function testCorsEndpoint(userAgent, origin) {
    console.log(`\n🧪 Testing: ${userAgent.name}`);
    console.log(`   User-Agent: ${userAgent.userAgent.substring(0, 50)}...`);
    console.log(`   Origin: ${origin || 'null'}`);
    
    try {
        const headers = {
            'User-Agent': userAgent.userAgent,
            'Content-Type': 'application/json'
        };
        
        if (origin) {
            headers['Origin'] = origin;
        }
        
        const response = await fetch(`${API_BASE}/api/cors-test`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   ✅ CORS Headers: ${JSON.stringify({
            'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
            'Access-Control-Allow-Credentials': response.headers.get('access-control-allow-credentials')
        })}`);
        console.log(`   ✅ Response: ${JSON.stringify(data, null, 2)}`);
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

async function testLoginEndpoint(userAgent, origin) {
    console.log(`\n🔐 Testing Login: ${userAgent.name}`);
    
    try {
        const headers = {
            'User-Agent': userAgent.userAgent,
            'Content-Type': 'application/json'
        };
        
        if (origin) {
            headers['Origin'] = origin;
        }
        
        const response = await fetch(`${API_BASE}/api/user/login`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'testpassword'
            })
        });
        
        const data = await response.json();
        
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   ✅ Set-Cookie Headers: ${response.headers.get('set-cookie') || 'None'}`);
        console.log(`   ✅ Response: ${JSON.stringify(data, null, 2)}`);
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

async function runTests() {
    console.log('🚀 Starting Instagram CORS and Cookie Compatibility Tests');
    console.log(`📡 Testing against: ${API_BASE}`);
    
    // Test CORS endpoint
    for (const userAgent of testUserAgents) {
        await testCorsEndpoint(userAgent, userAgent.origin);
    }
    
    // Test login endpoint
    for (const userAgent of testUserAgents) {
        await testLoginEndpoint(userAgent, userAgent.origin);
    }
    
    console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
