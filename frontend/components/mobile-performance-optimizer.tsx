'use client';

import { useEffect, useState } from 'react';
import { detectDevice } from '@/lib/mobile-detection';

interface MobileOptimizerProps {
  children: React.ReactNode;
}

/**
 * Mobile Performance Optimizer Component
 * Applies Instagram browser and mobile-specific optimizations
 */
export default function MobilePerformanceOptimizer({ children }: MobileOptimizerProps) {
  const [deviceInfo, setDeviceInfo] = useState(() => detectDevice());
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    const device = detectDevice();
    setDeviceInfo(device);
    
    // Apply mobile optimizations
    if (device.isMobile || device.isInstagram || device.connectionType === 'slow') {
      // Reduce animation duration for Instagram browser
      if (device.isInstagram) {
        document.documentElement.style.setProperty('--animation-duration', '0.2s');
      }
      
      // Optimize for slow connections
      if (device.connectionType === 'slow') {
        document.documentElement.style.setProperty('--animation-duration', '0s');
        document.documentElement.style.setProperty('--transition-duration', '0s');
      }
      
      // Add mobile class for styling optimizations
      document.documentElement.classList.add('mobile-optimized');
      
      setIsOptimized(true);
    }
    
    // Preconnect to important domains for faster loading
    const preconnectLinks = [
      'https://fonts.googleapis.com',
      'https://shithaa.in',
    ];
    
    preconnectLinks.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
    
    // DNS prefetch for external resources
    const dnsPrefetchLinks = [
      'https://api.shithaa.in',
      'https://cdnjs.cloudflare.com',
    ];
    
    dnsPrefetchLinks.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
    
  }, []);

  // Show optimization indicator for Instagram users
  if (deviceInfo.isInstagram && !isOptimized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="text-center p-8">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Optimizing for Instagram</h2>
          <p className="text-sm text-gray-600">We're making this fast for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${deviceInfo.isMobile ? 'mobile-layout' : ''} ${deviceInfo.isInstagram ? 'instagram-browser' : ''}`}>
      {children}
      
      {/* Mobile performance styles */}
      <style jsx global>{`
        .mobile-optimized * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .mobile-optimized img {
          will-change: auto;
        }
        
        .mobile-layout {
          font-size: 16px; /* Prevent zoom on iOS */
        }
        
        .instagram-browser {
          /* Specific optimizations for Instagram browser */
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        
        .instagram-browser * {
          /* Reduce complexity for Instagram browser */
          backface-visibility: hidden;
          perspective: 1000px;
        }
        
        @media (max-width: 768px) {
          .mobile-optimized {
            /* Reduce scroll bounce on iOS */
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }
        }
      `}</style>
    </div>
  );
}
