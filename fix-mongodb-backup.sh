#!/bin/bash

# Fix MongoDB Backup Script
# Handles the long database name issue

echo "🔧 FIXING MONGODB BACKUP"
echo "========================"

# Get the current MongoDB URI
MONGODB_URI=$(grep "^MONGODB_URI=" /var/www/shithaa-ecom/backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

echo "Current MongoDB URI: ${MONGODB_URI:0:50}..."

# Extract components from the URI
# Format: mongodb://username:password@host:port/database?authSource=authDatabase
if [[ $MONGODB_URI =~ mongodb://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+)\?authSource=([^&]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    PASSWORD="${BASH_REMATCH[2]}"
    HOST="${BASH_REMATCH[3]}"
    PORT="${BASH_REMATCH[4]}"
    DATABASE="${BASH_REMATCH[5]}"
    AUTH_SOURCE="${BASH_REMATCH[6]}"
    
    echo "Extracted components:"
    echo "  Username: $USERNAME"
    echo "  Host: $HOST"
    echo "  Port: $PORT"
    echo "  Database: $DATABASE"
    echo "  Auth Source: $AUTH_SOURCE"
    
    # Create a shorter database name for backup
    SHORT_DB_NAME="shitha_backup_$(date +%Y%m%d_%H%M)"
    echo "  Short DB Name: $SHORT_DB_NAME"
    
    # Create backup directory
    BACKUP_DIR="/var/backups/shithaa/$(date +%F_%H%M)"
    mkdir -p "$BACKUP_DIR/mongodb"
    
    echo ""
    echo "📊 Starting MongoDB backup with corrected URI..."
    
    # Try different approaches
    echo "Attempt 1: Using host:port format..."
    mongodump --host="$HOST:$PORT" --username="$USERNAME" --password="$PASSWORD" --authenticationDatabase="$AUTH_SOURCE" --db="$DATABASE" --out="$BACKUP_DIR/mongodb/"
    
    if [ $? -eq 0 ]; then
        echo "✅ MongoDB backup completed successfully!"
        echo "   Location: $BACKUP_DIR/mongodb/"
        echo "   Size: $(du -sh $BACKUP_DIR/mongodb/ | cut -f1)"
    else
        echo "❌ Attempt 1 failed. Trying alternative approach..."
        
        echo "Attempt 2: Using connection string without database name..."
        # Create a shorter URI without the long database name
        SHORT_URI="mongodb://$USERNAME:$PASSWORD@$HOST:$PORT/$AUTH_SOURCE"
        echo "Short URI: ${SHORT_URI:0:50}..."
        
        mongodump --uri="$SHORT_URI" --db="$DATABASE" --out="$BACKUP_DIR/mongodb/"
        
        if [ $? -eq 0 ]; then
            echo "✅ MongoDB backup completed successfully!"
            echo "   Location: $BACKUP_DIR/mongodb/"
            echo "   Size: $(du -sh $BACKUP_DIR/mongodb/ | cut -f1)"
        else
            echo "❌ Attempt 2 failed. Trying manual approach..."
            
            echo "Attempt 3: Using mongoexport for individual collections..."
            # Get list of collections
            COLLECTIONS=$(mongo "$SHORT_URI" --eval "db.getCollectionNames()" --quiet | tr -d '[]' | tr ',' '\n' | tr -d ' "' | grep -v '^$')
            
            if [ -n "$COLLECTIONS" ]; then
                echo "Found collections: $COLLECTIONS"
                
                for collection in $COLLECTIONS; do
                    echo "Exporting collection: $collection"
                    mongoexport --uri="$SHORT_URI" --db="$DATABASE" --collection="$collection" --out="$BACKUP_DIR/mongodb/${DATABASE}/${collection}.json"
                done
                
                echo "✅ Collections exported successfully!"
                echo "   Location: $BACKUP_DIR/mongodb/"
                echo "   Size: $(du -sh $BACKUP_DIR/mongodb/ | cut -f1)"
            else
                echo "❌ Could not retrieve collection names"
                echo "   Manual backup required"
            fi
        fi
    fi
    
else
    echo "❌ Could not parse MongoDB URI"
    echo "   URI format: $MONGODB_URI"
    echo "   Please check the .env file"
fi

echo ""
echo "📦 Creating code backup as well..."
CODE_BACKUP="/var/backups/shithaa/code_snapshot_$(date +%F_%H%M).tar.gz"
tar czf "$CODE_BACKUP" -C /var/www shithaa-ecom/

if [ $? -eq 0 ]; then
    echo "✅ Code backup completed successfully!"
    echo "   Location: $CODE_BACKUP"
    echo "   Size: $(du -sh $CODE_BACKUP | cut -f1)"
else
    echo "❌ Code backup failed!"
fi

echo ""
echo "🎉 BACKUP PROCESS COMPLETED!"
echo "============================"
echo "📁 Backup Directory: $BACKUP_DIR"
echo "📦 Code Snapshot: $CODE_BACKUP"
echo "💾 Total Size: $(du -sh $BACKUP_DIR | cut -f1)"
echo ""
echo "✅ You can now proceed with critical fixes safely!"
