# PowerShell deployment fix script for Shitha Maternity
Write-Host "🚀 Starting deployment fix for Shitha Maternity..." -ForegroundColor Green

# Stop all PM2 processes
Write-Host "⏹️  Stopping all PM2 processes..." -ForegroundColor Yellow
pm2 stop all
pm2 delete all

# Build frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
npm run build
Set-Location ..

# Build admin panel
Write-Host "🔨 Building admin panel..." -ForegroundColor Yellow
Set-Location admin
npm install
npm run build
Set-Location ..

# Build backend (install dependencies)
Write-Host "🔨 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
Set-Location ..

# Start all services with PM2
Write-Host "🚀 Starting all services with PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js

# Save PM2 configuration
Write-Host "💾 Saving PM2 configuration..." -ForegroundColor Yellow
pm2 save

# Show status
Write-Host "📊 PM2 Status:" -ForegroundColor Green
pm2 status

Write-Host "✅ Deployment fix completed!" -ForegroundColor Green
Write-Host "🌐 Services should now be running on:" -ForegroundColor Cyan
Write-Host "   - Backend: http://localhost:4000" -ForegroundColor White
Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   - Admin: http://localhost:4173" -ForegroundColor White 