'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useNotification } from '@/hooks/use-notification';

export type OnboardingStep = 
  | 'welcome'
  | 'exchange-connection'
  | 'risk-profile'
  | 'strategy-creation'
  | 'dashboard-tour'
  | 'complete';

interface OnboardingState {
  active: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepProgress: number; // 0-100 percent
}

interface OnboardingContextType {
  state: OnboardingState;
  startOnboarding: () => void;
  skipOnboarding: () => void;
  completeStep: (step: OnboardingStep) => void;
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// The sequence of onboarding steps
const ONBOARDING_SEQUENCE: OnboardingStep[] = [
  'welcome',
  'exchange-connection',
  'risk-profile',
  'strategy-creation',
  'dashboard-tour',
  'complete'
];

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>({
    active: false,
    currentStep: 'welcome',
    completedSteps: [],
    stepProgress: 0,
  });
  const notification = useNotification();
  const [initialized, setInitialized] = useState(false);

  // Load onboarding state from user preferences on mount
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setInitialized(true);
          return;
        }
        
        const { data, error } = await supabase
          .from('user_preferences')
          .select('onboarding_completed, onboarding_state')
          .eq('user_id', session.user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading onboarding state:', error);
          setInitialized(true);
          return;
        }
        
        // If the user has no preferences record yet or hasn't completed onboarding
        if (!data || !data.onboarding_completed) {
          // Check if they have any activity that would indicate they're not a new user
          const { count, error: countError } = await supabase
            .from('trading_strategies')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id);
            
          // Only show onboarding for users with no existing strategies
          if (!countError && count === 0) {
            setState(prevState => ({
              ...prevState,
              active: true,
              ...(data?.onboarding_state || {})
            }));
          }
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
        setInitialized(true);
      }
    };
    
    loadOnboardingState();
  }, []);

  // Save onboarding state to user preferences when it changes
  useEffect(() => {
    const saveOnboardingState = async () => {
      if (!initialized) return;
      
      try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: session.user.id,
            onboarding_completed: state.currentStep === 'complete' && !state.active,
            onboarding_state: {
              currentStep: state.currentStep,
              completedSteps: state.completedSteps,
              stepProgress: state.stepProgress
            },
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (error) {
        console.error('Failed to save onboarding state:', error);
      }
    };
    
    saveOnboardingState();
  }, [state, initialized]);

  const startOnboarding = () => {
    setState({
      active: true,
      currentStep: 'welcome',
      completedSteps: [],
      stepProgress: 0,
    });
    notification.info('Onboarding Started', 'Welcome to Trading Farm! Let\'s get you set up.');
  };

  const skipOnboarding = async () => {
    setState(prev => ({
      ...prev,
      active: false,
    }));
    
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: session.user.id,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      }
    } catch (error) {
      console.error('Failed to mark onboarding as skipped:', error);
    }
    
    notification.info('Onboarding Skipped', 'You can always restart the onboarding process from the help menu.');
  };

  const completeStep = (step: OnboardingStep) => {
    setState(prev => {
      const newCompletedSteps = prev.completedSteps.includes(step) 
        ? prev.completedSteps 
        : [...prev.completedSteps, step];
        
      // Calculate new progress percentage
      const progress = Math.round((newCompletedSteps.length / (ONBOARDING_SEQUENCE.length - 1)) * 100);
      
      return {
        ...prev,
        completedSteps: newCompletedSteps,
        stepProgress: progress
      };
    });
  };

  const goToStep = (step: OnboardingStep) => {
    if (!ONBOARDING_SEQUENCE.includes(step)) return;
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    setState(prev => {
      const currentIndex = ONBOARDING_SEQUENCE.indexOf(prev.currentStep);
      if (currentIndex === ONBOARDING_SEQUENCE.length - 1) return prev;
      
      const nextStep = ONBOARDING_SEQUENCE[currentIndex + 1];
      completeStep(prev.currentStep);
      
      // If we're going to the complete step, mark as not active
      const newActive = nextStep !== 'complete' ? prev.active : false;
      
      return {
        ...prev,
        currentStep: nextStep,
        active: newActive
      };
    });
  };

  const previousStep = () => {
    setState(prev => {
      const currentIndex = ONBOARDING_SEQUENCE.indexOf(prev.currentStep);
      if (currentIndex === 0) return prev;
      
      const prevStep = ONBOARDING_SEQUENCE[currentIndex - 1];
      return {
        ...prev,
        currentStep: prevStep
      };
    });
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        startOnboarding,
        skipOnboarding,
        completeStep,
        goToStep,
        nextStep,
        previousStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
