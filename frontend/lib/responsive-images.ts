/**
 * Responsive Image Utilities
 * Handles responsive image URLs and generates appropriate srcSet and sizes attributes
 */

export interface ResponsiveImageUrls {
  original: string;
  avif: string;
  variants: {
    [key: string]: {
      webp: string;
      avif: string;
      dimensions: {
        width: number;
        height: number;
      };
    };
  };
}

export interface ImageVariant {
  webp: string;
  avif: string;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Generate srcSet for WebP images
 */
export function generateWebPSrcSet(imageUrls: ResponsiveImageUrls): string {
  const variants = Object.values(imageUrls.variants);
  return variants
    .map(variant => `${variant.webp} ${variant.dimensions.width}w`)
    .join(', ');
}

/**
 * Generate srcSet for AVIF images
 */
export function generateAVIFSrcSet(imageUrls: ResponsiveImageUrls): string {
  const variants = Object.values(imageUrls.variants);
  return variants
    .map(variant => `${variant.avif} ${variant.dimensions.width}w`)
    .join(', ');
}

/**
 * Get appropriate sizes attribute based on component type
 */
export function getSizesAttribute(componentType: 'hero' | 'product-card' | 'product-detail' | 'collection-grid'): string {
  switch (componentType) {
    case 'hero':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw';
    case 'product-card':
      return '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';
    case 'product-detail':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'collection-grid':
      return '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';
    default:
      return '100vw';
  }
}

/**
 * Get the best image variant for a given viewport width
 */
export function getBestImageVariant(imageUrls: ResponsiveImageUrls, viewportWidth: number): ImageVariant {
  const variants = Object.values(imageUrls.variants);
  
  // Sort variants by width (ascending)
  const sortedVariants = variants.sort((a, b) => a.dimensions.width - b.dimensions.width);
  
  // Find the best variant that's at least as large as the viewport width
  for (const variant of sortedVariants) {
    if (variant.dimensions.width >= viewportWidth) {
      return variant;
    }
  }
  
  // If no variant is large enough, return the largest one
  return sortedVariants[sortedVariants.length - 1] || variants[0];
}

/**
 * Generate a base64 LQIP (Low Quality Image Placeholder) for blur effect
 */
export function generateLQIP(imageUrls: ResponsiveImageUrls): string {
  // For now, return a simple base64 encoded 1x1 transparent pixel
  // In a production environment, you might want to generate actual LQIPs
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

/**
 * Check if the browser supports AVIF format
 */
export function supportsAVIF(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    // Create a 1x1 AVIF image
    const avifData = new Uint8Array([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
      0x00, 0x00, 0x00, 0x00, 0x61, 0x76, 0x69, 0x66, 0x6D, 0x69, 0x61, 0x66,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    const blob = new Blob([avifData], { type: 'image/avif' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });
  } catch {
    return false;
  }
}

/**
 * Get the optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'avif' | 'fallback' {
  if (typeof window === 'undefined') return 'webp';
  
  // Check if AVIF is supported
  if (supportsAVIF()) {
    return 'avif';
  }
  
  // Check if WebP is supported
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'fallback';
    
    const webpData = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x26, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20, 0x1A, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9D,
      0x01, 0x2A, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]);
    
    const blob = new Blob([webpData], { type: 'image/webp' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve('webp');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('fallback');
      };
      img.src = url;
    });
  } catch {
    return 'fallback';
  }
} 