# Hero Section Performance Optimization Test Script
# PowerShell version for Windows

Write-Host "🚀 Testing Hero Section Performance Optimizations" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if frontend dependencies are installed
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
} else {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
}

# Check if backend dependencies are installed
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
} else {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔍 Checking for optimization files..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if all optimization files exist
$filesToCheck = @(
    "frontend/components/hero-section-optimized.tsx",
    "frontend/components/optimized-category-card.tsx",
    "frontend/hooks/use-intersection-observer.ts",
    "frontend/hooks/use-performance-monitor.ts",
    "frontend/hooks/use-visibility-change.ts",
    "frontend/lib/image-preloader.ts",
    "frontend/app/hero-demo/page.tsx"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - MISSING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎨 Checking CSS optimizations..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if CSS optimizations are in place
$cssContent = Get-Content "frontend/app/globals.css" -Raw
if ($cssContent -match "hero-card-optimized") {
    Write-Host "✅ CSS optimizations found in globals.css" -ForegroundColor Green
} else {
    Write-Host "❌ CSS optimizations not found in globals.css" -ForegroundColor Red
}

Write-Host ""
Write-Host "🧪 Starting development servers for testing..." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Start backend server in background
Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
Set-Location backend
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"
Set-Location ..

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start frontend server in background
Write-Host "🚀 Starting frontend server..." -ForegroundColor Yellow
Set-Location frontend
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"
Set-Location ..

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "✅ Development servers started!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "🔧 Backend: http://localhost:4000" -ForegroundColor White
Write-Host "🧪 Demo Page: http://localhost:3000/hero-demo" -ForegroundColor White
Write-Host ""
Write-Host "📱 Test the hero section on both desktop and mobile:" -ForegroundColor Cyan
Write-Host "   1. Visit http://localhost:3000 (main page with optimized hero)" -ForegroundColor White
Write-Host "   2. Visit http://localhost:3000/hero-demo (performance comparison)" -ForegroundColor White
Write-Host "   3. Check performance metrics in the demo page" -ForegroundColor White
Write-Host "   4. Test on mobile device or use browser dev tools mobile simulation" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop servers, close the terminal windows or use Task Manager" -ForegroundColor Yellow
Write-Host ""

# Open the demo page in default browser
Write-Host "🌐 Opening demo page in browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/hero-demo"

Write-Host "⏳ Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 