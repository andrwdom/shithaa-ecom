#!/bin/bash

# CRITICAL FIX DEPLOYMENT SCRIPT
# This script applies all the stock management fixes
# Run this in your backend directory

set -e  # Exit on any error

echo "=================================================="
echo "🔧 APPLYING STOCK MANAGEMENT CRITICAL FIXES"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from your backend root directory"
    exit 1
fi

echo -e "${YELLOW}⚠️  IMPORTANT: This script will modify your code${NC}"
echo "Make sure you have:"
echo "  1. ✅ Committed all existing changes"
echo "  2. ✅ Created a backup branch"
echo "  3. ✅ Tested in a staging environment first"
echo ""
read -p "Continue with deployment? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "=================================================="
echo "Step 1: Creating Backup"
echo "=================================================="

# Create backup directory
BACKUP_DIR="backups/stock-fixes-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up files to $BACKUP_DIR..."

# Backup files that will be modified
cp backend/utils/atomicStockOperations.js "$BACKUP_DIR/" 2>/dev/null || true
cp backend/utils/transactionManager.js "$BACKUP_DIR/" 2>/dev/null || true
cp backend/services/orderCommit.js "$BACKUP_DIR/" 2>/dev/null || true

echo -e "${GREEN}✅ Backup complete${NC}"

echo ""
echo "=================================================="
echo "Step 2: Applying FIX #1 - Atomic Reserve Stock"
echo "=================================================="

# The fix needs to be applied manually as it requires careful integration
echo "⚠️  Manual step required:"
echo ""
echo "1. Open: backend/utils/atomicStockOperations.js"
echo "2. Replace lines 27-96 (reserveStockAtomic function)"
echo "3. Use code from: FIXES/fix-1-atomic-reserve-stock.js"
echo ""
echo "Key change: Use single atomic updateOne with \$expr condition"
echo ""
read -p "Press Enter when you've applied FIX #1..."

echo ""
echo "=================================================="
echo "Step 3: Applying FIX #2 - Fix reserveSingleSizeAtomic"
echo "=================================================="

echo "⚠️  Manual step required:"
echo ""
echo "1. Open: backend/utils/atomicStockOperations.js"
echo "2. Replace lines 416-440 (reserveSingleSizeAtomic function)"
echo "3. Use code from: FIXES/fix-1-atomic-reserve-stock.js (bottom function)"
echo ""
echo "Key change: Use arrayFilters instead of positional operator"
echo ""
read -p "Press Enter when you've applied FIX #2..."

echo ""
echo "=================================================="
echo "Step 4: Applying FIX #3 - Add Validation"
echo "=================================================="

echo "⚠️  Manual step required:"
echo ""
echo "1. Open: backend/utils/atomicStockOperations.js"
echo "2. Replace lines 108-156 (confirmStockReservationAtomic function)"
echo "3. Use code from: FIXES/fix-3-confirm-with-validation.js"
echo ""
echo "Key change: Add reserved >= quantity check"
echo ""
read -p "Press Enter when you've applied FIX #3..."

echo ""
echo "=================================================="
echo "Step 5: Applying FIX #4 - Increase Timeout"
echo "=================================================="

echo "✏️  Updating transaction timeout..."

# Update timeout in transactionManager.js
if [ -f "backend/utils/transactionManager.js" ]; then
    sed -i.bak 's/timeout: 30000/timeout: 60000  \/\/ 🔧 Increased from 30s to 60s for large orders/' backend/utils/transactionManager.js
    echo -e "${GREEN}✅ Transaction timeout increased to 60s${NC}"
else
    echo -e "${YELLOW}⚠️  File not found: backend/utils/transactionManager.js${NC}"
    echo "Please manually update timeout from 30000 to 60000"
fi

echo ""
echo "=================================================="
echo "Step 6: Running Tests"
echo "=================================================="

echo "🧪 Running concurrent reservation test..."
echo ""

if [ -f "FIXES/test-concurrent-reservations.js" ]; then
    read -p "Run tests now? (yes/no): " run_tests
    
    if [ "$run_tests" = "yes" ]; then
        echo "Running tests..."
        node FIXES/test-concurrent-reservations.js
        
        echo ""
        echo "Review test results above."
        read -p "Did all tests pass? (yes/no): " tests_passed
        
        if [ "$tests_passed" != "yes" ]; then
            echo -e "${RED}❌ Tests failed. Please review the fixes.${NC}"
            echo "Backup files are available in: $BACKUP_DIR"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping tests. Remember to run them manually!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Test file not found${NC}"
    echo "Please run: node FIXES/test-concurrent-reservations.js"
fi

echo ""
echo "=================================================="
echo "Step 7: Verification Checklist"
echo "=================================================="

echo ""
echo "Please verify the following:"
echo ""
echo "  [ ] Code changes have been applied correctly"
echo "  [ ] All tests pass"
echo "  [ ] No syntax errors in modified files"
echo "  [ ] Backup created successfully"
echo ""

read -p "All checks passed? (yes/no): " verification

if [ "$verification" != "yes" ]; then
    echo -e "${YELLOW}⚠️  Please complete verification before deploying${NC}"
    exit 0
fi

echo ""
echo "=================================================="
echo "✅ FIXES APPLIED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Commit changes:"
echo "   git add -A"
echo "   git commit -m 'fix: Apply critical stock management fixes'"
echo ""
echo "2. Deploy to staging:"
echo "   git push origin staging"
echo ""
echo "3. Monitor for 24-48 hours"
echo ""
echo "4. Deploy to production:"
echo "   git push origin main"
echo ""
echo "=================================================="
echo ""
echo "📊 Post-Deployment Monitoring:"
echo ""
echo "1. Check for overselling:"
echo "   mongo your-db --eval 'db.products.find({\"sizes.stock\": {\$lt: 0}}).count()'"
echo ""
echo "2. Check for stuck reservations:"
echo "   mongo your-db --eval 'db.products.find({\"sizes.reserved\": {\$gt: 100}}).count()'"
echo ""
echo "3. Monitor logs for:"
echo "   - STOCK:RESERVE:ATOMIC:FAILED"
echo "   - STOCK:CONFIRM:ATOMIC:FAILED"
echo ""
echo "=================================================="
echo ""
echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""

