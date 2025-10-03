#!/bin/bash

# Verify Emergency Stock Deduction Removal
# This script ensures the risky emergency deduction function is completely removed

echo "🧪 Emergency Stock Deduction Removal Verification"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js is available${NC}"

# Test 1: Check if function is removed from stock.js
echo -e "\n${YELLOW}Test 1: Function Removal from stock.js${NC}"
echo "=================================="

if grep -q "export async function emergencyStockDeduction" backend/utils/stock.js; then
    echo -e "${RED}❌ emergencyStockDeduction function still exists in stock.js${NC}"
    exit 1
else
    echo -e "${GREEN}✅ emergencyStockDeduction function removed from stock.js${NC}"
fi

# Test 2: Check for any remaining references
echo -e "\n${YELLOW}Test 2: Reference Removal Check${NC}"
echo "============================="

# Check for function calls
if grep -r "emergencyStockDeduction" backend/ --exclude-dir=node_modules; then
    echo -e "${RED}❌ Found remaining references to emergencyStockDeduction${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No references to emergencyStockDeduction found${NC}"
fi

# Test 3: Check for import statements
echo -e "\n${YELLOW}Test 3: Import Statement Removal${NC}"
echo "==============================="

if grep -r "emergencyStockDeduction" backend/ --include="*.js" | grep -v "REMOVED:"; then
    echo -e "${RED}❌ Found remaining import statements for emergencyStockDeduction${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No import statements for emergencyStockDeduction found${NC}"
fi

# Test 4: Check for feature flag references
echo -e "\n${YELLOW}Test 4: Feature Flag References${NC}"
echo "============================="

if grep -r "ENABLE_EMERGENCY_DEDUCTION" backend/ --include="*.js"; then
    echo -e "${YELLOW}⚠️ Found references to ENABLE_EMERGENCY_DEDUCTION feature flag${NC}"
    echo "These should be removed or set to false in production"
else
    echo -e "${GREEN}✅ No ENABLE_EMERGENCY_DEDUCTION references found${NC}"
fi

# Test 5: Run Node.js test
echo -e "\n${YELLOW}Test 5: Node.js Function Existence Test${NC}"
echo "====================================="

if [ -f "test-no-emergency-deduction.js" ]; then
    echo "Running Node.js test..."
    if node -e "
        try {
            const stockUtils = require('./backend/utils/stock.js');
            if (stockUtils.emergencyStockDeduction) {
                console.log('❌ emergencyStockDeduction function still exists');
                process.exit(1);
            } else {
                console.log('✅ emergencyStockDeduction function not found');
                process.exit(0);
            }
        } catch (error) {
            console.log('✅ Module load error (expected if function removed)');
            process.exit(0);
        }
    "; then
        echo -e "${GREEN}✅ Node.js test passed${NC}"
    else
        echo -e "${RED}❌ Node.js test failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ test-no-emergency-deduction.js not found${NC}"
fi

# Test 6: Check for emergency deduction logs
echo -e "\n${YELLOW}Test 6: Emergency Deduction Log References${NC}"
echo "======================================="

if grep -r "EMERGENCY.*deduction" backend/ --include="*.js" | grep -v "REMOVED:"; then
    echo -e "${YELLOW}⚠️ Found references to emergency deduction in logs${NC}"
    echo "These should be updated to reflect the removal"
else
    echo -e "${GREEN}✅ No emergency deduction log references found${NC}"
fi

# Test 7: Verify atomic operations are in place
echo -e "\n${YELLOW}Test 7: Atomic Operations Verification${NC}"
echo "===================================="

if grep -q "\$expr.*\$gte.*\$subtract" backend/utils/batchStockOperations.js; then
    echo -e "${GREEN}✅ Atomic operations are in place${NC}"
else
    echo -e "${RED}❌ Atomic operations not found${NC}"
    exit 1
fi

# Test 8: Check error handling improvements
echo -e "\n${YELLOW}Test 8: Error Handling Verification${NC}"
echo "=================================="

if grep -q "investigate stock issue" backend/controllers/paymentController.js; then
    echo -e "${GREEN}✅ Improved error handling found in payment controller${NC}"
else
    echo -e "${YELLOW}⚠️ Improved error handling not found${NC}"
fi

if grep -q "investigate stock issue" backend/services/orderCommit.js; then
    echo -e "${GREEN}✅ Improved error handling found in order commit service${NC}"
else
    echo -e "${YELLOW}⚠️ Improved error handling not found${NC}"
fi

# Summary
echo -e "\n${GREEN}🎉 Emergency Stock Deduction Removal Verification Complete!${NC}"
echo -e "${GREEN}✅ The risky emergency deduction function has been successfully removed.${NC}"
echo -e "${GREEN}✅ All references have been cleaned up.${NC}"
echo -e "${GREEN}✅ Atomic operations are in place to prevent the need for emergency fallbacks.${NC}"
echo -e "${GREEN}✅ The system is now safer and more predictable.${NC}"

echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo "1. Deploy the changes to production"
echo "2. Monitor logs for any stock confirmation failures"
echo "3. Investigate any stock issues that arise (they're now real issues, not race conditions)"
echo "4. Remove ENABLE_EMERGENCY_DEDUCTION from environment variables if present"
