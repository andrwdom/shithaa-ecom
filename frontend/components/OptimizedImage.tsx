'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { detectDevice, getOptimalImageQuality, shouldLazyLoad, getOptimalImageSizes } from '@/lib/mobile-detection';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  isAboveFold?: boolean;
  onLoadingComplete?: () => void;
}

/**
 * Optimized Image Component
 * - Detects device type and connection speed
 * - Adjusts image quality based on device
 * - Implements proper lazy loading
 * - Optimized for mobile and Instagram browser
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  objectFit = 'cover',
  isAboveFold = false,
  onLoadingComplete,
}: OptimizedImageProps) {
  const [deviceInfo, setDeviceInfo] = useState(() => detectDevice());
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setDeviceInfo(detectDevice());
  }, []);

  // Get optimal settings based on device
  const quality = getOptimalImageQuality(deviceInfo);
  const shouldLazy = !priority && shouldLazyLoad(deviceInfo, isAboveFold);
  const optimalSizes = sizes || getOptimalImageSizes(deviceInfo);

  // Handle loading complete
  const handleLoadingComplete = () => {
    setIsLoaded(true);
    onLoadingComplete?.();
  };

  // Handle error
  const handleError = () => {
    setError(true);
  };

  // Placeholder for slow connections
  const showPlaceholder = !isLoaded && (deviceInfo.connectionType === 'slow' || deviceInfo.isInAppBrowser);

  return (
    <div className={`relative ${className}`} style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}>
      {showPlaceholder && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
      )}
      {!error ? (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          quality={quality}
          sizes={optimalSizes}
          priority={priority}
          loading={shouldLazy ? 'lazy' : 'eager'}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          style={{ objectFit }}
          onLoad={handleLoadingComplete}
          onError={handleError}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
      ) : (
        <div className="flex items-center justify-center bg-gray-100 w-full h-full">
          <p className="text-gray-400 text-sm">Failed to load image</p>
        </div>
      )}
    </div>
  );
}
