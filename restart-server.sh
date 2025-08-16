#!/bin/bash

echo "🔄 Restarting Shithaa Backend Server..."
echo "========================================"

# Stop the backend server
echo "1. Stopping backend server..."
pm2 stop shithaa-backend

# Wait a moment
sleep 2

# Start the backend server
echo "2. Starting backend server..."
pm2 start shithaa-backend

# Wait for server to start
sleep 3

# Check server status
echo "3. Checking server status..."
pm2 status

# Check backend logs for errors
echo "4. Checking backend logs..."
pm2 logs shithaa-backend --lines 10

echo "✅ Server restart completed!"
echo ""
echo "If you still see errors, run:"
echo "pm2 logs shithaa-backend --lines 20"
