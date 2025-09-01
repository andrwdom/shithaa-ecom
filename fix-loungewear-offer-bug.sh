#!/bin/bash

echo "🔧 Fixing loungewear offer bug..."

# Navigate to project directory
cd /d/Productivity/Client\ Sites/Shitha-v3/shithaa-ecom-V3

# Restart the server to apply the fix
echo "🔄 Restarting server..."
pm2 restart shithaa

echo "✅ Server restarted with loungewear offer fix"
echo "🔍 Check the logs to see the debug output:"
echo "   pm2 logs shithaa --lines 20"
