# 🚀 Shithaa E-commerce Deployment Fix Script (PowerShell)
# This script fixes the CORS and backend server issues

Write-Host "🔧 Starting Shithaa E-commerce deployment fix..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if PM2 is installed
try {
    $pm2Version = pm2 --version
    Write-Success "PM2 version: $pm2Version"
} catch {
    Write-Error "PM2 is not installed. Please install it first: npm install -g pm2"
    exit 1
}

# Navigate to project directory (adjust path as needed)
$projectPath = "D:\Productivity\Client Sites\Shitha-v3\shitha-maternity2"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Status "Current directory: $(Get-Location)"
} else {
    Write-Error "Project directory not found at: $projectPath"
    Write-Status "Please update the projectPath variable in this script"
    exit 1
}

# Step 1: Stop all existing PM2 processes
Write-Status "🛑 Stopping existing PM2 processes..."
pm2 stop all 2>$null
pm2 delete all 2>$null

# Step 2: Check if backend dependencies are installed
Write-Status "📦 Checking backend dependencies..."
if (-not (Test-Path "backend\node_modules")) {
    Write-Warning "Backend node_modules not found. Installing dependencies..."
    Set-Location backend
    npm install
    Set-Location ..
} else {
    Write-Success "Backend dependencies already installed"
}

# Step 3: Check if frontend dependencies are installed
Write-Status "📦 Checking frontend dependencies..."
if (-not (Test-Path "frontend\node_modules")) {
    Write-Warning "Frontend node_modules not found. Installing dependencies..."
    Set-Location frontend
    npm install
    Set-Location ..
} else {
    Write-Success "Frontend dependencies already installed"
}

# Step 4: Check if admin dependencies are installed
Write-Status "📦 Checking admin dependencies..."
if (-not (Test-Path "admin\node_modules")) {
    Write-Warning "Admin node_modules not found. Installing dependencies..."
    Set-Location admin
    npm install
    Set-Location ..
} else {
    Write-Success "Admin dependencies already installed"
}

# Step 5: Build frontend
Write-Status "🏗️ Building frontend..."
Set-Location frontend
try {
    npm run build
    Write-Success "Frontend built successfully"
} catch {
    Write-Error "Frontend build failed"
    exit 1
}
Set-Location ..

# Step 6: Build admin
Write-Status "🏗️ Building admin panel..."
Set-Location admin
try {
    npm run build
    Write-Success "Admin panel built successfully"
} catch {
    Write-Error "Admin panel build failed"
    exit 1
}
Set-Location ..

# Step 7: Create logs directory
Write-Status "📁 Creating logs directory..."
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force
}

# Step 8: Start services with PM2
Write-Status "🚀 Starting services with PM2..."
try {
    pm2 start ecosystem.config.js
    Write-Success "Services started successfully"
} catch {
    Write-Error "Failed to start services with PM2"
    exit 1
}

# Step 9: Wait for services to be ready
Write-Status "⏳ Waiting for services to be ready..."
Start-Sleep -Seconds 10

# Step 10: Check service status
Write-Status "📊 Checking service status..."
pm2 status

# Step 11: Test backend connectivity
Write-Status "🧪 Testing backend connectivity..."
Start-Sleep -Seconds 5

# Test if backend is responding (Windows equivalent)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend server is responding on port 4000"
    }
} catch {
    Write-Error "Backend server is not responding on port 4000"
    Write-Status "Checking PM2 logs..."
    pm2 logs shithaa-backend --lines 20
}

# Step 12: Test frontend connectivity
Write-Status "🧪 Testing frontend connectivity..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "Frontend server is responding on port 3000"
    }
} catch {
    Write-Error "Frontend server is not responding on port 3000"
    Write-Status "Checking PM2 logs..."
    pm2 logs shithaa-frontend --lines 20
}

# Step 13: Test admin panel connectivity
Write-Status "🧪 Testing admin panel connectivity..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4173" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Success "Admin panel is responding on port 4173"
    }
} catch {
    Write-Error "Admin panel is not responding on port 4173"
    Write-Status "Checking PM2 logs..."
    pm2 logs shithaa-admin --lines 20
}

# Step 14: Save PM2 configuration
Write-Status "💾 Saving PM2 configuration..."
pm2 save

# Step 15: Setup PM2 startup script
Write-Status "🔧 Setting up PM2 startup script..."
pm2 startup

# Step 16: Final status check
Write-Status "📊 Final service status:"
pm2 status

Write-Success "🎉 Deployment fix completed!"
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the admin panel: https://admin.shithaa.in"
Write-Host "2. Check logs: pm2 logs"
Write-Host "3. Monitor services: pm2 monit"
Write-Host ""
Write-Host "🔍 If issues persist, check:" -ForegroundColor Yellow
Write-Host "- PM2 logs: pm2 logs"
Write-Host "- Backend logs: pm2 logs shithaa-backend"
Write-Host "- Frontend logs: pm2 logs shithaa-frontend"
Write-Host ""
Write-Host "💡 Note: This script is for local development on Windows." -ForegroundColor Magenta
Write-Host "   For production deployment, use the bash script on your VPS." -ForegroundColor Magenta
