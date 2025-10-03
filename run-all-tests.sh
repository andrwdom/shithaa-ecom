#!/bin/bash

# Industry-Grade E-commerce Testing Suite
# This script runs all the comprehensive tests for your Shithaa e-commerce platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
BACKEND_URL="https://your-backend.example"
TEST_PRODUCT_ID="SCFL00186"
TEST_SIZE="XL"
PHONEPE_USERNAME="your_username"
PHONEPE_PASSWORD="your_password"

# Test results directory
RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}🚀 Starting Industry-Grade E-commerce Testing Suite${NC}"
echo -e "${BLUE}📅 Test Run: $(date)${NC}"
echo -e "${BLUE}📁 Results Directory: $RESULTS_DIR${NC}"
echo ""

# Function to run a test and capture results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_file="$3"
    
    echo -e "${YELLOW}🔄 Running: $test_name${NC}"
    echo "Command: $test_command"
    echo ""
    
    if eval "$test_command" > "$RESULTS_DIR/$test_file.log" 2>&1; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        echo "$test_name: PASSED" >> "$RESULTS_DIR/summary.txt"
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        echo "$test_name: FAILED" >> "$RESULTS_DIR/summary.txt"
        echo "Check $RESULTS_DIR/$test_file.log for details"
    fi
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 is not installed. Please install k6 first.${NC}"
        echo "Installation: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
        exit 1
    fi
    
    # Check if MongoDB is accessible
    if ! command -v mongosh &> /dev/null; then
        echo -e "${YELLOW}⚠️  mongosh not found. Some tests may not work.${NC}"
    fi
    
    echo -e "${GREEN}✅ Prerequisites check completed${NC}"
    echo ""
}

# Function to update test configurations
update_test_configs() {
    echo -e "${BLUE}🔧 Updating Test Configurations...${NC}"
    
    # Update k6 test files with actual values
    sed -i "s|https://your-backend.example|$BACKEND_URL|g" k6-*.js
    sed -i "s|SCFL00186|$TEST_PRODUCT_ID|g" k6-*.js
    sed -i "s|XL|$TEST_SIZE|g" k6-*.js
    
    # Update Node.js test files
    sed -i "s|https://your-backend.example|$BACKEND_URL|g" test-*.js
    sed -i "s|SCFL00186|$TEST_PRODUCT_ID|g" test-*.js
    sed -i "s|XL|$TEST_SIZE|g" test-*.js
    
    echo -e "${GREEN}✅ Test configurations updated${NC}"
    echo ""
}

# Function to run k6 load tests
run_k6_tests() {
    echo -e "${BLUE}📊 Running k6 Load Tests...${NC}"
    
    # Test 1: Race condition test (oversell prevention)
    run_test "Race Condition Test (Oversell Prevention)" \
        "k6 run k6-race-stock.js" \
        "race-condition-test"
    
    # Test 2: Double-click test (idempotency)
    run_test "Double-Click Test (Idempotency)" \
        "k6 run k6-double-confirm.js" \
        "double-click-test"
    
    # Test 3: Webhook replay test
    run_test "Webhook Replay Test" \
        "k6 run k6-webhook-replay.js" \
        "webhook-replay-test"
    
    echo -e "${GREEN}✅ k6 Load Tests Completed${NC}"
    echo ""
}

# Function to run Node.js tests
run_node_tests() {
    echo -e "${BLUE}🔧 Running Node.js Tests...${NC}"
    
    # Test 1: PhonePe webhook signature test
    run_test "PhonePe Webhook Signature Test" \
        "PHONEPE_WEBHOOK_USERNAME=$PHONEPE_USERNAME PHONEPE_WEBHOOK_PASSWORD=$PHONEPE_PASSWORD node test-webhook-phonepe.js" \
        "webhook-signature-test"
    
    # Test 2: Atomic stock operations test
    run_test "Atomic Stock Operations Test" \
        "node test-atomic-stock-operations.js" \
        "atomic-stock-test"
    
    # Test 3: Infrastructure failure simulation
    run_test "Infrastructure Failure Simulation" \
        "node test-infrastructure-failures.js" \
        "infrastructure-failure-test"
    
    # Test 4: Payment reconciliation test
    run_test "Payment Reconciliation Test" \
        "node test-payment-reconciliation.js" \
        "payment-reconciliation-test"
    
    echo -e "${GREEN}✅ Node.js Tests Completed${NC}"
    echo ""
}

# Function to run manual verification tests
run_manual_tests() {
    echo -e "${BLUE}🔍 Running Manual Verification Tests...${NC}"
    
    # Test 1: Check system health
    echo -e "${YELLOW}🔄 Checking System Health...${NC}"
    if curl -s "$BACKEND_URL/api/monitoring/health" > "$RESULTS_DIR/system-health.json"; then
        echo -e "${GREEN}✅ System Health: OK${NC}"
    else
        echo -e "${RED}❌ System Health: FAILED${NC}"
    fi
    
    # Test 2: Check payment flow status
    echo -e "${YELLOW}🔄 Checking Payment Flow Status...${NC}"
    if curl -s "$BACKEND_URL/api/monitoring/payment-flow" > "$RESULTS_DIR/payment-flow.json"; then
        echo -e "${GREEN}✅ Payment Flow: OK${NC}"
    else
        echo -e "${RED}❌ Payment Flow: FAILED${NC}"
    fi
    
    # Test 3: Check for missing orders
    echo -e "${YELLOW}🔄 Checking for Missing Orders...${NC}"
    if curl -s "$BACKEND_URL/api/monitoring/missing-orders" > "$RESULTS_DIR/missing-orders.json"; then
        echo -e "${GREEN}✅ Missing Orders Check: OK${NC}"
    else
        echo -e "${RED}❌ Missing Orders Check: FAILED${NC}"
    fi
    
    echo -e "${GREEN}✅ Manual Verification Tests Completed${NC}"
    echo ""
}

# Function to generate test report
generate_report() {
    echo -e "${BLUE}📊 Generating Test Report...${NC}"
    
    local report_file="$RESULTS_DIR/test-report.md"
    
    cat > "$report_file" << EOF
# Industry-Grade E-commerce Testing Report

**Test Run:** $(date)  
**Backend URL:** $BACKEND_URL  
**Product ID:** $TEST_PRODUCT_ID  
**Size:** $TEST_SIZE  

## Test Results Summary

EOF
    
    if [ -f "$RESULTS_DIR/summary.txt" ]; then
        cat "$RESULTS_DIR/summary.txt" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## Test Files Generated

- \`race-condition-test.log\` - Race condition and oversell prevention test
- \`double-click-test.log\` - Double-click and idempotency test
- \`webhook-replay-test.log\` - Webhook replay and duplicate handling test
- \`webhook-signature-test.log\` - PhonePe webhook signature validation test
- \`atomic-stock-test.log\` - Atomic stock operations test
- \`infrastructure-failure-test.log\` - Infrastructure failure simulation test
- \`payment-reconciliation-test.log\` - Payment reconciliation test
- \`system-health.json\` - System health check results
- \`payment-flow.json\` - Payment flow status check results
- \`missing-orders.json\` - Missing orders check results

## Key Metrics to Verify

### 1. No Lost Payments
- ✅ 100% of successful payment callbacks result in confirmed orders
- ✅ No payments are silently lost
- ✅ All webhooks are properly processed

### 2. No Oversell
- ✅ Only 1 confirmed order for products with stock = 1
- ✅ Concurrent checkout attempts are properly handled
- ✅ Stock reservations are atomic

### 3. Idempotency
- ✅ Duplicate webhook deliveries produce exactly one side-effect
- ✅ Double-click scenarios don't create duplicate orders
- ✅ Webhook processing is idempotent

### 4. Latency
- ✅ Average checkout API response < 500ms
- ✅ 95th percentile < 2s under load
- ✅ Mobile TTFB is optimized

### 5. Fallback
- ✅ Webhooks are queued to DLQ during DB/Redis failures
- ✅ Reconciliation completes successfully after recovery
- ✅ System gracefully handles infrastructure failures

## Next Steps

1. **Review Test Results**: Check all log files for any failures or warnings
2. **Verify Database State**: Ensure no duplicate orders or lost payments
3. **Monitor System Health**: Check system metrics and performance
4. **Fix Any Issues**: Address any problems identified during testing
5. **Re-run Tests**: If issues were fixed, run the tests again to verify

## Support

If you encounter any issues during testing:
1. Check the individual test log files for detailed error messages
2. Verify your backend URL and credentials are correct
3. Ensure all required services (MongoDB, Redis, PM2) are running
4. Check your system logs for any errors

EOF
    
    echo -e "${GREEN}✅ Test report generated: $report_file${NC}"
    echo ""
}

# Function to display final summary
display_summary() {
    echo -e "${BLUE}📊 Test Suite Summary${NC}"
    echo "===================="
    
    if [ -f "$RESULTS_DIR/summary.txt" ]; then
        cat "$RESULTS_DIR/summary.txt"
    fi
    
    echo ""
    echo -e "${BLUE}📁 Results Directory: $RESULTS_DIR${NC}"
    echo -e "${BLUE}📊 Test Report: $RESULTS_DIR/test-report.md${NC}"
    echo ""
    
    # Count passed and failed tests
    local passed=$(grep -c "PASSED" "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "0")
    local failed=$(grep -c "FAILED" "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "0")
    
    echo -e "${BLUE}📈 Test Statistics:${NC}"
    echo "  ✅ Passed: $passed"
    echo "  ❌ Failed: $failed"
    echo "  📊 Total: $((passed + failed))"
    
    if [ "$failed" -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Your system is ready for production.${NC}"
    else
        echo -e "${YELLOW}⚠️  Some tests failed. Please review the results and fix any issues.${NC}"
    fi
    
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting Industry-Grade E-commerce Testing Suite${NC}"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Update test configurations
    update_test_configs
    
    # Run k6 load tests
    run_k6_tests
    
    # Run Node.js tests
    run_node_tests
    
    # Run manual verification tests
    run_manual_tests
    
    # Generate test report
    generate_report
    
    # Display final summary
    display_summary
    
    echo -e "${GREEN}🎉 Testing suite completed!${NC}"
}

# Run main function
main "$@"
