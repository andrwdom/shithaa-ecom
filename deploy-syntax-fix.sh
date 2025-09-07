#!/bin/bash

echo "🚀 Deploying syntax fix to server..."

# Copy the fixed file to the server
scp frontend/app/product/[productId]/ProductPageClient.tsx root@srv900106:/var/www/shithaa-ecom/frontend/app/product/[productId]/ProductPageClient.tsx

echo "✅ File deployed to server!"

# Run the build on the server
ssh root@srv900106 "cd /var/www/shithaa-ecom && npm run build"

echo "🎉 Build completed on server!"
