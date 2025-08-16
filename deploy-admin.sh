#!/bin/bash

# Admin Panel Deployment Script
echo "🚀 Starting Admin Panel Deployment..."

# Build the admin panel
echo "📦 Building admin panel..."
cd admin
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Admin panel built successfully!"
    
    # Create favicon.ico if it doesn't exist
    if [ ! -f "dist/favicon.ico" ]; then
        echo "🔧 Creating favicon.ico..."
        cp dist/favicon.png dist/favicon.ico
    fi
    
    echo "📁 Build files ready in admin/dist/"
    echo "🌐 Deploy to server:"
    echo "   1. Upload admin/dist/ to /var/www/shithaa-ecom/admin/dist/"
    echo "   2. Restart nginx: sudo systemctl restart nginx"
    echo "   3. Check admin.shithaa.in"
else
    echo "❌ Build failed!"
    exit 1
fi
