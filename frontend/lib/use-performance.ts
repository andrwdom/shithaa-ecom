'use client';

import { useEffect, useState } from 'react';
import { detectDevice, type DeviceInfo } from './mobile-detection';

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

/**
 * Performance monitoring hook
 * Tracks key performance metrics and sends to analytics
 */
export function usePerformance(pageName: string) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const device = detectDevice();
    setDeviceInfo(device);

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    // Measure Web Vitals
    measureWebVitals();

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, []);

  const measurePerformance = () => {
    try {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (!perfData) return;

      const metrics: Partial<PerformanceMetrics> = {
        pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        timeToInteractive: perfData.domInteractive - perfData.fetchStart,
      };

      setMetrics(metrics);

      // Log performance (only in development or for debugging)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Performance [${pageName}]:`, {
          ...metrics,
          device: deviceInfo?.deviceType,
          browser: deviceInfo?.browserType,
          connection: deviceInfo?.connectionType,
        });
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && deviceInfo) {
        logPerformanceToBackend(pageName, metrics, deviceInfo);
      }
    } catch (error) {
      console.error('Performance measurement error:', error);
    }
  };

  const measureWebVitals = () => {
    try {
      // Measure FCP (First Contentful Paint)
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        setMetrics(prev => ({ ...prev, firstContentfulPaint: fcpEntry.startTime }));
      }

      // Measure LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            setMetrics(prev => ({ ...prev, largestContentfulPaint: lastEntry.renderTime || lastEntry.loadTime }));
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Measure CLS (Cumulative Layout Shift)
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                setMetrics(prev => ({ ...prev, cumulativeLayoutShift: clsValue }));
              }
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // Measure FID (First Input Delay)
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              setMetrics(prev => ({ ...prev, firstInputDelay: entry.processingStart - entry.startTime }));
            }
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // PerformanceObserver not supported or failed
        }
      }
    } catch (error) {
      console.error('Web Vitals measurement error:', error);
    }
  };

  const logPerformanceToBackend = async (
    page: string,
    metrics: Partial<PerformanceMetrics>,
    device: DeviceInfo
  ) => {
    try {
      // Only log if performance is concerning
      const isSlowLoad = (metrics.pageLoadTime || 0) > 3000;
      const isPoorLCP = (metrics.largestContentfulPaint || 0) > 2500;
      const isPoorCLS = (metrics.cumulativeLayoutShift || 0) > 0.1;

      if (isSlowLoad || isPoorLCP || isPoorCLS) {
        // Log to backend for monitoring
        await fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page,
            metrics,
            device: {
              type: device.deviceType,
              browser: device.browserType,
              connection: device.connectionType,
              isInstagram: device.isInstagram,
            },
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Silent fail - don't break user experience
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  return { metrics, deviceInfo };
}

/**
 * Get performance rating
 */
export function getPerformanceRating(metrics: Partial<PerformanceMetrics>): 'good' | 'needs-improvement' | 'poor' {
  const { pageLoadTime, largestContentfulPaint, cumulativeLayoutShift, firstInputDelay } = metrics;

  // Check each metric
  const lcpRating = !largestContentfulPaint || largestContentfulPaint < 2500 ? 'good' : largestContentfulPaint < 4000 ? 'needs-improvement' : 'poor';
  const clsRating = !cumulativeLayoutShift || cumulativeLayoutShift < 0.1 ? 'good' : cumulativeLayoutShift < 0.25 ? 'needs-improvement' : 'poor';
  const fidRating = !firstInputDelay || firstInputDelay < 100 ? 'good' : firstInputDelay < 300 ? 'needs-improvement' : 'poor';
  const loadRating = !pageLoadTime || pageLoadTime < 2000 ? 'good' : pageLoadTime < 4000 ? 'needs-improvement' : 'poor';

  // Return worst rating
  if ([lcpRating, clsRating, fidRating, loadRating].includes('poor')) return 'poor';
  if ([lcpRating, clsRating, fidRating, loadRating].includes('needs-improvement')) return 'needs-improvement';
  return 'good';
}
