#!/bin/bash

# Start Draft Reconciliation Job
# This script starts the reconciliation job using PM2

echo "🚀 Starting Draft Reconciliation Job..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Please install PM2 first:"
    echo "   npm install -g pm2"
    exit 1
fi

# Check if environment variables are set
if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI environment variable is not set"
    exit 1
fi

if [ -z "$PHONEPE_MERCHANT_ID" ]; then
    echo "❌ PHONEPE_MERCHANT_ID environment variable is not set"
    exit 1
fi

if [ -z "$PHONEPE_SALT_KEY" ]; then
    echo "❌ PHONEPE_SALT_KEY environment variable is not set"
    exit 1
fi

# Start the reconciliation job
echo "🔄 Starting reconciliation job with PM2..."
pm2 start ecosystem.reconciliation.config.js

# Check if it started successfully
if [ $? -eq 0 ]; then
    echo "✅ Reconciliation job started successfully"
    echo "📊 Check status with: pm2 status"
    echo "📋 View logs with: pm2 logs shithaa-reconciliation"
    echo "🛑 Stop with: pm2 stop shithaa-reconciliation"
else
    echo "❌ Failed to start reconciliation job"
    exit 1
fi
