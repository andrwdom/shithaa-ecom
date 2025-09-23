/**
 * Custom image loader for Cloudflare CDN optimization
 * This ensures all images are served through Cloudflare for better caching and performance
 */

export default function cloudflareImageLoader({ src, width, quality }) {
  // If it's already a full URL, return as is
  if (src.startsWith('http')) {
    return src
  }
  
  // For relative URLs, ensure they go through Cloudflare domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shithaa.in'
  const fullSrc = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`
  
  // Add Cloudflare image optimization parameters
  const params = new URLSearchParams()
  
  // Add width parameter for responsive images
  if (width) {
    params.append('width', width.toString())
  }
  
  // Add quality parameter
  if (quality) {
    params.append('quality', quality.toString())
  }
  
  // Add format optimization (WebP/AVIF)
  params.append('f', 'auto')
  
  // Add optimization flags
  params.append('q', 'auto')
  
  // Construct the optimized URL
  const separator = fullSrc.includes('?') ? '&' : '?'
  return `${fullSrc}${separator}${params.toString()}`
}
