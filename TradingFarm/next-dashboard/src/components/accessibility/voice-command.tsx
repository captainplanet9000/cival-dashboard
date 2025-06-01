'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n/i18n-provider';
import { useRouter } from 'next/navigation';
import { useAccessibility } from './accessibility-provider';

interface VoiceCommandProps {
  /** Additional class names */
  className?: string;
}

/**
 * Voice command component for accessibility
 * Allows users to control the application using voice commands
 */
export function VoiceCommand({ className }: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const { 
    increaseFontSize, 
    decreaseFontSize, 
    resetFontSize,
    toggleHighContrast,
    toggleReducedMotion,
    toggleTextSpacing
  } = useAccessibility();

  // Set up speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if speech recognition is supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }
      
      // Initialize speech recognition
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US'; // Default to English
      
      // Set up event handlers
      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const command = event.results[current][0].transcript.toLowerCase().trim();
        setTranscript(command);
        
        // Process the command
        handleCommand(command);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error === 'no-speech') {
          // Just a warning, not a critical error
          return;
        }
        
        toast({
          title: t('errors.error'),
          description: t('accessibility.voiceRecognitionError'),
          variant: 'destructive',
        });
        
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        // Auto restart if still in listening mode
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, t, toast]);

  // Update recognition language when locale changes
  const { locale } = useI18n();
  useEffect(() => {
    if (recognitionRef.current) {
      // Map locale to appropriate recognition language
      const langMap: Record<string, string> = {
        en: 'en-US',
        es: 'es-ES',
        de: 'de-DE',
        fr: 'fr-FR',
        ja: 'ja-JP',
        zh: 'zh-CN',
        ko: 'ko-KR',
        ru: 'ru-RU',
      };
      
      recognitionRef.current.lang = langMap[locale] || 'en-US';
    }
  }, [locale]);

  // Process voice commands
  const handleCommand = (command: string) => {
    // Navigation commands
    if (command.includes('go to dashboard') || command.includes('open dashboard')) {
      router.push('/dashboard');
      speakResponse(t('accessibility.voiceNavigatingTo', { page: t('nav.dashboard') }));
    } else if (command.includes('go to trading') || command.includes('open trading')) {
      router.push('/trading');
      speakResponse(t('accessibility.voiceNavigatingTo', { page: t('nav.trading') }));
    } else if (command.includes('go to analytics') || command.includes('open analytics')) {
      router.push('/analytics');
      speakResponse(t('accessibility.voiceNavigatingTo', { page: t('nav.analytics') }));
    } else if (command.includes('go to portfolio') || command.includes('open portfolio')) {
      router.push('/portfolio');
      speakResponse(t('accessibility.voiceNavigatingTo', { page: t('nav.portfolio') }));
    } else if (command.includes('go to settings') || command.includes('open settings')) {
      router.push('/settings');
      speakResponse(t('accessibility.voiceNavigatingTo', { page: t('nav.settings') }));
    } else if (command.includes('go home') || command.includes('go to home')) {
      router.push('/');
      speakResponse(t('accessibility.voiceNavigatingTo', { page: t('nav.home') }));
    }
    
    // Accessibility commands
    else if (command.includes('increase font') || command.includes('larger text')) {
      increaseFontSize();
      speakResponse(t('accessibility.voiceFontIncreased'));
    } else if (command.includes('decrease font') || command.includes('smaller text')) {
      decreaseFontSize();
      speakResponse(t('accessibility.voiceFontDecreased'));
    } else if (command.includes('reset font') || command.includes('normal text')) {
      resetFontSize();
      speakResponse(t('accessibility.voiceFontReset'));
    } else if (command.includes('toggle contrast') || command.includes('high contrast')) {
      toggleHighContrast();
      speakResponse(t('accessibility.voiceContrastToggled'));
    } else if (command.includes('toggle motion') || command.includes('reduce motion')) {
      toggleReducedMotion();
      speakResponse(t('accessibility.voiceMotionToggled'));
    } else if (command.includes('toggle spacing') || command.includes('text spacing')) {
      toggleTextSpacing();
      speakResponse(t('accessibility.voiceSpacingToggled'));
    }
    
    // Help command
    else if (command.includes('help') || command.includes('commands') || command.includes('what can you do')) {
      setShowHelp(true);
      speakResponse(t('accessibility.voiceShowingHelp'));
    }
    
    // Stop listening command
    else if (command.includes('stop listening') || command.includes('turn off voice') || command.includes('exit voice')) {
      toggleListening();
      speakResponse(t('accessibility.voiceCommandStopped'));
    }
    
    // Command not recognized
    else {
      speakResponse(t('accessibility.voiceCommandNotRecognized'));
    }
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (!isSupported) {
      toast({
        title: t('errors.error'),
        description: t('accessibility.voiceRecognitionNotSupported'),
        variant: 'destructive',
      });
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast({
        title: t('accessibility.voiceCommand'),
        description: t('accessibility.voiceCommandStopped'),
      });
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
      toast({
        title: t('accessibility.voiceCommand'),
        description: t('accessibility.voiceCommandStarted'),
      });
      
      // Provide audio feedback
      speakResponse(t('accessibility.voiceCommandStarted'));
    }
  };

  // Text-to-speech response
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language based on current locale
      utterance.lang = locale;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleListening}
        className={className}
        aria-label={isListening ? t('accessibility.voiceCommandStop') : t('accessibility.voiceCommandStart')}
      >
        {isListening ? (
          <Mic className="h-5 w-5 text-primary" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>
      
      {/* Voice feedback indicator */}
      {isListening && (
        <div className="fixed bottom-4 right-4 bg-secondary text-secondary-foreground p-4 rounded-md shadow-md flex items-center gap-2 z-50 max-w-xs">
          <Volume2 className="h-5 w-5 animate-pulse" />
          <div>
            <p className="text-sm font-medium">{t('accessibility.listeningForCommands')}</p>
            {transcript && (
              <p className="text-xs opacity-80 truncate">
                "{transcript}"
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accessibility.voiceCommandHelp')}</DialogTitle>
            <DialogDescription>
              {t('accessibility.voiceCommandDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">{t('nav.navigation')}</h3>
              <ul className="text-sm space-y-1">
                <li>"Go to dashboard"</li>
                <li>"Open trading"</li>
                <li>"Go to analytics"</li>
                <li>"Open portfolio"</li>
                <li>"Go to settings"</li>
                <li>"Go home"</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">{t('settings.accessibility')}</h3>
              <ul className="text-sm space-y-1">
                <li>"Increase font" / "Larger text"</li>
                <li>"Decrease font" / "Smaller text"</li>
                <li>"Reset font" / "Normal text"</li>
                <li>"Toggle contrast" / "High contrast"</li>
                <li>"Toggle motion" / "Reduce motion"</li>
                <li>"Toggle spacing" / "Text spacing"</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">{t('common.other')}</h3>
              <ul className="text-sm space-y-1">
                <li>"Help" / "Commands" / "What can you do"</li>
                <li>"Stop listening" / "Turn off voice"</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
