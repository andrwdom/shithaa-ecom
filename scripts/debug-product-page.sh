#!/bin/bash

# Debug script for product page server components error
echo "🔍 Debugging Product Page Server Components Error"
echo "================================================="

PRODUCT_ID="687fb48c50f181c782d8207d"
FRONTEND_DIR="/var/www/shithaa-ecom/frontend"

echo "1. Testing API connectivity from server..."
echo "Backend API test:"
curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
     -H "Content-Type: application/json" \
     "http://localhost:4000/api/products/$PRODUCT_ID" | head -20

echo ""
echo "2. Testing from external (what browser sees):"
curl -s -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
     -H "Content-Type: application/json" \
     "https://shithaa.in/api/products/$PRODUCT_ID" | head -20

echo ""
echo "3. Checking frontend logs..."
if command -v pm2 &> /dev/null; then
    echo "PM2 frontend logs (last 20 lines):"
    pm2 logs shitha-frontend --lines 20 --nostream
else
    echo "PM2 not found, checking system logs..."
fi

echo ""
echo "4. Testing Next.js server-side rendering..."
cd $FRONTEND_DIR
if [ -f ".next/server/app/product/[productId]/page.js" ]; then
    echo "✅ Product page server component exists"
else
    echo "❌ Product page server component not found"
    echo "Available pages:"
    find .next/server/app -name "*.js" | head -10
fi

echo ""
echo "5. Testing environment variables..."
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-not set}"

echo ""
echo "6. Testing server-side API call simulation..."
echo "Simulating server-side API call..."

# Create a test script to simulate server-side rendering
cat > /tmp/test-ssr.js << 'EOF'
const fetch = require('node-fetch');

async function testServerSideCall() {
    try {
        console.log('Testing server-side API call...');
        const response = await fetch('http://localhost:4000/api/products/687fb48c50f181c782d8207d', {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Shithaa-Server/1.0'
            },
            timeout: 5000
        });
        
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('Data received:', !!data);
            console.log('Product found:', !!(data.data || data.product));
        } else {
            console.log('Response not OK');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testServerSideCall();
EOF

if command -v node &> /dev/null; then
    node /tmp/test-ssr.js
    rm /tmp/test-ssr.js
else
    echo "Node.js not found"
fi

echo ""
echo "7. Checking Next.js build status..."
if [ -f "$FRONTEND_DIR/.next/BUILD_ID" ]; then
    echo "✅ Next.js build exists"
    echo "Build ID: $(cat $FRONTEND_DIR/.next/BUILD_ID)"
    echo "Build time: $(stat -c %y $FRONTEND_DIR/.next/BUILD_ID)"
else
    echo "❌ Next.js build not found"
fi

echo ""
echo "🔧 Recommended Actions:"
echo "======================"
echo "1. Check frontend PM2 logs: pm2 logs shitha-frontend"
echo "2. Rebuild frontend: cd $FRONTEND_DIR && npm run build"
echo "3. Restart frontend: pm2 restart shitha-frontend"
echo "4. Check Nginx error logs: sudo tail -f /var/log/nginx/error.log"
