#!/bin/bash

echo "🚀 Starting deployment preparation..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend built successfully"
cd ..

# Check if .next directory exists
if [ ! -d "frontend/.next" ]; then
    echo "❌ .next directory not found after build!"
    exit 1
fi

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy this code to your VPS"
echo "2. SSH into your VPS"
echo "3. Navigate to your project directory"
echo "4. Run: pm2 restart all"
echo ""
echo "🔧 Fixed issues:"
echo "- Backend import error (updateProductStock now exported)"
echo "- Frontend build completed successfully"
echo "- PM2 ecosystem config updated"
echo "- Log file paths corrected" 