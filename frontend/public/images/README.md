# Image Organization Guide

## Recommended Folder Structure

```
public/
├── images/
│   ├── products/           # Product images
│   │   ├── maternity-feeding-wear/
│   │   ├── zipless-feeding-lounge-wear/
│   │   ├── non-feeding-lounge-wear/
│   │   └── dupatta-lounge-wear/
│   ├── banners/            # Hero/banner images
│   │   ├── hero/
│   │   ├── category-banners/
│   │   └── promotional/
│   ├── logos/              # Logo variations
│   │   ├── primary/
│   │   ├── secondary/
│   │   └── favicon/
│   ├── icons/              # UI icons
│   │   ├── ui/
│   │   ├── social/
│   │   └── payment-methods/
│   ├── testimonials/       # Customer testimonials
│   ├── about/              # About page images
│   └── optimized/          # Optimized versions (auto-generated)
│       ├── webp/           # WebP format
│       ├── jpeg/           # Optimized JPEG
│       └── thumbnails/     # Thumbnail versions
```

## Naming Conventions

### Product Images
- Format: `{product-id}-{variant}-{size}.{extension}`
- Example: `maternity-dress-blue-main.jpg`, `maternity-dress-blue-thumb.webp`

### Banner Images
- Format: `{purpose}-{category}-{size}.{extension}`
- Example: `hero-maternity-feeding-1200x600.webp`

### Logo Images
- Format: `logo-{variant}-{size}.{extension}`
- Example: `logo-primary-200x60.webp`, `logo-white-400x120.png`

## Image Specifications

### Product Images
- **Main Image**: 800x1200px (2:3 aspect ratio)
- **Thumbnail**: 300x450px
- **Gallery**: 600x900px
- **Format**: WebP (primary), JPEG (fallback)

### Banner Images
- **Hero**: 1920x600px (16:5 aspect ratio)
- **Category**: 800x400px (2:1 aspect ratio)
- **Promotional**: 1200x400px (3:1 aspect ratio)

### Logo Images
- **Primary**: 200x60px
- **Favicon**: 32x32px, 16x16px
- **Social**: 1200x630px (for social sharing)

## Optimization Guidelines

1. **Use WebP format** for all images when possible
2. **Provide JPEG fallbacks** for older browsers
3. **Optimize file sizes** to under 200KB for product images
4. **Use descriptive alt text** for SEO and accessibility
5. **Implement lazy loading** for images below the fold
6. **Preload critical images** (hero, first product images)

## Performance Best Practices

1. **Responsive images** with appropriate `sizes` attribute
2. **Progressive loading** for better perceived performance
3. **CDN delivery** for faster loading times
4. **Proper caching** headers for static assets
5. **Image compression** without quality loss
6. **Multiple formats** for different use cases

## SEO Considerations

1. **Descriptive filenames** that include keywords
2. **Alt text** that describes the image content
3. **Structured data** for product images
4. **Image sitemap** for better indexing
5. **Optimized image URLs** for better crawlability 