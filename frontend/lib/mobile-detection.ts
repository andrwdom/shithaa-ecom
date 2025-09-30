/**
 * Mobile and Instagram Browser Detection
 * Optimizes experience for mobile users and Instagram in-app browser
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isInstagram: boolean;
  isFacebook: boolean;
  isInAppBrowser: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browserType: 'instagram' | 'facebook' | 'safari' | 'chrome' | 'firefox' | 'other';
  connectionType: 'slow' | 'fast' | 'unknown';
}

/**
 * Detect device and browser information
 */
export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    // Server-side default
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isInstagram: false,
      isFacebook: false,
      isInAppBrowser: false,
      isIOS: false,
      isAndroid: false,
      deviceType: 'desktop',
      browserType: 'other',
      connectionType: 'unknown'
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const userAgentLower = userAgent.toLowerCase();

  // Detect Instagram in-app browser
  const isInstagram = userAgentLower.includes('instagram');
  
  // Detect Facebook in-app browser
  const isFacebook = userAgentLower.includes('fban') || userAgentLower.includes('fbav');
  
  // Detect any in-app browser
  const isInAppBrowser = isInstagram || isFacebook || 
    userAgentLower.includes('wv') || // WebView
    userAgentLower.includes('line/');

  // Detect mobile/tablet
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  // Detect OS
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isMobile) deviceType = 'mobile';
  else if (isTablet) deviceType = 'tablet';

  // Detect browser type
  let browserType: 'instagram' | 'facebook' | 'safari' | 'chrome' | 'firefox' | 'other' = 'other';
  if (isInstagram) browserType = 'instagram';
  else if (isFacebook) browserType = 'facebook';
  else if (userAgentLower.includes('safari') && !userAgentLower.includes('chrome')) browserType = 'safari';
  else if (userAgentLower.includes('chrome')) browserType = 'chrome';
  else if (userAgentLower.includes('firefox')) browserType = 'firefox';

  // Detect connection speed
  let connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      // Effective type: slow-2g, 2g, 3g, 4g
      if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
        connectionType = 'slow';
      } else if (conn.effectiveType === '3g' || conn.effectiveType === '4g') {
        connectionType = 'fast';
      }
      
      // Also check saveData flag
      if (conn.saveData) {
        connectionType = 'slow';
      }
    }
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    isInstagram,
    isFacebook,
    isInAppBrowser,
    isIOS,
    isAndroid,
    deviceType,
    browserType,
    connectionType
  };
}

/**
 * Get optimal image quality based on device and connection
 */
export function getOptimalImageQuality(deviceInfo: DeviceInfo): number {
  if (deviceInfo.connectionType === 'slow') {
    return 60; // Low quality for slow connections
  }
  
  if (deviceInfo.isInstagram || deviceInfo.isFacebook) {
    return 70; // Medium quality for in-app browsers
  }
  
  if (deviceInfo.isMobile) {
    return 75; // Medium-high quality for mobile
  }
  
  return 85; // High quality for desktop
}

/**
 * Get optimal image sizes based on device
 */
export function getOptimalImageSizes(deviceInfo: DeviceInfo): string {
  if (deviceInfo.isMobile) {
    return '(max-width: 640px) 100vw, (max-width: 768px) 90vw, 640px';
  }
  
  if (deviceInfo.isTablet) {
    return '(max-width: 1024px) 80vw, (max-width: 1280px) 60vw, 768px';
  }
  
  return '(max-width: 1280px) 50vw, (max-width: 1920px) 33vw, 1024px';
}

/**
 * Check if should use lazy loading
 */
export function shouldLazyLoad(deviceInfo: DeviceInfo, isAboveFold: boolean = false): boolean {
  // Never lazy load above-the-fold content
  if (isAboveFold) {
    return false;
  }
  
  // Always lazy load on slow connections
  if (deviceInfo.connectionType === 'slow') {
    return true;
  }
  
  // Lazy load on mobile/in-app browsers
  if (deviceInfo.isMobile || deviceInfo.isInAppBrowser) {
    return true;
  }
  
  return true; // Default to lazy loading for performance
}

/**
 * Get bundle strategy based on device
 */
export function getBundleStrategy(deviceInfo: DeviceInfo): 'minimal' | 'standard' | 'full' {
  if (deviceInfo.connectionType === 'slow') {
    return 'minimal';
  }
  
  if (deviceInfo.isMobile || deviceInfo.isInAppBrowser) {
    return 'standard';
  }
  
  return 'full';
}

/**
 * Check if should prefetch resources
 */
export function shouldPrefetch(deviceInfo: DeviceInfo): boolean {
  // Don't prefetch on slow connections
  if (deviceInfo.connectionType === 'slow') {
    return false;
  }
  
  // Prefetch on desktop with fast connection
  return deviceInfo.isDesktop && deviceInfo.connectionType === 'fast';
}

/**
 * Get performance budget based on device
 */
export function getPerformanceBudget(deviceInfo: DeviceInfo): {
  maxBundleSize: number;
  maxImageSize: number;
  maxRenderTime: number;
} {
  if (deviceInfo.isMobile || deviceInfo.isInAppBrowser) {
    return {
      maxBundleSize: 200, // 200KB
      maxImageSize: 100, // 100KB
      maxRenderTime: 2000 // 2 seconds
    };
  }
  
  return {
    maxBundleSize: 500, // 500KB
    maxImageSize: 300, // 300KB
    maxRenderTime: 1000 // 1 second
  };
}

/**
 * Log device info for analytics
 */
export function logDeviceInfo(deviceInfo: DeviceInfo): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 Device Info:', {
      deviceType: deviceInfo.deviceType,
      browserType: deviceInfo.browserType,
      isInstagram: deviceInfo.isInstagram,
      connectionType: deviceInfo.connectionType
    });
  }
}

/**
 * Hook for React components
 */
export function useDeviceDetection(): DeviceInfo {
  if (typeof window === 'undefined') {
    return detectDevice();
  }

  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(detectDevice());

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(detectDevice());
    };

    // Update on resize
    window.addEventListener('resize', updateDeviceInfo);
    
    // Update on connection change
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', updateDeviceInfo);
    }

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', updateDeviceInfo);
      }
    };
  }, []);

  return deviceInfo;
}

// Need React import for the hook
import React from 'react';
