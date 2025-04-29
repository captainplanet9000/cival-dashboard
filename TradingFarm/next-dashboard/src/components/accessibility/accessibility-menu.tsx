'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Accessibility, 
  TextCursorInput, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Zap,
  Keyboard,
  Eye,
  MousePointer2,
  Type
} from 'lucide-react';
import { useAccessibility } from './accessibility-provider';
import { useI18n } from '@/i18n/i18n-provider';

interface AccessibilityMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Function to close the menu */
  onClose: () => void;
}

/**
 * Accessibility settings menu component
 * Follows standardized modal pattern with isOpen/onClose props
 */
export function AccessibilityMenu({ isOpen, onClose }: AccessibilityMenuProps) {
  const { 
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
    toggleScreenReaderMode
  } = useAccessibility();
  
  const { t } = useI18n();

  return (
    <DialogWrapper
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            {t('settings.accessibility')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.accessibilityDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Font Size Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="flex items-center gap-2">
                <Type className="h-4 w-4" /> 
                {t('settings.fontSize')}
              </Label>
              <span className="text-sm font-medium">{settings.fontSize}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Slider
                id="font-size"
                value={[settings.fontSize]}
                min={70}
                max={200}
                step={10}
                onValueChange={(value) => updateSettings({ fontSize: value[0] })}
                className="flex-1"
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={decreaseFontSize}
                aria-label={t('accessibility.decreaseText')}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetFontSize}
                aria-label={t('accessibility.resetText')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={increaseFontSize}
                aria-label={t('accessibility.increaseText')}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              {t('settings.fontSizeKeyboardShortcut')}
            </div>
          </div>
          
          <Separator />
          
          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="high-contrast" className="flex items-center gap-2 cursor-pointer">
                <Zap className="h-4 w-4" />
                {t('accessibility.highContrast')}
              </Label>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="reduced-motion" className="flex items-center gap-2 cursor-pointer">
                <Zap className="h-4 w-4" />
                {t('settings.reducedMotion')}
              </Label>
              <Switch
                id="reduced-motion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="text-spacing" className="flex items-center gap-2 cursor-pointer">
                <TextCursorInput className="h-4 w-4" />
                {t('settings.textSpacing')}
              </Label>
              <Switch
                id="text-spacing"
                checked={settings.textSpacing}
                onCheckedChange={(checked) => updateSettings({ textSpacing: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="focus-indicators" className="flex items-center gap-2 cursor-pointer">
                <MousePointer2 className="h-4 w-4" />
                {t('settings.focusIndicators')}
              </Label>
              <Switch
                id="focus-indicators"
                checked={settings.focusIndicators}
                onCheckedChange={(checked) => updateSettings({ focusIndicators: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="keyboard-mode" className="flex items-center gap-2 cursor-pointer">
                <Keyboard className="h-4 w-4" />
                {t('settings.keyboardMode')}
              </Label>
              <Switch
                id="keyboard-mode"
                checked={settings.keyboardMode}
                onCheckedChange={(checked) => updateSettings({ keyboardMode: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="screen-reader-mode" className="flex items-center gap-2 cursor-pointer">
                <Eye className="h-4 w-4" />
                {t('accessibility.screenReader')}
              </Label>
              <Switch
                id="screen-reader-mode"
                checked={settings.screenReaderMode}
                onCheckedChange={(checked) => updateSettings({ screenReaderMode: checked })}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogWrapper>
  );
}
