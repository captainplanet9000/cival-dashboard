'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useI18n, SUPPORTED_LOCALES, Locale } from '@/i18n/i18n-provider';
import { useToast } from '@/hooks/use-toast';

interface LanguageSwitcherProps {
  /** Variant to display the language switcher */
  variant?: 'dropdown' | 'buttons' | 'iconOnly';
  /** Additional class name */
  className?: string;
}

// Language display names
const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ru: 'Русский',
};

// Language flags using Unicode flag sequences
const LANGUAGE_FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  de: '🇩🇪',
  fr: '🇫🇷',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
  ru: '🇷🇺',
};

/**
 * Language switcher component for changing the application language
 */
export function LanguageSwitcher({ variant = 'dropdown', className }: LanguageSwitcherProps) {
  const { locale, setLocale, t, availableLocales } = useI18n();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    try {
      await setLocale(newLocale);
      
      toast({
        title: t('settings.languageChanged'),
        description: `${LANGUAGE_FLAGS[newLocale]} ${LANGUAGE_NAMES[newLocale]}`,
      });
    } catch (error) {
      console.error('Error changing language:', error);
      
      toast({
        title: t('errors.error'),
        description: t('errors.languageChangeError'),
        variant: 'destructive',
      });
    }
  };

  // Render dropdown variant
  if (variant === 'dropdown') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t('settings.selectLanguage')}
            className={cn("flex items-center justify-between", className)}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden md:inline-block">{LANGUAGE_FLAGS[locale]} {LANGUAGE_NAMES[locale]}</span>
              <span className="inline-block md:hidden">{LANGUAGE_FLAGS[locale]}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder={t('settings.searchLanguage')} />
            <CommandEmpty>{t('common.noResults')}</CommandEmpty>
            <CommandGroup>
              {availableLocales.map((lang) => (
                <CommandItem
                  key={lang}
                  value={lang}
                  onSelect={() => {
                    handleLanguageChange(lang);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{LANGUAGE_FLAGS[lang]}</span>
                    <span>{LANGUAGE_NAMES[lang]}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      locale === lang ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Render buttons variant
  if (variant === 'buttons') {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {availableLocales.map((lang) => (
          <Button
            key={lang}
            variant={locale === lang ? "default" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange(lang)}
            aria-label={`${t('settings.switchTo')} ${LANGUAGE_NAMES[lang]}`}
            className={locale === lang ? "pointer-events-none" : ""}
          >
            <span className="mr-1">{LANGUAGE_FLAGS[lang]}</span>
            <span className="hidden sm:inline">{LANGUAGE_NAMES[lang]}</span>
          </Button>
        ))}
      </div>
    );
  }

  // Render icon-only variant
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={t('settings.selectLanguage')}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandGroup>
            {availableLocales.map((lang) => (
              <CommandItem
                key={lang}
                value={lang}
                onSelect={() => handleLanguageChange(lang)}
              >
                <div className="flex items-center gap-2">
                  <span>{LANGUAGE_FLAGS[lang]}</span>
                  <span>{LANGUAGE_NAMES[lang]}</span>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    locale === lang ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
