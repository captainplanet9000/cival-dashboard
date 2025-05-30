'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, Minus, Key } from 'lucide-react';
import { useAccessibility } from './accessibility-provider';
import { useI18n } from '@/i18n/i18n-provider';

/**
 * Keyboard navigation overlay component
 * Provides visual keyboard shortcuts and improved keyboard navigation
 */
export function KeyboardNavigation() {
  const [showHelp, setShowHelp] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [activeElement, setActiveElement] = useState<string>('');
  const { settings } = useAccessibility();
  const { t } = useI18n();

  // Set up keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process when in keyboard mode
      if (!settings.keyboardMode) return;
      
      // Toggle keyboard shortcut help with ?
      if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
      
      // Toggle keyboard navigation overlay with Tab
      if (e.key === 'Tab') {
        setOverlayVisible(true);
        
        // Get active element info for display
        const element = document.activeElement;
        if (element instanceof HTMLElement) {
          let elementInfo = '';
          
          if (element.tagName === 'BUTTON') {
            elementInfo = element.textContent || 'Button';
          } else if (element.tagName === 'A') {
            elementInfo = element.textContent || 'Link';
          } else if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
            elementInfo = element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.tagName.toLowerCase();
          } else {
            elementInfo = element.tagName.toLowerCase();
          }
          
          setActiveElement(elementInfo);
        }
        
        // Hide overlay after a delay
        setTimeout(() => {
          setOverlayVisible(false);
        }, 1500);
      }
      
      // Handle additional keyboard shortcuts when in keyboard mode
      if (settings.keyboardMode) {
        // Alt+H to go home
        if (e.key === 'h' && e.altKey) {
          e.preventDefault();
          window.location.href = '/';
        }
        
        // Alt+D to go to dashboard
        if (e.key === 'd' && e.altKey) {
          e.preventDefault();
          window.location.href = '/dashboard';
        }
        
        // Alt+T to go to trading
        if (e.key === 't' && e.altKey) {
          e.preventDefault();
          window.location.href = '/trading';
        }
        
        // Alt+A to go to analytics
        if (e.key === 'a' && e.altKey) {
          e.preventDefault();
          window.location.href = '/analytics';
        }
        
        // Alt+P to go to portfolio
        if (e.key === 'p' && e.altKey) {
          e.preventDefault();
          window.location.href = '/portfolio';
        }
        
        // Alt+S to go to settings
        if (e.key === 's' && e.altKey && !e.ctrlKey) {
          e.preventDefault();
          window.location.href = '/settings';
        }
        
        // Esc to close dialogs or popups
        if (e.key === 'Escape') {
          // This is handled by default in most UI libraries,
          // but we could add custom behavior if needed
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings.keyboardMode, t]);

  // Keyboard overlay portal
  const KeyboardOverlay = () => {
    if (!overlayVisible) return null;
    
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-background/90 border border-border rounded-lg p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <span className="font-medium">{t('accessibility.keyboardFocus')}: </span>
            <span className="text-primary">{activeElement}</span>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Skip to content link for keyboard accessibility
  const SkipLink = () => {
    return createPortal(
      <a 
        href="#main-content" 
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.tabIndex = -1;
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        {t('accessibility.skipToContent')}
      </a>,
      document.body
    );
  };

  return (
    <>
      <SkipLink />
      <KeyboardOverlay />
      
      <DialogWrapper open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              {t('accessibility.keyboardShortcuts')}
            </DialogTitle>
            <DialogDescription>
              {t('accessibility.keyboardShortcutsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm">
                {t('nav.navigation')}
              </h3>
              <ul className="space-y-2">
                <ShortcutItem
                  keys={['Alt', 'H']}
                  description={t('nav.home')}
                />
                <ShortcutItem
                  keys={['Alt', 'D']}
                  description={t('nav.dashboard')}
                />
                <ShortcutItem
                  keys={['Alt', 'T']}
                  description={t('nav.trading')}
                />
                <ShortcutItem
                  keys={['Alt', 'A']}
                  description={t('nav.analytics')}
                />
                <ShortcutItem
                  keys={['Alt', 'P']}
                  description={t('nav.portfolio')}
                />
                <ShortcutItem
                  keys={['Alt', 'S']}
                  description={t('nav.settings')}
                />
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-sm">
                {t('settings.accessibility')}
              </h3>
              <ul className="space-y-2">
                <ShortcutItem
                  keys={['Alt', '+']}
                  description={t('accessibility.increaseText')}
                />
                <ShortcutItem
                  keys={['Alt', '-']}
                  description={t('accessibility.decreaseText')}
                />
                <ShortcutItem
                  keys={['Alt', '0']}
                  description={t('accessibility.resetText')}
                />
                <ShortcutItem
                  keys={['Alt', 'C']}
                  description={t('accessibility.highContrast')}
                />
                <ShortcutItem
                  keys={['Alt', 'M']}
                  description={t('settings.reducedMotion')}
                />
                <ShortcutItem
                  keys={['Ctrl/⌘', '?']}
                  description={t('accessibility.showKeyboardHelp')}
                />
              </ul>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row sm:justify-between">
            <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
              {t('accessibility.pressEscToClose')}
            </div>
            <Button onClick={() => setShowHelp(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogWrapper>
    </>
  );
}

// Helper component for displaying keyboard shortcuts
interface ShortcutItemProps {
  keys: string[];
  description: string;
}

function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-sm">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-semibold">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="text-xs">+</span>}
          </React.Fragment>
        ))}
      </div>
    </li>
  );
}
