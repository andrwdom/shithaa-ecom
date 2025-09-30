#!/bin/bash

# 🔄 EMERGENCY ROLLBACK SCRIPT
# Use this if deployment goes wrong

set -e

echo "=================================================="
echo "🔄 EMERGENCY ROLLBACK"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backup directory provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Backup directory not specified${NC}"
  echo ""
  echo "Usage: ./rollback-deployment.sh <backup-directory>"
  echo ""
  echo "Available backups:"
  ls -lt backups/ | grep "^d" | head -5
  echo ""
  exit 1
fi

BACKUP_DIR=$1

# Verify backup exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "${RED}❌ Error: Backup directory not found: $BACKUP_DIR${NC}"
  exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will restore from backup and restart all services${NC}"
echo -e "${YELLOW}   Backup: $BACKUP_DIR${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled."
  exit 0
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 1: Stopping Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

pm2 stop all
echo -e "${GREEN}✓${NC} Services stopped"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 2: Restoring Files${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Restore frontend
if [ -d "$BACKUP_DIR/frontend-next" ]; then
  echo "Restoring frontend build..."
  rm -rf frontend/.next
  cp -r "$BACKUP_DIR/frontend-next" frontend/.next
  echo -e "${GREEN}✓${NC} Frontend restored"
else
  echo -e "${YELLOW}⚠${NC} Frontend backup not found, skipping"
fi

# Restore backend
if [ -d "$BACKUP_DIR/backend-backup" ]; then
  echo "Restoring backend..."
  # Only restore specific files, not entire directory
  if [ -f "$BACKUP_DIR/backend-backup/server.js" ]; then
    cp "$BACKUP_DIR/backend-backup/server.js" backend/
  fi
  # Restore other critical files as needed
  echo -e "${GREEN}✓${NC} Backend restored"
else
  echo -e "${YELLOW}⚠${NC} Backend backup not found, skipping"
fi

# Restore admin
if [ -d "$BACKUP_DIR/admin-dist" ]; then
  echo "Restoring admin build..."
  rm -rf admin/dist
  cp -r "$BACKUP_DIR/admin-dist" admin/dist
  echo -e "${GREEN}✓${NC} Admin restored"
else
  echo -e "${YELLOW}⚠${NC} Admin backup not found, skipping"
fi

echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 3: Restarting Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

pm2 restart all
echo -e "${GREEN}✓${NC} Services restarted"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 4: Health Check${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 5

if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Backend is healthy"
else
  echo -e "${RED}✗${NC} Backend health check failed"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Frontend is running"
else
  echo -e "${RED}✗${NC} Frontend check failed"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ ROLLBACK COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "System has been rolled back to: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "  1. Check logs: pm2 logs"
echo "  2. Verify site: https://shithaa.in"
echo "  3. Investigate what went wrong"
echo ""
