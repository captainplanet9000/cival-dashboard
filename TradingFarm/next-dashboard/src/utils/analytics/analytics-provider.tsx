'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// Define analytics event types for better TypeScript support
export type EventCategory = 
  | 'page_view' 
  | 'user_action' 
  | 'trading' 
  | 'strategy' 
  | 'risk_management'
  | 'account'
  | 'performance'
  | 'error';

export type EventAction =
  | 'view'
  | 'click'
  | 'submit'
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'activate'
  | 'deactivate'
  | 'error'
  | 'login'
  | 'logout'
  | 'register';

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  category: EventCategory;
  action: EventAction;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

export interface UserTraits {
  userId: string;
  email?: string;
  name?: string;
  createdAt?: string;
  accountType?: string;
  tradingExperience?: string;
  preferredExchanges?: string[];
  riskProfile?: string;
  features?: string[];
  subscription?: {
    plan: string;
    status: string;
    startDate: string;
    endDate?: string;
  };
  [key: string]: any;
}

// Define analytics provider props
interface AnalyticsProviderProps {
  children: ReactNode;
  googleAnalyticsId?: string;
  mixpanelToken?: string;
  amplitudeApiKey?: string;
  disableAnalytics?: boolean;
  debugMode?: boolean;
}

// Analytics context interface
interface AnalyticsContextType {
  trackEvent: (
    category: EventCategory, 
    action: EventAction, 
    label?: string, 
    value?: number, 
    properties?: Record<string, any>
  ) => void;
  trackPageView: (pageTitle?: string, pageProperties?: Record<string, any>) => void;
  identifyUser: (userId: string, traits?: Partial<UserTraits>) => void;
  resetAnalytics: () => void;
  sessionId: string;
  isAnalyticsReady: boolean;
  isAnalyticsEnabled: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;
  getEventHistory: () => AnalyticsEvent[];
}

// Create the context
const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

// Analytics providers implementation
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ 
  children,
  googleAnalyticsId,
  mixpanelToken,
  amplitudeApiKey,
  disableAnalytics = false,
  debugMode = false
}) => {
  const [sessionId] = useState<string>(() => {
    // Try to retrieve existing session ID or create a new one
    if (typeof window !== 'undefined') {
      const existingSessionId = localStorage.getItem('tf_analytics_session_id');
      if (existingSessionId) return existingSessionId;
    }
    return uuidv4();
  });

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isAnalyticsReady, setIsAnalyticsReady] = useState<boolean>(false);
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState<boolean>(!disableAnalytics);
  const [eventHistory, setEventHistory] = useState<AnalyticsEvent[]>([]);
  
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize analytics providers
  useEffect(() => {
    if (!isAnalyticsEnabled) return;

    const initGoogleAnalytics = async () => {
      if (!googleAnalyticsId) return;
      
      try {
        // Load Google Analytics script
        await loadScript(`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`);
        
        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
          window.dataLayer.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', googleAnalyticsId, {
          send_page_view: false, // We'll handle this manually
          anonymize_ip: true,
          cookie_flags: 'SameSite=None;Secure'
        });
        
        if (debugMode) {
          console.log('Google Analytics initialized');
        }
      } catch (error) {
        console.error('Failed to initialize Google Analytics:', error);
      }
    };

    const initMixpanel = async () => {
      if (!mixpanelToken) return;
      
      try {
        // Load Mixpanel script
        await loadScript('https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js');
        
        // Initialize Mixpanel
        window.mixpanel.init(mixpanelToken, {
          debug: debugMode,
          track_pageview: false,
          persistence: 'localStorage'
        });
        
        if (debugMode) {
          console.log('Mixpanel initialized');
        }
      } catch (error) {
        console.error('Failed to initialize Mixpanel:', error);
      }
    };

    const initAmplitude = async () => {
      if (!amplitudeApiKey) return;
      
      try {
        // Load Amplitude script
        await loadScript('https://cdn.amplitude.com/libs/amplitude-8.5.0-min.gz.js');
        
        // Initialize Amplitude
        window.amplitude.getInstance().init(amplitudeApiKey, null, {
          logLevel: debugMode ? window.amplitude.LogLevel.Debug : window.amplitude.LogLevel.Error,
          includeUtm: true,
          includeReferrer: true
        });
        
        if (debugMode) {
          console.log('Amplitude initialized');
        }
      } catch (error) {
        console.error('Failed to initialize Amplitude:', error);
      }
    };

    const initialize = async () => {
      // Initialize analytics providers in parallel
      await Promise.all([
        initGoogleAnalytics(),
        initMixpanel(),
        initAmplitude()
      ]);
      
      // Save session ID
      if (typeof window !== 'undefined') {
        localStorage.setItem('tf_analytics_session_id', sessionId);
      }
      
      setIsAnalyticsReady(true);
    };

    initialize();

    // Cleanup on unmount
    return () => {
      // Nothing specific to clean up for these providers
    };
  }, [googleAnalyticsId, mixpanelToken, amplitudeApiKey, isAnalyticsEnabled, sessionId, debugMode]);

  // Track page views when route changes
  useEffect(() => {
    if (isAnalyticsReady && isAnalyticsEnabled && pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      trackPageView(document.title, { url });
    }
  }, [pathname, searchParams, isAnalyticsReady, isAnalyticsEnabled]);

  // Load a script dynamically
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'));
        return;
      }
      
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      
      document.head.appendChild(script);
    });
  };

  // Track an event across all configured providers
  const trackEvent = (
    category: EventCategory,
    action: EventAction,
    label?: string,
    value?: number,
    properties?: Record<string, any>
  ) => {
    if (!isAnalyticsEnabled || !isAnalyticsReady) return;

    const eventProperties = {
      ...(properties || {}),
      label,
      value,
      sessionId,
      userId,
      timestamp: new Date().toISOString()
    };

    const eventName = `${category}_${action}`;

    // Track with Google Analytics
    if (window.gtag && googleAnalyticsId) {
      window.gtag('event', eventName, {
        event_category: category,
        event_label: label,
        value: value,
        ...properties
      });
    }

    // Track with Mixpanel
    if (window.mixpanel && mixpanelToken) {
      window.mixpanel.track(eventName, eventProperties);
    }

    // Track with Amplitude
    if (window.amplitude && amplitudeApiKey) {
      window.amplitude.getInstance().logEvent(eventName, eventProperties);
    }

    // Add to local event history
    const event: AnalyticsEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      category,
      action,
      label,
      value,
      properties
    };

    setEventHistory(prevHistory => [...prevHistory.slice(-999), event]); // Keep last 1000 events

    if (debugMode) {
      console.log(`[Analytics] Tracked event: ${eventName}`, event);
    }
  };

  // Track a page view
  const trackPageView = (pageTitle?: string, pageProperties?: Record<string, any>) => {
    if (!isAnalyticsEnabled || !isAnalyticsReady) return;

    const title = pageTitle || document.title;
    const url = pageProperties?.url || window.location.href;
    const path = pageProperties?.path || pathname;

    const properties = {
      title,
      url,
      path,
      ...(pageProperties || {})
    };

    // Track with Google Analytics
    if (window.gtag && googleAnalyticsId) {
      window.gtag('event', 'page_view', {
        page_title: title,
        page_location: url,
        page_path: path
      });
    }

    // Track with Mixpanel
    if (window.mixpanel && mixpanelToken) {
      window.mixpanel.track('page_view', properties);
    }

    // Track with Amplitude
    if (window.amplitude && amplitudeApiKey) {
      window.amplitude.getInstance().logEvent('page_view', properties);
    }

    // Add to local event history
    const event: AnalyticsEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      category: 'page_view',
      action: 'view',
      label: title,
      properties
    };

    setEventHistory(prevHistory => [...prevHistory.slice(-999), event]);

    if (debugMode) {
      console.log(`[Analytics] Tracked page view: ${title}`, event);
    }
  };

  // Identify user
  const identifyUser = (id: string, traits?: Partial<UserTraits>) => {
    if (!isAnalyticsEnabled || !isAnalyticsReady) return;

    setUserId(id);

    const userTraits = {
      ...(traits || {}),
      userId: id
    };

    // Identify with Google Analytics
    if (window.gtag && googleAnalyticsId) {
      window.gtag('set', { user_id: id });
      if (traits) {
        window.gtag('set', 'user_properties', traits);
      }
    }

    // Identify with Mixpanel
    if (window.mixpanel && mixpanelToken) {
      window.mixpanel.identify(id);
      if (traits) {
        window.mixpanel.people.set(traits);
      }
    }

    // Identify with Amplitude
    if (window.amplitude && amplitudeApiKey) {
      const identify = new window.amplitude.Identify();
      if (traits) {
        Object.entries(traits).forEach(([key, value]) => {
          identify.set(key, value);
        });
      }
      window.amplitude.getInstance().setUserId(id);
      window.amplitude.getInstance().identify(identify);
    }

    if (debugMode) {
      console.log(`[Analytics] Identified user: ${id}`, userTraits);
    }
  };

  // Reset analytics (for logout)
  const resetAnalytics = () => {
    setUserId(undefined);

    // Reset Google Analytics
    if (window.gtag && googleAnalyticsId) {
      window.gtag('set', { user_id: undefined });
    }

    // Reset Mixpanel
    if (window.mixpanel && mixpanelToken) {
      window.mixpanel.reset();
    }

    // Reset Amplitude
    if (window.amplitude && amplitudeApiKey) {
      window.amplitude.getInstance().setUserId(null);
      window.amplitude.getInstance().regenerateDeviceId();
    }

    // Generate a new session ID
    const newSessionId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_analytics_session_id', newSessionId);
    }

    if (debugMode) {
      console.log('[Analytics] Reset analytics state');
    }
  };

  // Get event history (mainly for debugging)
  const getEventHistory = () => {
    return eventHistory;
  };

  return (
    <AnalyticsContext.Provider
      value={{
        trackEvent,
        trackPageView,
        identifyUser,
        resetAnalytics,
        sessionId,
        isAnalyticsReady,
        isAnalyticsEnabled,
        setAnalyticsEnabled,
        getEventHistory
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

// Hook to use analytics
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// Extend Window interface to include analytics globals
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    mixpanel: any;
    amplitude: any;
  }
}
