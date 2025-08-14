# 🔧 Troubleshooting 500 Internal Server Error - Product Addition

## 🚨 **Problem**
Getting "Failed to load resource: the server responded with a status of 500 (Internal Server Error)" when trying to add products from the admin panel.

## 🔍 **Common Causes**

### 1. **Missing Upload Directory**
- The server tries to save images to `/var/www/shithaa-ecom/uploads/products/`
- This directory might not exist or have wrong permissions

### 2. **Image Optimization Issues**
- Sharp library might not be properly installed
- Image processing might be failing

### 3. **Database Connection Issues**
- MongoDB connection might be failing
- Environment variables might be missing

### 4. **File Permission Issues**
- Server can't write to upload directories
- Server can't read required files

## 🛠️ **Quick Fixes**

### **Step 1: Run Server Setup Check**
```bash
cd backend
npm run check-setup
```

This will:
- ✅ Check if upload directories exist
- ✅ Verify Sharp library installation
- ✅ Test MongoDB connection
- ✅ Check file permissions
- ✅ Validate environment variables

### **Step 2: Manual Directory Creation**
If directories are missing, create them manually:
```bash
sudo mkdir -p /var/www/shithaa-ecom/uploads/products
sudo chown -R $USER:$USER /var/www/shithaa-ecom/uploads
sudo chmod -R 755 /var/www/shithaa-ecom/uploads
```

### **Step 3: Install Sharp (if missing)**
```bash
cd backend
npm install sharp
```

### **Step 4: Check Environment Variables**
Ensure these are set in your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/shitha
BASE_URL=https://shithaa.in
JWT_SECRET=your-secret-key
```

### **Step 5: Restart Server**
```bash
cd backend
npm run server
```

## 🔍 **Debug Steps**

### **Check Server Logs**
Look for specific error messages in your server console:
```bash
cd backend
npm run server
```

### **Test Image Upload**
Try uploading a simple image first to isolate the issue.

### **Check File Permissions**
```bash
ls -la /var/www/shithaa-ecom/uploads/
ls -la backend/uploads/
```

## 📋 **What I Fixed in the Code**

### 1. **Enhanced Error Handling**
- Added try-catch blocks around image optimization
- Created fallback methods when optimization fails
- Better error messages with specific status codes

### 2. **Directory Creation**
- Automatically creates missing upload directories
- Handles permission errors gracefully

### 3. **Image Processing Fallback**
- If Sharp fails, falls back to simple file copying
- Continues processing even if some images fail

### 4. **Better Error Messages**
- Specific error messages for different failure types
- Development vs production error details

## 🎯 **Expected Results After Fix**

- ✅ Products can be added without 500 errors
- ✅ Images are processed (with or without optimization)
- ✅ Clear error messages if something still fails
- ✅ Automatic directory creation
- ✅ Graceful fallbacks for image processing

## 🚀 **Next Steps**

1. **Run the setup check**: `npm run check-setup`
2. **Fix any issues found** (directories, permissions, etc.)
3. **Restart the server**
4. **Try adding a product again**
5. **Check server logs for any remaining issues**

## 📞 **Still Having Issues?**

If the problem persists after following these steps:

1. **Check server logs** for specific error messages
2. **Verify MongoDB connection** is working
3. **Test with a simple product** (no images first)
4. **Check if Sharp is working**: `node -e "console.log(require('sharp'))"`

The enhanced error handling should now give you much more specific information about what's failing! 