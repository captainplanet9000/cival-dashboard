'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { measureSync } from '@/utils/performance/performance-monitor';

// Define props for the OptimizedImage component
interface OptimizedImageProps {
  /** Source URL of the image */
  src: string;
  /** Alternative text for accessibility */
  alt: string;
  /** Width of image in pixels */
  width?: number;
  /** Height of image in pixels */
  height?: number;
  /** CSS class names to apply */
  className?: string;
  /** Priority loading flag */
  priority?: boolean;
  /** Loading strategy */
  loading?: 'eager' | 'lazy';
  /** Image object fit style */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Image object position style */
  objectPosition?: string;
  /** Quality of image (1-100) */
  quality?: number;
  /** Placeholder type */
  placeholder?: 'blur' | 'empty' | 'data:image/...' | undefined;
  /** Blur data URL for placeholder */
  blurDataURL?: string;
  /** Image sizes attribute */
  sizes?: string;
  /** Whether to apply lazy-loaded fade-in effect */
  fadeIn?: boolean;
  /** Whether to show fallback on error */
  withFallback?: boolean;
  /** Custom fallback image URL */
  fallbackSrc?: string;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Optimized image component with performance tracking,
 * fade-in effects, and error handling
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  objectFit = 'cover',
  objectPosition = 'center',
  quality = 85,
  placeholder,
  blurDataURL,
  sizes,
  fadeIn = true,
  withFallback = true,
  fallbackSrc = '/images/fallback-image.png',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [renderStartTime, setRenderStartTime] = useState(0);

  // Measure initial render time
  useEffect(() => {
    setRenderStartTime(performance.now());
  }, []);

  // Handle image loading and measure performance
  const handleImageLoad = () => {
    // Measure and record load time
    if (renderStartTime > 0) {
      measureSync(
        () => {
          const loadTime = performance.now() - renderStartTime;
          console.debug(`[OptimizedImage] Loaded in ${loadTime.toFixed(2)}ms: ${src}`);
        },
        `ImageLoad-${src.substring(0, 50)}`,
        'component-render',
        { src, width, height }
      );
    }

    setLoaded(true);
    onLoad?.();
  };

  // Handle image loading error
  const handleImageError = () => {
    console.warn(`[OptimizedImage] Failed to load image: ${src}`);
    setError(true);
    onError?.();
  };

  return (
    <div className={cn(
      'relative overflow-hidden',
      className
    )}>
      {/* Show actual image or fallback on error */}
      {!error ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          loading={loading}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            'transition-opacity duration-300',
            fadeIn && !loaded ? 'opacity-0' : 'opacity-100',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            objectFit === 'scale-down' && 'object-scale-down'
          )}
          style={{
            objectPosition
          }}
        />
      ) : withFallback ? (
        // Fallback image
        <Image
          src={fallbackSrc}
          alt={`Fallback for: ${alt}`}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'fill' && 'object-fill',
            objectFit === 'none' && 'object-none',
            objectFit === 'scale-down' && 'object-scale-down'
          )}
          style={{
            objectPosition
          }}
        />
      ) : null}

      {/* Loading state UI before the image loads */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}
