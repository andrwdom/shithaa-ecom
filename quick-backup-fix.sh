#!/bin/bash

# Quick Backup Fix for VPS
# Handles the environment variable loading issue

echo "🔧 QUICK BACKUP FIX"
echo "==================="

# Make the simple backup script executable
chmod +x create-backups-simple.sh

# Run the simple backup script
echo "Running simplified backup script..."
./create-backups-simple.sh

echo ""
echo "✅ Backup fix completed!"
echo "If MongoDB backup failed, you can run it manually:"
echo "mongodump --uri='your-mongodb-uri' --out='/var/backups/shithaa/$(date +%F_%H%M)/mongodb/'"
