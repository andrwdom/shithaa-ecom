# PowerShell script to deploy fixes for Shithaa E-commerce
Write-Host "🚀 Deploying fixes for Shithaa E-commerce..." -ForegroundColor Green

# Set the base directory (adjust path as needed for your server)
$BASE_DIR = "/var/www/shithaa-ecom"

Write-Host "📁 Working directory: $BASE_DIR" -ForegroundColor Yellow

# 1. Fix Backend Issues
Write-Host "🔧 Fixing backend issues..." -ForegroundColor Cyan

# Check if cartController has the removeFromCart function
$cartControllerPath = "$BASE_DIR/backend/controllers/cartController.js"
if (Test-Path $cartControllerPath) {
    $content = Get-Content $cartControllerPath -Raw
    if ($content -match "removeFromCart") {
        Write-Host "✅ removeFromCart function found in cartController" -ForegroundColor Green
    } else {
        Write-Host "❌ removeFromCart function missing - please check the controller file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ cartController.js not found at $cartControllerPath" -ForegroundColor Red
}

# Check if cartRoute imports removeFromCart
$cartRoutePath = "$BASE_DIR/backend/routes/cartRoute.js"
if (Test-Path $cartRoutePath) {
    $content = Get-Content $cartRoutePath -Raw
    if ($content -match "removeFromCart") {
        Write-Host "✅ removeFromCart import found in cartRoute" -ForegroundColor Green
    } else {
        Write-Host "❌ removeFromCart import missing - please check the route file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ cartRoute.js not found at $cartRoutePath" -ForegroundColor Red
}

# 2. Build Frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Cyan

$frontendDir = "$BASE_DIR/frontend"
if (Test-Path $frontendDir) {
    Set-Location $frontendDir
    
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    # Clean previous build
    Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
    }
    
    # Build the application
    Write-Host "🔨 Building Next.js application..." -ForegroundColor Yellow
    npm run build
    
    # Check build status
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend build completed successfully!" -ForegroundColor Green
        
        # Check if .next directory exists and has content
        if (Test-Path ".next") {
            $nextFiles = Get-ChildItem ".next" -Recurse | Measure-Object
            if ($nextFiles.Count -gt 0) {
                Write-Host "✅ .next directory created with $($nextFiles.Count) build files" -ForegroundColor Green
            } else {
                Write-Host "❌ .next directory is empty" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "❌ .next directory is missing" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Frontend directory not found at $frontendDir" -ForegroundColor Red
}

# 3. Restart Services
Write-Host "🔄 Restarting services..." -ForegroundColor Cyan

Set-Location $BASE_DIR

# Restart backend services
Write-Host "🔄 Restarting backend services..." -ForegroundColor Yellow
pm2 restart shitha-b

# Restart frontend services
Write-Host "🔄 Restarting frontend services..." -ForegroundColor Yellow
pm2 restart shithaa-

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "📊 Check service status with: pm2 status" -ForegroundColor Cyan
Write-Host "📋 Check logs with: pm2 logs" -ForegroundColor Cyan 