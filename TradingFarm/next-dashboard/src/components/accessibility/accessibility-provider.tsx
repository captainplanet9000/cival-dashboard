'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n/i18n-provider';

// Define accessibility settings and features
export interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  textSpacing: boolean;
  focusIndicators: boolean;
  keyboardMode: boolean;
  screenReaderMode: boolean;
}

// Define context interface
interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => Promise<void>;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  toggleTextSpacing: () => void;
  toggleFocusIndicators: () => void;
  toggleKeyboardMode: () => void;
  toggleScreenReaderMode: () => void;
  isLoading: boolean;
}

// Default settings
const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 100, // 100% is default size
  highContrast: false,
  reducedMotion: false,
  textSpacing: false,
  focusIndicators: true,
  keyboardMode: false,
  screenReaderMode: false,
};

// Create context with default values
const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

/**
 * Accessibility provider component that manages accessibility settings
 * and applies them to the application
 */
export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useI18n();

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      
      try {
        // First check localStorage
        const savedSettings = localStorage.getItem('tf-accessibility-settings');
        
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        } else {
          // If not in localStorage, check user profile in Supabase
          const supabase = createBrowserClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const { data, error } = await supabase
              .from('user_preferences')
              .select('accessibility_settings')
              .eq('user_id', session.user.id)
              .single();
              
            if (data?.accessibility_settings) {
              setSettings(data.accessibility_settings);
              // Save to localStorage for faster access next time
              localStorage.setItem('tf-accessibility-settings', JSON.stringify(data.accessibility_settings));
            }
          }
        }
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
    
    // Check for prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      if (prefersReducedMotion) {
        setSettings(prev => ({ ...prev, reducedMotion: true }));
      }
    }
  }, []);

  // Apply settings whenever they change
  useEffect(() => {
    if (!isLoading) {
      // Apply font size
      document.documentElement.style.setProperty('--font-size-multiplier', `${settings.fontSize}%`);
      
      // Apply high contrast
      if (settings.highContrast) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      
      // Apply reduced motion
      if (settings.reducedMotion) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
      
      // Apply text spacing
      if (settings.textSpacing) {
        document.documentElement.classList.add('increased-spacing');
      } else {
        document.documentElement.classList.remove('increased-spacing');
      }
      
      // Apply focus indicators
      if (settings.focusIndicators) {
        document.documentElement.classList.add('focus-visible');
      } else {
        document.documentElement.classList.remove('focus-visible');
      }
      
      // Apply keyboard mode
      if (settings.keyboardMode) {
        document.documentElement.classList.add('keyboard-mode');
      } else {
        document.documentElement.classList.remove('keyboard-mode');
      }
      
      // Apply screen reader optimizations
      if (settings.screenReaderMode) {
        document.documentElement.classList.add('sr-mode');
      } else {
        document.documentElement.classList.remove('sr-mode');
      }
      
      // Save settings to localStorage
      localStorage.setItem('tf-accessibility-settings', JSON.stringify(settings));
    }
  }, [settings, isLoading]);

  // Update settings in state and database
  const updateSettings = async (newSettings: Partial<AccessibilitySettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      // Save to Supabase if user is logged in
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            { 
              user_id: session.user.id,
              accessibility_settings: updatedSettings,
            },
            { onConflict: 'user_id' }
          );
          
        if (error) {
          console.error('Error saving accessibility settings:', error);
          toast({
            title: t('errors.serverError'),
            description: t('errors.unknownError'),
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error updating accessibility settings:', error);
    }
    
    return Promise.resolve();
  };

  // Font size helpers
  const increaseFontSize = () => {
    if (settings.fontSize < 200) {
      updateSettings({ fontSize: settings.fontSize + 10 });
      toast({
        title: t('accessibility.increaseText'),
        description: `${settings.fontSize + 10}%`,
      });
    }
  };
  
  const decreaseFontSize = () => {
    if (settings.fontSize > 70) {
      updateSettings({ fontSize: settings.fontSize - 10 });
      toast({
        title: t('accessibility.decreaseText'),
        description: `${settings.fontSize - 10}%`,
      });
    }
  };
  
  const resetFontSize = () => {
    updateSettings({ fontSize: 100 });
    toast({
      title: t('accessibility.resetText'),
      description: '100%',
    });
  };

  // Toggle helpers
  const toggleHighContrast = () => {
    updateSettings({ highContrast: !settings.highContrast });
    toast({
      title: t('accessibility.highContrast'),
      description: !settings.highContrast ? t('common.enabled') : t('common.disabled'),
    });
  };
  
  const toggleReducedMotion = () => {
    updateSettings({ reducedMotion: !settings.reducedMotion });
    toast({
      title: t('settings.reducedMotion'),
      description: !settings.reducedMotion ? t('common.enabled') : t('common.disabled'),
    });
  };
  
  const toggleTextSpacing = () => {
    updateSettings({ textSpacing: !settings.textSpacing });
    toast({
      title: t('settings.textSpacing'),
      description: !settings.textSpacing ? t('common.enabled') : t('common.disabled'),
    });
  };
  
  const toggleFocusIndicators = () => {
    updateSettings({ focusIndicators: !settings.focusIndicators });
    toast({
      title: t('settings.focusIndicators'),
      description: !settings.focusIndicators ? t('common.enabled') : t('common.disabled'),
    });
  };
  
  const toggleKeyboardMode = () => {
    updateSettings({ keyboardMode: !settings.keyboardMode });
    toast({
      title: t('settings.keyboardMode'),
      description: !settings.keyboardMode ? t('common.enabled') : t('common.disabled'),
    });
  };
  
  const toggleScreenReaderMode = () => {
    updateSettings({ screenReaderMode: !settings.screenReaderMode });
    toast({
      title: t('accessibility.screenReader'),
      description: !settings.screenReaderMode ? t('common.enabled') : t('common.disabled'),
    });
  };

  // Event listeners for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if Alt key is pressed
      if (e.altKey) {
        switch (e.key) {
          case '+':
            e.preventDefault();
            increaseFontSize();
            break;
          case '-':
            e.preventDefault();
            decreaseFontSize();
            break;
          case '0':
            e.preventDefault();
            resetFontSize();
            break;
          case 'c':
            e.preventDefault();
            toggleHighContrast();
            break;
          case 'm':
            e.preventDefault();
            toggleReducedMotion();
            break;
          case 's':
            e.preventDefault();
            toggleTextSpacing();
            break;
          case 'k':
            e.preventDefault();
            toggleKeyboardMode();
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings]);

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    toggleHighContrast,
    toggleReducedMotion,
    toggleTextSpacing,
    toggleFocusIndicators,
    toggleKeyboardMode,
    toggleScreenReaderMode,
    isLoading,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook for accessing accessibility features
 */
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  
  return context;
}
