# Admin Panel Deployment Script for Windows
Write-Host "🚀 Starting Admin Panel Deployment..." -ForegroundColor Green

# Build the admin panel
Write-Host "📦 Building admin panel..." -ForegroundColor Yellow
Set-Location admin
npm run build

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Admin panel built successfully!" -ForegroundColor Green
    
    # Create favicon.ico if it doesn't exist
    if (-not (Test-Path "dist/favicon.ico")) {
        Write-Host "🔧 Creating favicon.ico..." -ForegroundColor Yellow
        Copy-Item "dist/favicon.png" "dist/favicon.ico"
    }
    
    Write-Host "📁 Build files ready in admin/dist/" -ForegroundColor Green
    Write-Host "🌐 Deploy to server:" -ForegroundColor Cyan
    Write-Host "   1. Upload admin/dist/ to /var/www/shithaa-ecom/admin/dist/" -ForegroundColor White
    Write-Host "   2. Restart nginx: sudo systemctl restart nginx" -ForegroundColor White
    Write-Host "   3. Check admin.shithaa.in" -ForegroundColor White
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
