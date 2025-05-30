/**
 * Enhanced Theme Switcher with Accessibility for Trading Farm Dashboard
 * Provides theme customization with color preferences and accessibility options
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { Button } from '@/components/ui/button-standardized';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  Moon, 
  Sun, 
  Laptop, 
  Palette, 
  Eye, 
  EyeOff, 
  ZoomIn, 
  PanelLeftClose, 
  PanelLeftOpen,
  Check,
  ChevronsDown,
  ChevronsUp,
  Diamond
} from 'lucide-react';

// Theme accent colors
const accentColors = [
  { name: 'Default', value: 'default', className: 'bg-primary' },
  { name: 'Blue', value: 'blue', className: 'bg-blue-500' },
  { name: 'Green', value: 'green', className: 'bg-green-500' },
  { name: 'Purple', value: 'purple', className: 'bg-purple-500' },
  { name: 'Red', value: 'red', className: 'bg-red-500' },
  { name: 'Orange', value: 'orange', className: 'bg-orange-500' },
  { name: 'Yellow', value: 'yellow', className: 'bg-yellow-500' },
  { name: 'Pink', value: 'pink', className: 'bg-pink-500' },
];

// Font size options
const fontSizeOptions = [
  { name: 'Small', value: 'small' },
  { name: 'Default', value: 'default' },
  { name: 'Large', value: 'large' },
  { name: 'Extra Large', value: 'x-large' },
];

// Animation reduction options
const animationOptions = [
  { name: 'Full Animations', value: 'default' },
  { name: 'Reduced Animations', value: 'reduced' },
  { name: 'No Animations', value: 'none' },
];

// Default theme preferences
const defaultThemePreferences = {
  fontSize: 'default',
  accentColor: 'default',
  animations: 'default', 
  highContrast: false,
  reduceTransparency: false,
  denseMode: false,
};

interface ThemeSwitcherProps {
  userId: string;
  compact?: boolean;
  className?: string;
}

/**
 * Enhanced theme switcher with color and accessibility preferences
 */
export function ThemeSwitcher({ 
  userId, 
  compact = false,
  className 
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState(defaultThemePreferences);
  const [mounted, setMounted] = useState(false);
  const supabase = createBrowserClient<Database>();
  
  // Load user preferences from database
  useEffect(() => {
    const loadThemePreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme, dashboard_preferences')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') { // Record not found
            // Create default preferences
            await supabase.from('user_preferences').insert({
              user_id: userId,
              theme: 'system',
              dashboard_preferences: {
                theme: defaultThemePreferences
              }
            });
          } else {
            console.error('Error loading theme preferences:', error);
          }
        } else if (data) {
          // Set theme from database
          if (data.theme) {
            setTheme(data.theme);
          }
          
          // Set preferences from database
          const dashboardPreferences = data.dashboard_preferences as Record<string, any>;
          if (dashboardPreferences?.theme) {
            setPreferences({
              ...defaultThemePreferences,
              ...dashboardPreferences.theme
            });
          }
        }
      } catch (error) {
        console.error('Failed to load theme preferences:', error);
      }
    };
    
    loadThemePreferences();
  }, [userId, setTheme, supabase]);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Save theme preferences to database
  const saveThemePreferences = async (newTheme?: string, newPreferences?: typeof preferences) => {
    try {
      const updatedTheme = newTheme || theme;
      const updatedPreferences = newPreferences || preferences;
      
      await supabase.from('user_preferences').upsert({
        user_id: userId,
        theme: updatedTheme,
        dashboard_preferences: {
          theme: updatedPreferences
        }
      }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Failed to save theme preferences:', error);
    }
  };
  
  // Update theme
  const updateTheme = (newTheme: string) => {
    setTheme(newTheme);
    saveThemePreferences(newTheme);
  };
  
  // Update preferences
  const updatePreferences = (key: keyof typeof preferences, value: any) => {
    const updatedPreferences = {
      ...preferences,
      [key]: value
    };
    
    setPreferences(updatedPreferences);
    saveThemePreferences(undefined, updatedPreferences);
    
    // Apply CSS custom properties for the preferences
    applyThemePreferences(updatedPreferences);
  };
  
  // Apply theme preferences to the document
  const applyThemePreferences = (prefs: typeof preferences) => {
    // Apply font size
    switch (prefs.fontSize) {
      case 'small':
        document.documentElement.style.setProperty('--font-size-adjustment', '0.9');
        break;
      case 'large':
        document.documentElement.style.setProperty('--font-size-adjustment', '1.15');
        break;
      case 'x-large':
        document.documentElement.style.setProperty('--font-size-adjustment', '1.3');
        break;
      default:
        document.documentElement.style.setProperty('--font-size-adjustment', '1');
    }
    
    // Apply accent color
    document.documentElement.setAttribute('data-accent-color', prefs.accentColor);
    
    // Apply animation preferences
    document.documentElement.setAttribute('data-animation', prefs.animations);
    
    // Apply high contrast
    if (prefs.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Apply reduced transparency
    if (prefs.reduceTransparency) {
      document.documentElement.classList.add('reduce-transparency');
    } else {
      document.documentElement.classList.remove('reduce-transparency');
    }
    
    // Apply dense mode
    if (prefs.denseMode) {
      document.documentElement.classList.add('dense-mode');
    } else {
      document.documentElement.classList.remove('dense-mode');
    }
  };
  
  // Apply preferences when component mounts and when preferences change
  useEffect(() => {
    if (mounted) {
      applyThemePreferences(preferences);
    }
  }, [preferences, mounted]);
  
  // Don't render during SSR to avoid hydration mismatch
  if (!mounted) {
    return null;
  }
  
  // Get current theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-[1.2rem] w-[1.2rem]" />;
      case 'light':
        return <Sun className="h-[1.2rem] w-[1.2rem]" />;
      default:
        return <Laptop className="h-[1.2rem] w-[1.2rem]" />;
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={cn(
            "gap-1 focus-visible:ring-0 focus-visible:ring-offset-0",
            className
          )}
        >
          {getThemeIcon()}
          {!compact && <span>Theme</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Theme selection */}
        <DropdownMenuRadioGroup value={theme} onValueChange={updateTheme}>
          <DropdownMenuRadioItem value="light" className="gap-2">
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="gap-2">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="gap-2">
            <Laptop className="h-4 w-4" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        {/* Accent color */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Accent Color</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-48">
              {accentColors.map((color) => (
                <DropdownMenuItem 
                  key={color.value}
                  className="flex items-center gap-2"
                  onClick={() => updatePreferences('accentColor', color.value)}
                >
                  <div 
                    className={cn(
                      "h-4 w-4 rounded-full",
                      color.className
                    )} 
                  />
                  <span>{color.name}</span>
                  {preferences.accentColor === color.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        
        {/* Font size */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ZoomIn className="mr-2 h-4 w-4" />
            <span>Font Size</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-48">
              {fontSizeOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => updatePreferences('fontSize', option.value)}
                >
                  {option.name}
                  {preferences.fontSize === option.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        
        {/* Animations */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Diamond className="mr-2 h-4 w-4" />
            <span>Animations</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-48">
              {animationOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => updatePreferences('animations', option.value)}
                >
                  {option.name}
                  {preferences.animations === option.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Accessibility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* High contrast */}
        <DropdownMenuItem onClick={() => updatePreferences('highContrast', !preferences.highContrast)}>
          <Eye className="mr-2 h-4 w-4" />
          <span>High Contrast</span>
          <div className="ml-auto flex h-4 w-8 items-center">
            <Switch
              checked={preferences.highContrast}
              className="ml-auto"
            />
          </div>
        </DropdownMenuItem>
        
        {/* Reduce transparency */}
        <DropdownMenuItem onClick={() => updatePreferences('reduceTransparency', !preferences.reduceTransparency)}>
          <EyeOff className="mr-2 h-4 w-4" />
          <span>Reduce Transparency</span>
          <div className="ml-auto flex h-4 w-8 items-center">
            <Switch
              checked={preferences.reduceTransparency}
              className="ml-auto"
            />
          </div>
        </DropdownMenuItem>
        
        {/* Dense mode */}
        <DropdownMenuItem onClick={() => updatePreferences('denseMode', !preferences.denseMode)}>
          <PanelLeftClose className="mr-2 h-4 w-4" />
          <span>Dense UI Mode</span>
          <div className="ml-auto flex h-4 w-8 items-center">
            <Switch
              checked={preferences.denseMode}
              className="ml-auto"
            />
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSwitcher;
