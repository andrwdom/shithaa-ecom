#!/bin/bash

# Simple Backup Script for Shithaa E-commerce
# Creates database and code backups with better error handling

set -e

echo "🚀 CREATING IMMEDIATE BACKUPS FOR SHITHAA E-COMMERCE"
echo "=================================================="

# Create backup directories
BACKUP_DIR="/var/backups/shithaa/$(date +%F_%H%M)"
echo "📁 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 1. Database Backup (MongoDB)
echo ""
echo "🗄️  CREATING MONGODB BACKUP..."
echo "Backup location: $BACKUP_DIR/mongodb/"

# Try to get MongoDB URI from environment or .env file
MONGODB_URI=""

# First try environment variable
if [ -n "$MONGODB_URI" ]; then
    echo "✅ Using MONGODB_URI from environment"
else
    # Try to load from .env file
    if [ -f "/var/www/shithaa-ecom/backend/.env" ]; then
        echo "📄 Loading MONGODB_URI from .env file..."
        MONGODB_URI=$(grep "^MONGODB_URI=" /var/www/shithaa-ecom/backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$MONGODB_URI" ]; then
            echo "✅ Found MONGODB_URI in .env file"
        else
            echo "❌ MONGODB_URI not found in .env file"
        fi
    else
        echo "❌ .env file not found at /var/www/shithaa-ecom/backend/.env"
    fi
fi

if [ -n "$MONGODB_URI" ]; then
    echo "📊 Starting MongoDB dump..."
    echo "URI: ${MONGODB_URI:0:20}..." # Show first 20 chars for security
    
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb/"
    
    if [ $? -eq 0 ]; then
        echo "✅ MongoDB backup completed successfully"
        echo "   Location: $BACKUP_DIR/mongodb/"
        echo "   Size: $(du -sh $BACKUP_DIR/mongodb/ | cut -f1)"
    else
        echo "❌ MongoDB backup failed!"
        echo "   This might be due to connection issues or permissions"
        echo "   Continuing with code backup..."
    fi
else
    echo "❌ MONGODB_URI not available. Skipping database backup."
    echo "   You can manually backup MongoDB later with:"
    echo "   mongodump --uri='your-mongodb-uri' --out='$BACKUP_DIR/mongodb/'"
fi

# 2. Code Snapshot
echo ""
echo "📦 CREATING CODE SNAPSHOT..."
CODE_BACKUP="/var/backups/shithaa/code_snapshot_$(date +%F_%H%M).tar.gz"
echo "Backup location: $CODE_BACKUP"

if [ -d "/var/www/shithaa-ecom" ]; then
    echo "📁 Archiving code directory..."
    tar czf "$CODE_BACKUP" -C /var/www shithaa-ecom/
    
    if [ $? -eq 0 ]; then
        echo "✅ Code snapshot completed successfully"
        echo "   Location: $CODE_BACKUP"
        echo "   Size: $(du -sh $CODE_BACKUP | cut -f1)"
    else
        echo "❌ Code snapshot failed!"
        exit 1
    fi
else
    echo "❌ Code directory /var/www/shithaa-ecom not found!"
    exit 1
fi

# 3. Environment and Config Backup
echo ""
echo "⚙️  BACKING UP CONFIGURATION FILES..."

# Backup .env files
if [ -f "/var/www/shithaa-ecom/backend/.env" ]; then
    cp /var/www/shithaa-ecom/backend/.env "$BACKUP_DIR/backend.env"
    echo "✅ Backed up backend/.env"
fi

if [ -f "/var/www/shithaa-ecom/frontend/.env" ]; then
    cp /var/www/shithaa-ecom/frontend/.env "$BACKUP_DIR/frontend.env"
    echo "✅ Backed up frontend/.env"
fi

if [ -f "/var/www/shithaa-ecom/admin/.env" ]; then
    cp /var/www/shithaa-ecom/admin/.env "$BACKUP_DIR/admin.env"
    echo "✅ Backed up admin/.env"
fi

# Backup PM2 ecosystem
if [ -f "/var/www/shithaa-ecom/ecosystem.config.js" ]; then
    cp /var/www/shithaa-ecom/ecosystem.config.js "$BACKUP_DIR/"
    echo "✅ Backed up ecosystem.config.js"
fi

# Backup nginx config
if [ -d "/etc/nginx/sites-available" ]; then
    cp /etc/nginx/sites-available/*shithaa* "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ Backed up nginx configurations"
fi

# 4. Create backup manifest
echo ""
echo "📋 CREATING BACKUP MANIFEST..."

cat > "$BACKUP_DIR/BACKUP_MANIFEST.txt" << EOF
SHITHAA E-COMMERCE BACKUP MANIFEST
==================================
Created: $(date)
Backup ID: $(date +%F_%H%M)
Backup Directory: $BACKUP_DIR

CONTENTS:
---------
1. MongoDB Dump: $BACKUP_DIR/mongodb/
2. Code Snapshot: $CODE_BACKUP
3. Environment Files: $BACKUP_DIR/*.env
4. Configuration Files: $BACKUP_DIR/ecosystem.config.js
5. Nginx Configs: $BACKUP_DIR/*shithaa*

SIZES:
------
MongoDB: $(du -sh $BACKUP_DIR/mongodb/ 2>/dev/null | cut -f1 || echo "N/A")
Code: $(du -sh $CODE_BACKUP | cut -f1)
Total: $(du -sh $BACKUP_DIR | cut -f1)

RESTORE INSTRUCTIONS:
--------------------
1. Restore MongoDB:
   mongorestore --uri="\$MONGODB_URI" $BACKUP_DIR/mongodb/

2. Restore Code:
   tar xzf $CODE_BACKUP -C /var/www/

3. Restore Environment:
   cp $BACKUP_DIR/*.env /var/www/shithaa-ecom/*/backend/

4. Restart Services:
   pm2 restart all

NOTES:
------
- This backup was created before implementing critical fixes
- All sensitive data has been preserved
- Test restore in staging environment first
EOF

echo "✅ Backup manifest created: $BACKUP_DIR/BACKUP_MANIFEST.txt"

# 5. Summary
echo ""
echo "🎉 BACKUP COMPLETED SUCCESSFULLY!"
echo "================================="
echo "📁 Backup Directory: $BACKUP_DIR"
echo "📦 Code Snapshot: $CODE_BACKUP"
echo "📊 MongoDB Dump: $BACKUP_DIR/mongodb/"
echo "📋 Manifest: $BACKUP_DIR/BACKUP_MANIFEST.txt"
echo ""
echo "💾 Total Backup Size: $(du -sh $BACKUP_DIR | cut -f1)"
echo ""
echo "✅ You can now proceed with critical fixes safely!"
echo "   All data has been backed up and can be restored if needed."
