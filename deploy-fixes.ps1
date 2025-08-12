# PowerShell Deployment Script for Shithaa E-commerce
# This script fixes the log issues and redeploys the application

Write-Host "🚀 Starting Shithaa E-commerce deployment fixes..." -ForegroundColor Green

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if PM2 is installed
if (-not (Test-Command "pm2")) {
    Write-Host "❌ PM2 is not installed. Installing PM2..." -ForegroundColor Red
    npm install -g pm2
} else {
    Write-Host "✅ PM2 is already installed" -ForegroundColor Green
}

# Stop all PM2 processes
Write-Host "🛑 Stopping all PM2 processes..." -ForegroundColor Yellow
pm2 stop all
pm2 delete all

# Clean up logs
Write-Host "🧹 Cleaning up old logs..." -ForegroundColor Yellow
if (Test-Path "logs") {
    Remove-Item "logs\*" -Recurse -Force
    Write-Host "✅ Logs cleaned" -ForegroundColor Green
}

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
    Write-Host "✅ Logs directory created" -ForegroundColor Green
}

# Fix frontend build
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
Set-Location "frontend"
npm install
npm run build

# Check if build was successful
if (Test-Path ".next\BUILD_ID") {
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

# Go back to root
Set-Location ".."

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "backend"
npm install
Set-Location ".."

# Install admin dependencies
Write-Host "📦 Installing admin dependencies..." -ForegroundColor Yellow
Set-Location "admin"
npm install
Set-Location ".."

# Start PM2 processes
Write-Host "🚀 Starting PM2 processes..." -ForegroundColor Yellow
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
Write-Host "📊 PM2 Status:" -ForegroundColor Cyan
pm2 status

Write-Host "✅ Deployment fixes completed!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:4000" -ForegroundColor Cyan
Write-Host "👨‍💼 Admin: http://localhost:4173" -ForegroundColor Cyan

# Monitor logs for any errors
Write-Host "📝 Monitoring logs for errors..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
pm2 logs --lines 50 