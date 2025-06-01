'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';

/**
 * Analytics component that tracks page views and user interactions
 * This is a client-side only component that doesn't render anything visible
 */
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Track page views whenever the URL changes
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return; // Don't track in development
    }
    
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Track page view
    trackPageView(url);
    
    // Track section visits based on URL structure
    trackSectionVisit(pathname);
  }, [pathname, searchParams]);
  
  // Track user interactions (clicks, form submissions, etc.)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return; // Don't track in development
    }
    
    // Add event listeners for tracking user interactions
    const trackInteraction = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const interactionType = getInteractionType(target);
      
      if (interactionType) {
        trackEvent({
          category: 'User Interaction',
          action: interactionType,
          label: getElementIdentifier(target),
          value: 1
        });
      }
    };
    
    // Add click tracking globally
    document.addEventListener('click', trackInteraction);
    
    return () => {
      document.removeEventListener('click', trackInteraction);
    };
  }, []);
  
  return null; // This component doesn't render anything
}

// Helper functions for tracking
function trackPageView(url: string) {
  console.log(`[Analytics] Page View: ${url}`);
  
  // In production, integrate with your analytics service:
  // Example: Google Analytics 4
  /*
  window.gtag?.('event', 'page_view', {
    page_location: url,
    page_title: document.title
  });
  */
  
  // Example: Custom analytics endpoint
  /*
  fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })
  });
  */
}

function trackSectionVisit(pathname: string) {
  // Extract section from URL path
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'dashboard') {
    const section = parts[1];
    const subsection = parts.length > 2 ? parts[2] : null;
    
    console.log(`[Analytics] Section Visit: ${section}${subsection ? ` > ${subsection}` : ''}`);
    
    // In production, track section popularity:
    /*
    window.gtag?.('event', 'section_visit', {
      section_name: section,
      subsection_name: subsection
    });
    */
  }
}

interface TrackEventParams {
  category: string;
  action: string;
  label: string;
  value?: number;
}

function trackEvent({ category, action, label, value }: TrackEventParams) {
  console.log(`[Analytics] Event: ${category} > ${action} > ${label}${value !== undefined ? ` (${value})` : ''}`);
  
  // In production, integrate with your analytics service:
  /*
  window.gtag?.('event', action, {
    event_category: category,
    event_label: label,
    value: value
  });
  */
}

function getInteractionType(element: HTMLElement): string | null {
  // Identify the type of element that was interacted with
  if (element.closest('a') || element.closest('button')) {
    return 'Click';
  }
  
  if (element.closest('form')) {
    return 'Form Interaction';
  }
  
  if (element.closest('input') || element.closest('select') || element.closest('textarea')) {
    return 'Input Interaction';
  }
  
  // Navigation specific tracking
  if (element.closest('[data-nav-item]')) {
    return 'Navigation';
  }
  
  return null;
}

function getElementIdentifier(element: HTMLElement): string {
  // Try to get a meaningful identifier for the element
  
  // Check for data attributes first
  const dataId = element.getAttribute('data-analytics-id');
  if (dataId) return dataId;
  
  // Check for common identifiers
  const id = element.id;
  if (id) return `#${id}`;
  
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // For links and buttons, use the text content
  if (element.tagName === 'A' || element.tagName === 'BUTTON') {
    const text = element.textContent?.trim();
    if (text) return text.substring(0, 50); // Limit length
  }
  
  // For navigation items
  const navItem = element.closest('[data-nav-item]');
  if (navItem) {
    const navName = navItem.getAttribute('data-nav-item');
    if (navName) return `Nav: ${navName}`;
  }
  
  // Fallback to element type with some context
  return element.tagName.toLowerCase();
}
