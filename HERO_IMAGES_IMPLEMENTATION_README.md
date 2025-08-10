# Hero Section Dynamic Images Implementation

This document outlines the implementation of a dynamic, optimized hero section image pipeline that fetches real product images from MongoDB, validates them, generates thumbnails, and provides LQIP (Low Quality Image Placeholders) for smooth mobile performance.

## Overview

The implementation replaces static placeholder images with dynamic product-based images that:
- ✅ Fetch real product images from MongoDB product records
- ✅ Validate image URLs before serving to prevent 404/HTML errors
- ✅ Generate optimized WebP thumbnails (300px wide)
- ✅ Create LQIP blur placeholders (20px base64)
- ✅ Implement mobile-first performance optimizations
- ✅ Remove X/Y image counters for cleaner UI
- ✅ Use IntersectionObserver to pause animations when off-screen

## Backend Changes

### New Files Created
1. **`backend/routes/heroImagesRoute.js`** - New route for `/api/hero-images`
2. **`backend/controllers/heroImagesController.js`** - Controller with image validation and optimization

### Files Modified
1. **`backend/server.js`** - Added hero-images route

### New Endpoint
```
GET /api/hero-images?categoryId=<categorySlug>&limit=<number>
```

**Response Format:**
```json
{
  "success": true,
  "images": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "productName": "Blue Maternity Dress",
      "originalUrl": "http://vps.com/uploads/blue-dress.jpg",
      "thumbUrl": "/uploads/hero-thumbs/507f1f77bcf86cd799439011-thumb.webp",
      "lqip": "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAADsAD+JaQAA3AAAAAA",
      "width": 800,
      "height": 600,
      "trackingKey": "507f1f77bcf86cd799439011-1234567890"
    }
  ],
  "total": 1,
  "categoryId": "maternity-feeding-wear"
}
```

## Frontend Changes

### Files Modified
1. **`frontend/components/HeroCategoryCard.tsx`** - Updated to use new endpoint
2. **`frontend/components/banner-carousel.tsx`** - Removed X/Y counter
3. **`frontend/components/image-carousel.tsx`** - Removed X/Y counter

### Key Features
- **Mobile Detection**: Automatically limits images (4 on mobile, 6 on desktop)
- **IntersectionObserver**: Pauses animations when cards are off-screen
- **LQIP Support**: Shows blur placeholders while images load
- **GPU Acceleration**: Uses `will-change: opacity` for smooth transitions
- **Error Handling**: Graceful fallback to placeholder images

## Deployment Steps

### 1. Backend Deployment
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Ensure Sharp is available
npm list sharp

# Start the server
npm run server
```

### 2. Environment Variables
Ensure these environment variables are set in your backend `.env`:
```bash
# VPS Configuration
VPS_BASE_URL=http://your-vps-domain.com

# MongoDB (should already be configured)
MONGODB_URI=mongodb://localhost:27017/shitha-maternity

# Optional: Redis for caching (if implemented)
REDIS_URL=redis://localhost:6379
```

### 3. Frontend Deployment
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set API URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000

# Build and start
npm run build
npm start
```

## Testing Steps

### 1. Backend Testing
```bash
# Test the hero-images endpoint
curl "http://localhost:4000/api/hero-images?categoryId=maternity-feeding-wear&limit=4"
```

**Expected Response:**
- Status: 200
- JSON with validated images array
- No "text/html" content-type errors in logs

### 2. Frontend Testing

#### Chrome DevTools Testing
1. **Open DevTools** → Network tab
2. **Emulate Slow 3G** + Pixel 4 resolution
3. **Load homepage** and observe:
   - First hero card shows LQIP quickly
   - Thumbnails load progressively
   - No 404 image requests
   - Smooth transitions without flicker

#### Performance Testing
1. **Lighthouse Audit**:
   - First Contentful Paint < 1.5s
   - Largest Contentful Paint < 2.5s
   - Cumulative Layout Shift < 0.1

2. **Mobile Performance**:
   - Smooth scrolling on 3G
   - No CPU spikes during animations
   - Images load within viewport

### 3. Error Testing
1. **Simulate Broken Images**:
   ```bash
   # Temporarily rename a thumbnail on VPS
   mv /path/to/hero-thumbs/product-thumb.webp /path/to/hero-thumbs/product-thumb.webp.bak
   ```
   
2. **Verify Behavior**:
   - Frontend shows placeholder gracefully
   - Backend logs skipped product
   - No console errors

### 4. Validation Testing
1. **Check Server Logs**:
   - No "received text/html" errors
   - Clear logging of skipped products
   - Thumbnail generation success/failure

2. **Verify Image URLs**:
   - All returned URLs are valid images
   - Thumbnails are WebP format
   - LQIP is base64 encoded

## Troubleshooting

### Common Issues

#### 1. Sharp Installation Errors
```bash
# Reinstall Sharp
npm uninstall sharp
npm install sharp
```

#### 2. Image Validation Failing
- Check `VPS_BASE_URL` environment variable
- Verify image paths in MongoDB product records
- Ensure VPS serves images correctly

#### 3. Thumbnail Generation Fails
- Check write permissions for `uploads/hero-thumbs/` directory
- Verify Sharp can process image formats
- Check available disk space

#### 4. Frontend Not Loading Images
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration
- Ensure backend is running and accessible

### Performance Issues

#### 1. Slow Image Loading
- Check thumbnail cache directory permissions
- Verify Sharp optimization settings
- Monitor network requests in DevTools

#### 2. Animation Stuttering
- Ensure `will-change: opacity` is applied
- Check for conflicting CSS animations
- Verify IntersectionObserver is working

## Monitoring and Maintenance

### 1. Log Monitoring
Watch for these log patterns:
```
✅ Validated image: /uploads/product1.jpg
⚠️ Skipped invalid image: /uploads/broken-image.jpg
❌ Thumbnail generation failed: Product ID 123
```

### 2. Cache Management
- Thumbnail cache: In-memory LRU (100 entries)
- Generated files: Stored in `uploads/hero-thumbs/`
- Consider implementing Redis for production

### 3. Image Quality
- Thumbnails: 300px wide, WebP format, 70% quality
- LQIP: 20px wide, WebP format, 30% quality
- Monitor file sizes and adjust quality settings

## Future Enhancements

### 1. Advanced Caching
- Redis integration for distributed caching
- CDN integration for thumbnail delivery
- Browser caching headers optimization

### 2. Image Processing
- Multiple thumbnail sizes (300px, 600px, 1200px)
- AVIF format support for modern browsers
- Progressive JPEG for better perceived performance

### 3. Analytics
- Image load success/failure tracking
- Performance metrics collection
- User interaction analytics

## Security Considerations

### 1. Input Validation
- Category ID sanitization
- Limit parameter bounds checking
- Rate limiting on endpoint

### 2. File Access
- Thumbnail directory access control
- Image URL validation before processing
- Secure file serving configuration

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify environment variable configuration
3. Test endpoint directly with curl
4. Check MongoDB product data integrity

---

**Implementation Status**: ✅ Complete
**Last Updated**: $(date)
**Version**: 1.0.0 