'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';

// Define supported languages
export const SUPPORTED_LOCALES = ['en', 'es', 'de', 'fr', 'ja', 'zh', 'ko', 'ru'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

// Define translation keys structure for TypeScript support
export type TranslationKey = string;

// Define translation record
export type TranslationRecord = Record<TranslationKey, string>;

// Define context interface
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
  isLoading: boolean;
  availableLocales: typeof SUPPORTED_LOCALES;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatPercentage: (value: number, decimals?: number) => string;
}

// Create context with default values
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Cache for translations
const translationCache: Record<Locale, TranslationRecord> = {} as Record<Locale, TranslationRecord>;

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

/**
 * Internationalization provider component that manages translations and locale settings
 */
export function I18nProvider({ children, initialLocale = 'en' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [translations, setTranslations] = useState<TranslationRecord>({});
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load translations for the current locale
  useEffect(() => {
    async function loadTranslations() {
      setIsLoading(true);
      
      try {
        // Check if translations are already cached
        if (translationCache[locale]) {
          setTranslations(translationCache[locale]);
          setIsLoading(false);
          return;
        }
        
        // Fetch translations from public folder
        const response = await fetch(`/locales/${locale}.json`);
        if (!response.ok) {
          console.error(`Failed to load translations for ${locale}`);
          // Fall back to English if translations not found
          if (locale !== 'en') {
            setLocaleState('en');
          }
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        
        // Cache the translations
        translationCache[locale] = data;
        setTranslations(data);
      } catch (error) {
        console.error('Error loading translations:', error);
        // Fall back to empty translations if loading fails
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTranslations();
  }, [locale]);

  // Save user's locale preference to database
  const setLocale = async (newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) {
      console.error(`Unsupported locale: ${newLocale}`);
      return;
    }
    
    setLocaleState(newLocale);
    
    // Store locale preference in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf-locale', newLocale);
    }
    
    try {
      // Save locale preference to user profile in Supabase
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      
      if (data.session) {
        // Update user preferences with new locale
        const { error: updateError } = await supabase
          .from('user_preferences')
          .upsert(
            { 
              user_id: data.session.user.id,
              language: newLocale,
              // Use upsert to create if not exists, update if exists
            },
            { onConflict: 'user_id' }
          );
          
        if (updateError) {
          console.error('Error updating user locale preference:', updateError);
        }
      }
    } catch (error) {
      console.error('Error saving locale preference:', error);
    }
    
    // Update URL to include locale (optional, depends on routing structure)
    // This requires appropriate Next.js middleware to handle locale prefixes
    // if (pathname) {
    //   const segments = pathname.split('/');
    //   if (SUPPORTED_LOCALES.includes(segments[1] as Locale)) {
    //     segments[1] = newLocale;
    //   } else {
    //     segments.splice(1, 0, newLocale);
    //   }
    //   router.push(segments.join('/'));
    // }
  };

  // Translate function that handles string interpolation
  const t = (key: TranslationKey, replacements?: Record<string, string | number>): string => {
    // Find translation or fall back to key
    let translation = translations[key] || key;
    
    // Apply replacements if provided
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        translation = translation.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value));
      });
    }
    
    return translation;
  };

  // Format a number according to the current locale
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, options).format(value);
  };

  // Format a date according to the current locale
  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  };

  // Format currency according to the current locale
  const formatCurrency = (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format percentage according to the current locale
  const formatPercentage = (value: number, decimals = 2): string => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  };

  // Load saved locale from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('tf-locale') as Locale | null;
      
      if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        setLocaleState(savedLocale);
      } else {
        // If no saved locale, use browser's language preference
        const browserLang = navigator.language.split('-')[0] as Locale;
        
        if (SUPPORTED_LOCALES.includes(browserLang)) {
          setLocaleState(browserLang);
        }
      }
    }
  }, []);

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t,
    isLoading,
    availableLocales: SUPPORTED_LOCALES,
    formatNumber,
    formatDate,
    formatCurrency,
    formatPercentage,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook for accessing internationalization features
 */
export function useI18n() {
  const context = useContext(I18nContext);
  
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  
  return context;
}
