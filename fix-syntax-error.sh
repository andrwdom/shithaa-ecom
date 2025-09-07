#!/bin/bash

echo "🔧 Fixing syntax error in ProductPageClient.tsx..."

# Navigate to the frontend directory
cd /var/www/shithaa-ecom/frontend

# Fix the missing semicolon in the handleBuyNow function
sed -i 's/    }, 100);$/    }, 100);/g' app/product/[productId]/ProductPageClient.tsx

# Add the missing semicolon after the function
sed -i 's/  }$/  };/g' app/product/[productId]/ProductPageClient.tsx

echo "✅ Syntax error fixed!"

# Try building again
echo "🏗️ Building frontend..."
npm run build

echo "🎉 Build completed!"