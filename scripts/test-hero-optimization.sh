#!/bin/bash

echo "🚀 Testing Hero Section Performance Optimizations"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Frontend dependencies already installed"
fi

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
else
    echo "✅ Backend dependencies already installed"
fi

echo ""
echo "🔍 Checking for optimization files..."
echo "====================================="

# Check if all optimization files exist
files_to_check=(
    "frontend/components/hero-section-optimized.tsx"
    "frontend/components/optimized-category-card.tsx"
    "frontend/hooks/use-intersection-observer.ts"
    "frontend/hooks/use-performance-monitor.ts"
    "frontend/hooks/use-visibility-change.ts"
    "frontend/lib/image-preloader.ts"
    "frontend/app/hero-demo/page.tsx"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "🎨 Checking CSS optimizations..."
echo "================================"

# Check if CSS optimizations are in place
if grep -q "hero-card-optimized" frontend/app/globals.css; then
    echo "✅ CSS optimizations found in globals.css"
else
    echo "❌ CSS optimizations not found in globals.css"
fi

echo ""
echo "🧪 Starting development servers for testing..."
echo "=============================================="

# Start backend server in background
echo "🚀 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend server in background
echo "🚀 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

echo ""
echo "✅ Development servers started!"
echo "================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:4000"
echo "🧪 Demo Page: http://localhost:3000/hero-demo"
echo ""
echo "📱 Test the hero section on both desktop and mobile:"
echo "   1. Visit http://localhost:3000 (main page with optimized hero)"
echo "   2. Visit http://localhost:3000/hero-demo (performance comparison)"
echo "   3. Check performance metrics in the demo page"
echo "   4. Test on mobile device or use browser dev tools mobile simulation"
echo ""
echo "🛑 To stop servers, run: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

echo "⏳ Press Ctrl+C to stop servers and exit..."
echo ""

# Keep script running
while true; do
    sleep 1
done 