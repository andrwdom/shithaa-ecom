# Image Optimization Configuration

This document explains the new image optimization settings that can be configured to improve upload performance.

## Environment Variables

Add these to your `.env` file to customize image processing:

```bash
# Image Quality (1-100, lower = faster processing)
IMAGE_QUALITY=80

# Maximum dimensions (pixels)
IMAGE_MAX_WIDTH=800
IMAGE_MAX_HEIGHT=800

# Image variants to generate (comma-separated)
IMAGE_VARIANTS=original,webp

# Skip optimization entirely (true/false)
SKIP_IMAGE_OPTIMIZATION=false

# WebP compression level (0-6, lower = faster)
IMAGE_COMPRESSION_LEVEL=6
```

## Performance vs Quality Trade-offs

### Fast Processing (Lower Quality)
```bash
IMAGE_QUALITY=70
IMAGE_MAX_WIDTH=600
IMAGE_MAX_HEIGHT=600
IMAGE_COMPRESSION_LEVEL=3
```

### Balanced (Recommended)
```bash
IMAGE_QUALITY=80
IMAGE_MAX_WIDTH=800
IMAGE_MAX_HEIGHT=800
IMAGE_COMPRESSION_LEVEL=6
```

### High Quality (Slower)
```bash
IMAGE_QUALITY=90
IMAGE_MAX_WIDTH=1200
IMAGE_MAX_HEIGHT=1200
IMAGE_COMPRESSION_LEVEL=6
```

## Frontend Compression

The admin panel now includes client-side image compression that:
- Automatically compresses images larger than 500KB
- Reduces dimensions to max 800x800 pixels
- Shows compression progress and file size reduction
- Maintains good quality while improving upload speed

## Benefits

1. **Faster Uploads**: Smaller file sizes mean faster network transfer
2. **Better Performance**: Reduced backend processing time
3. **User Experience**: Real-time progress tracking and compression feedback
4. **Storage Efficiency**: Optimized images take less disk space
5. **Mobile Friendly**: Smaller images load faster on mobile devices

## Troubleshooting

If you experience issues:

1. **Images too small**: Increase `IMAGE_MAX_WIDTH` and `IMAGE_MAX_HEIGHT`
2. **Poor quality**: Increase `IMAGE_QUALITY`
3. **Slow processing**: Decrease `IMAGE_QUALITY` and `IMAGE_COMPRESSION_LEVEL`
4. **Skip optimization**: Set `SKIP_IMAGE_OPTIMIZATION=true`
