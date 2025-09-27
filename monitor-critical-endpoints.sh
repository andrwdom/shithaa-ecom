#!/bin/bash

# Monitor Critical Endpoints in Real-time
# Watches logs for checkout, webhook, and payment activity

set -e

echo "🔍 MONITORING CRITICAL ENDPOINTS"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get today's date for log files
TODAY=$(date +%Y-%m-%d)
LOG_DIR="backend/logs"
REQUEST_LOG="$LOG_DIR/requests-$TODAY.log"
WEBHOOK_LOG="$LOG_DIR/webhook-$TODAY.log"
PAYMENT_LOG="$LOG_DIR/payment-$TODAY.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "📊 Monitoring logs for:"
echo "  - Checkout requests: $REQUEST_LOG"
echo "  - Webhook activity: $WEBHOOK_LOG"
echo "  - Payment activity: $PAYMENT_LOG"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to monitor specific patterns
monitor_patterns() {
    local log_file="$1"
    local pattern="$2"
    local description="$3"
    
    if [ -f "$log_file" ]; then
        echo -e "${BLUE}[$description]${NC} Monitoring $log_file for '$pattern'"
        tail -f "$log_file" | grep --line-buffered "$pattern" | while read line; do
            echo -e "${GREEN}[$(date '+%H:%M:%S')] $description:${NC} $line"
        done &
    else
        echo -e "${YELLOW}[WARNING]${NC} Log file $log_file not found yet"
    fi
}

# Start monitoring in background
monitor_patterns "$REQUEST_LOG" "checkout" "CHECKOUT"
monitor_patterns "$REQUEST_LOG" "webhook" "WEBHOOK"
monitor_patterns "$REQUEST_LOG" "payment" "PAYMENT"
monitor_patterns "$REQUEST_LOG" "phonepe" "PHONEPE"
monitor_patterns "$WEBHOOK_LOG" "ERROR\|CRITICAL" "WEBHOOK-ERROR"
monitor_patterns "$PAYMENT_LOG" "ERROR\|CRITICAL" "PAYMENT-ERROR"

# Monitor all requests in real-time
if [ -f "$REQUEST_LOG" ]; then
    echo -e "${BLUE}[ALL-REQUESTS]${NC} Monitoring all critical requests..."
    tail -f "$REQUEST_LOG" | while read line; do
        # Color code based on content
        if echo "$line" | grep -q "ERROR\|CRITICAL"; then
            echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $line"
        elif echo "$line" | grep -q "checkout\|webhook\|payment"; then
            echo -e "${YELLOW}[$(date '+%H:%M:%S')] CRITICAL:${NC} $line"
        else
            echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $line"
        fi
    done
else
    echo -e "${YELLOW}[WARNING]${NC} Request log file not found. Waiting for first request..."
    
    # Wait for log file to be created
    while [ ! -f "$REQUEST_LOG" ]; do
        sleep 1
    done
    
    echo -e "${GREEN}[SUCCESS]${NC} Log file created! Starting monitoring..."
    tail -f "$REQUEST_LOG" | while read line; do
        echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $line"
    done
fi
