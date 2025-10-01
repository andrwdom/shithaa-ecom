'use client';

import { useEffect, useState } from 'react';
import { detectDevice } from '@/lib/mobile-detection';

/**
 * Instagram Browser Optimizations
 * Handles specific performance issues in Instagram in-app browser
 */
export default function InstagramOptimizations() {
  const [deviceInfo, setDeviceInfo] = useState(() => detectDevice());

  useEffect(() => {
    const device = detectDevice();
    setDeviceInfo(device);
    
    if (device.isInstagram || device.isFacebook) {
      // Instagram-specific optimizations
      console.log('📱 Instagram browser detected - applying optimizations');
      
      // Disable smooth scrolling for better performance
      document.documentElement.style.scrollBehavior = 'auto';
      
      // Prevent zoom on input focus (Instagram browser issue)
      const metaViewport = document.querySelector('meta[name=viewport]');
      if (metaViewport) {
        metaViewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
      
      // Add Instagram-specific CSS optimizations
      const style = document.createElement('style');
      style.textContent = `
        /* Instagram browser optimizations */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        
        input, textarea, select {
          -webkit-user-select: text;
          user-select: text;
        }
        
        /* Reduce animation complexity */
        *, *::before, *::after {
          animation-duration: 0.1s !important;
          animation-delay: 0s !important;
          transition-duration: 0.1s !important;
          transition-delay: 0s !important;
        }
        
        /* Optimize scrolling */
        body {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        
        /* Reduce paint complexity */
        .hero-image, .product-image {
          transform: translateZ(0);
          will-change: auto;
        }
        
        /* Hide complex elements on slow connections */
        ${device.connectionType === 'slow' ? `
          .background-animation,
          .complex-gradient,
          .fancy-border {
            display: none !important;
          }
        ` : ''}
      `;
      document.head.appendChild(style);
      
      // Preload critical resources
      const criticalResources = [
        '/fonts/inter.woff2',
        '/api/hero-images?categoryId=maternity-feeding-wear&device=mobile&limit=1'
      ];
      
      criticalResources.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
      
      // Instagram navigation fix - prevent back button issues
      window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
          window.location.reload();
        }
      });
      
      // Optimize image loading for Instagram
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
      });
    }
  }, []);

  // Don't render anything - this is just for side effects
  return null;
}
