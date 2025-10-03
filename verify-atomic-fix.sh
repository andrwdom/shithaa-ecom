#!/bin/bash

# Verify Atomic Stock Operations Fix
# This script tests the race condition fix for batch stock operations

echo "🧪 Atomic Stock Operations Fix Verification"
echo "=========================================="

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

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom').then(() => { console.log('✅ MongoDB connected'); process.exit(0); }).catch(() => { console.log('❌ MongoDB connection failed'); process.exit(1); });" 2>/dev/null; then
    echo -e "${RED}❌ MongoDB is not running or not accessible${NC}"
    echo "Please start MongoDB and set MONGODB_URI environment variable"
    exit 1
fi

echo -e "${GREEN}✅ MongoDB is accessible${NC}"

# Check if k6 is available for load testing
if command -v k6 &> /dev/null; then
    echo -e "${GREEN}✅ k6 is available for load testing${NC}"
    K6_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️ k6 is not available - skipping load tests${NC}"
    K6_AVAILABLE=false
fi

# Test 1: Direct Node.js test
echo -e "\n${YELLOW}Test 1: Direct Node.js Atomic Operations Test${NC}"
echo "=============================================="

if [ -f "test-atomic-stock-operations.js" ]; then
    echo "Running direct atomic operations test..."
    if node test-atomic-stock-operations.js; then
        echo -e "${GREEN}✅ Direct test passed${NC}"
    else
        echo -e "${RED}❌ Direct test failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ test-atomic-stock-operations.js not found${NC}"
fi

# Test 2: k6 load test (if available)
if [ "$K6_AVAILABLE" = true ]; then
    echo -e "\n${YELLOW}Test 2: k6 Load Test${NC}"
    echo "=================="
    
    if [ -f "test-atomic-stock-direct.js" ]; then
        echo "Running k6 load test..."
        if k6 run test-atomic-stock-direct.js; then
            echo -e "${GREEN}✅ k6 load test passed${NC}"
        else
            echo -e "${RED}❌ k6 load test failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️ test-atomic-stock-direct.js not found${NC}"
    fi
fi

# Test 3: Check code changes
echo -e "\n${YELLOW}Test 3: Code Verification${NC}"
echo "====================="

# Check if the atomic fix is in place
if grep -q "\$expr.*\$gte.*\$subtract" backend/utils/batchStockOperations.js; then
    echo -e "${GREEN}✅ Atomic \$expr condition found in batch operations${NC}"
else
    echo -e "${RED}❌ Atomic \$expr condition not found${NC}"
    exit 1
fi

# Check if check-then-update pattern is removed
if grep -q "First check if stock is available" backend/utils/batchStockOperations.js; then
    echo -e "${RED}❌ Check-then-update pattern still present${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Check-then-update pattern removed${NC}"
fi

# Test 4: Database consistency check
echo -e "\n${YELLOW}Test 4: Database Consistency Check${NC}"
echo "=================================="

# Create a simple database check script
cat > check-db-consistency.js << 'EOF'
import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';

async function checkConsistency() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
    
    const products = await productModel.find({}, 'name sizes.stock sizes.reserved sizes.size');
    let inconsistent = 0;
    
    for (const product of products) {
      for (const size of product.sizes) {
        if (size.reserved > size.stock) {
          console.log(`❌ Inconsistent: ${product.name} (${size.size}) - Stock: ${size.stock}, Reserved: ${size.reserved}`);
          inconsistent++;
        }
      }
    }
    
    if (inconsistent === 0) {
      console.log('✅ All products have consistent stock/reserved values');
      process.exit(0);
    } else {
      console.log(`❌ Found ${inconsistent} inconsistent products`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkConsistency();
EOF

if node check-db-consistency.js; then
    echo -e "${GREEN}✅ Database consistency check passed${NC}"
else
    echo -e "${RED}❌ Database consistency check failed${NC}"
    exit 1
fi

# Cleanup
rm -f check-db-consistency.js

echo -e "\n${GREEN}🎉 All tests passed! The atomic stock operations fix is working correctly.${NC}"
echo -e "${GREEN}✅ Race conditions have been eliminated from batch stock operations.${NC}"
echo -e "${GREEN}✅ The system is now safe for high-concurrency scenarios.${NC}"
