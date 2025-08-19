@echo off
echo 🚨 CRITICAL ERROR FIX SCRIPT FOR SHITHAA
echo ==========================================
echo.

echo Step 1: Checking current server status...
pm2 status

echo.
echo Step 2: Testing environment variables...
cd backend
node test-env.js

echo.
echo Step 3: Restarting backend server...
pm2 restart all

echo.
echo Step 4: Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Step 5: Testing health endpoint...
curl -s http://localhost:4000/api/health

echo.
echo Step 6: Testing production health endpoint...
curl -s https://shithaa.in/api/health

echo.
echo Step 7: Checking server logs for errors...
pm2 logs --lines 10

echo.
echo ✅ Fix script completed!
echo.
echo Next steps:
echo 1. Check if health endpoint is working (no more 500 errors)
echo 2. Try checkout process to see if payment errors are resolved
echo 3. Check browser console for any remaining errors
echo.
echo If issues persist, check:
echo - Environment variables in .env file
echo - MongoDB connection
echo - PhonePe credentials
echo - Server logs with: pm2 logs --lines 50

pause
