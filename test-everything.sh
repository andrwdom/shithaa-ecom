#!/bin/bash

# 🧪 COMPREHENSIVE TESTING SCRIPT
# Tests all critical functionality before showing client

set -e

echo "=================================================="
echo "🧪 COMPREHENSIVE TESTING SUITE"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

# Test result tracker
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    echo "  Error: $3"
    ((FAILED++))
  fi
}

test_warning() {
  echo -e "${YELLOW}⚠ WARNING${NC}: $1"
  echo "  Details: $2"
  ((WARNINGS++))
}

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 1: SERVER HEALTH${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 1: Backend health check
echo "Testing backend health..."
if curl -f -s http://localhost:4000/api/health > /dev/null 2>&1; then
  test_result 0 "Backend is responding"
else
  test_result 1 "Backend health check" "Backend not responding on port 4000"
fi

# Test 2: Frontend check
echo "Testing frontend..."
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
  test_result 0 "Frontend is responding"
else
  test_result 1 "Frontend health check" "Frontend not responding on port 3000"
fi

# Test 3: MongoDB connection
echo "Testing MongoDB..."
if pm2 logs shithaa-backend --lines 20 --nostream 2>/dev/null | grep -q "MongoDB connected successfully"; then
  test_result 0 "MongoDB connection"
else
  test_warning "MongoDB connection" "Could not verify MongoDB connection from logs"
fi

# Test 4: PM2 processes
echo "Testing PM2 processes..."
PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -c "\"status\":\"online\"" || echo "0")
if [ "$PM2_STATUS" -ge 3 ]; then
  test_result 0 "PM2 processes running ($PM2_STATUS online)"
else
  test_result 1 "PM2 processes" "Expected at least 3 processes, found $PM2_STATUS"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 2: API FUNCTIONALITY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 5: Products API
echo "Testing products API..."
PRODUCTS_RESPONSE=$(curl -s http://localhost:4000/api/product/list)
if echo "$PRODUCTS_RESPONSE" | grep -q '"success":true'; then
  PRODUCT_COUNT=$(echo "$PRODUCTS_RESPONSE" | grep -o '"products":\[' | wc -l)
  test_result 0 "Products API returns data"
else
  test_result 1 "Products API" "API did not return success response"
fi

# Test 6: Categories API
echo "Testing categories API..."
CATEGORIES_RESPONSE=$(curl -s http://localhost:4000/api/category/list)
if echo "$CATEGORIES_RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Categories API returns data"
else
  test_result 1 "Categories API" "API did not return success response"
fi

# Test 7: Cart API
echo "Testing cart API..."
CART_RESPONSE=$(curl -s http://localhost:4000/api/cart/health)
if echo "$CART_RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Cart API health check"
else
  test_result 1 "Cart API" "Cart health check failed"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 3: PERFORMANCE${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 8: Response time check
echo "Testing response time..."
START_TIME=$(date +%s%N)
curl -s http://localhost:4000/api/health > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RESPONSE_TIME" -lt 500 ]; then
  test_result 0 "Backend response time (${RESPONSE_TIME}ms)"
elif [ "$RESPONSE_TIME" -lt 1000 ]; then
  test_warning "Backend response time (${RESPONSE_TIME}ms)" "Target is <500ms"
else
  test_result 1 "Backend response time" "${RESPONSE_TIME}ms exceeds 1000ms threshold"
fi

# Test 9: Memory usage
echo "Testing memory usage..."
BACKEND_MEM=$(pm2 jlist 2>/dev/null | grep -A 5 '"name":"shithaa-backend"' | grep '"memory"' | grep -o '[0-9]*' | head -1)
if [ ! -z "$BACKEND_MEM" ]; then
  BACKEND_MEM_MB=$((BACKEND_MEM / 1024 / 1024))
  if [ "$BACKEND_MEM_MB" -lt 500 ]; then
    test_result 0 "Backend memory usage (${BACKEND_MEM_MB}MB)"
  elif [ "$BACKEND_MEM_MB" -lt 800 ]; then
    test_warning "Backend memory usage (${BACKEND_MEM_MB}MB)" "Approaching 1GB limit"
  else
    test_result 1 "Backend memory usage" "${BACKEND_MEM_MB}MB exceeds 800MB threshold"
  fi
else
  test_warning "Backend memory usage" "Could not read memory from PM2"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 4: CACHE & CDN${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 10: Check if Cloudflare is active
echo "Testing Cloudflare CDN..."
CLOUDFLARE_CHECK=$(curl -I -s https://shithaa.in 2>/dev/null | grep -i "cf-ray" || echo "")
if [ ! -z "$CLOUDFLARE_CHECK" ]; then
  test_result 0 "Cloudflare CDN is active"
else
  test_warning "Cloudflare CDN" "Could not detect Cloudflare headers (may not be set up)"
fi

# Test 11: Image cache headers
echo "Testing image cache headers..."
if [ -d "backend/uploads" ]; then
  SAMPLE_IMAGE=$(find backend/uploads -name "*.jpg" -o -name "*.webp" -o -name "*.png" | head -1)
  if [ ! -z "$SAMPLE_IMAGE" ]; then
    CACHE_HEADER=$(curl -I -s http://localhost:4000/$(basename $SAMPLE_IMAGE) 2>/dev/null | grep -i "cache-control" || echo "")
    if [ ! -z "$CACHE_HEADER" ]; then
      test_result 0 "Image cache headers present"
    else
      test_warning "Image cache headers" "No cache-control header found"
    fi
  else
    test_warning "Image cache test" "No images found in uploads directory"
  fi
else
  test_warning "Image cache test" "Uploads directory not found"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 5: DATABASE${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 12: Check if database has data
echo "Testing database content..."
PRODUCTS_COUNT=$(echo "$PRODUCTS_RESPONSE" | grep -o '"_id"' | wc -l)
if [ "$PRODUCTS_COUNT" -gt 0 ]; then
  test_result 0 "Database has products ($PRODUCTS_COUNT found)"
else
  test_result 1 "Database content" "No products found in database"
fi

# Test 13: Check for recent orders (if any)
echo "Testing orders collection..."
ORDERS_RESPONSE=$(curl -s -H "token: test" http://localhost:4000/api/order/list 2>/dev/null || echo '{"success":false}')
if echo "$ORDERS_RESPONSE" | grep -q '"success":true'; then
  test_result 0 "Orders API accessible"
else
  test_warning "Orders test" "Could not access orders (may require authentication)"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 6: SECURITY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 14: CORS headers
echo "Testing CORS configuration..."
CORS_HEADER=$(curl -I -s http://localhost:4000/api/health 2>/dev/null | grep -i "access-control" || echo "")
if [ ! -z "$CORS_HEADER" ]; then
  test_result 0 "CORS headers present"
else
  test_warning "CORS headers" "No CORS headers detected"
fi

# Test 15: Security headers
echo "Testing security headers..."
SECURITY_HEADERS=$(curl -I -s http://localhost:4000/api/health 2>/dev/null | grep -i "x-" | wc -l)
if [ "$SECURITY_HEADERS" -ge 2 ]; then
  test_result 0 "Security headers present"
else
  test_warning "Security headers" "Limited security headers detected"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUITE 7: LOGS & MONITORING${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 16: Check for error logs
echo "Testing error logging..."
if [ -f "backend/logs/error.log" ]; then
  RECENT_ERRORS=$(tail -20 backend/logs/error.log 2>/dev/null | wc -l)
  if [ "$RECENT_ERRORS" -lt 5 ]; then
    test_result 0 "Error log present with minimal errors"
  else
    test_warning "Error logging" "Found $RECENT_ERRORS recent error entries"
  fi
else
  test_warning "Error logging" "No error.log file found (logging may not be configured)"
fi

# Test 17: Check combined logs
echo "Testing combined logging..."
if [ -f "backend/logs/combined.log" ]; then
  RECENT_LOGS=$(tail -20 backend/logs/combined.log 2>/dev/null | wc -l)
  if [ "$RECENT_LOGS" -gt 0 ]; then
    test_result 0 "Combined log is active"
  else
    test_warning "Combined logging" "Log file exists but appears empty"
  fi
else
  test_warning "Combined logging" "No combined.log file found"
fi

echo ""
echo "=================================================="
echo "📊 TEST RESULTS SUMMARY"
echo "=================================================="
echo ""
echo -e "${GREEN}✓ PASSED${NC}: $PASSED"
echo -e "${RED}✗ FAILED${NC}: $FAILED"
echo -e "${YELLOW}⚠ WARNINGS${NC}: $WARNINGS"
echo ""

# Calculate success rate
TOTAL_TESTS=$((PASSED + FAILED))
if [ "$TOTAL_TESTS" -gt 0 ]; then
  SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
  echo "Success Rate: ${SUCCESS_RATE}%"
  echo ""
fi

# Overall status
if [ "$FAILED" -eq 0 ]; then
  if [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ALL TESTS PASSED - SYSTEM IS HEALTHY!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
  else
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  TESTS PASSED WITH WARNINGS${NC}"
    echo -e "${YELLOW}Please review warnings above${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
  fi
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ CRITICAL ISSUES DETECTED${NC}"
  echo -e "${RED}FIX FAILED TESTS BEFORE DEPLOYMENT!${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
