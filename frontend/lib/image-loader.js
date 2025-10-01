// Optimized image loader for Cloudflare and mobile performance
export default function optimizedImageLoader({ src, width, quality }) {
  // Detect if we're in production with Cloudflare
  const isProduction = process.env.NODE_ENV === 'production'
  const baseUrl = isProduction ? 'https://shithaa.in' : 'http://localhost:4000'
  
  // Handle external URLs (already optimized)
  if (src.startsWith('http')) {
    return src
  }
  
  // Handle local/API images
  let imageSrc = src.startsWith('/') ? src : `/${src}`
  
  // Cloudflare Image Resizing (if available)
  if (isProduction) {
    const params = new URLSearchParams()
    
    // Optimize for mobile performance
    if (width) {
      params.append('width', width.toString())
    }
    
    // Adjust quality for mobile (lower quality = faster load)
    const optimalQuality = quality || 75
    params.append('quality', optimalQuality.toString())
    
    // Use modern formats when possible
    params.append('format', 'webp')
    
    // Cloudflare Polish will handle optimization
    return `${baseUrl}${imageSrc}?${params.toString()}`
  }
  
  // Local development - just return the image
  return `${baseUrl}${imageSrc}`
}