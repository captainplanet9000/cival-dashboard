/**
 * Dashboard Onboarding Component for Trading Farm
 * Provides guided tooltips and help for new users
 */
'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { Button } from '@/components/ui/button-standardized';
import { Card } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  HelpCircle, 
  Settings, 
  LayoutDashboard, 
  Plus, 
  ArrowRight, 
  Check,
  X
} from 'lucide-react';

// Define onboarding steps and their content
const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Trading Farm Dashboard',
    description: 'Get familiar with your new trading dashboard. We\'ll show you the key features to help you get started.',
    targetSelector: 'body',
    position: 'center',
    showSkip: true,
  },
  {
    id: 'layouts',
    title: 'Dashboard Layouts',
    description: 'Switch between different dashboard layouts or create your own custom views.',
    targetSelector: '[data-onboarding="layouts"]',
    position: 'bottom',
    showSkip: true,
  },
  {
    id: 'edit-mode',
    title: 'Edit Mode',
    description: 'Toggle edit mode to customize your dashboard by adding, removing, or rearranging widgets.',
    targetSelector: '[data-onboarding="edit-mode"]',
    position: 'bottom',
    showSkip: true,
  },
  {
    id: 'add-widgets',
    title: 'Add Widgets',
    description: 'Click here to add new widgets to your dashboard when in edit mode.',
    targetSelector: '[data-onboarding="add-widget"]',
    position: 'bottom-end',
    showSkip: true,
  },
  {
    id: 'drag-widgets',
    title: 'Arrange Widgets',
    description: 'In edit mode, you can drag and drop widgets to rearrange them on your dashboard.',
    targetSelector: '[data-onboarding="widget"]',
    position: 'top',
    showSkip: true,
  },
  {
    id: 'widget-settings',
    title: 'Widget Settings',
    description: 'Customize each widget\'s settings to show exactly the data you need.',
    targetSelector: '[data-onboarding="widget-settings"]',
    position: 'right',
    showSkip: true,
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now know the basics of using your Trading Farm dashboard. You can access this tour anytime from the help menu.',
    targetSelector: 'body',
    position: 'center',
    showSkip: false,
  },
];

interface DashboardOnboardingProps {
  userId: string;
  forceShow?: boolean;
  onComplete?: () => void;
}

/**
 * Dashboard onboarding component with interactive tooltips
 * Guides new users through dashboard features
 */
export function DashboardOnboarding({
  userId,
  forceShow = false,
  onComplete
}: DashboardOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const supabase = createBrowserClient<Database>();
  
  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('dashboard_preferences')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          // If no preferences exist, create default entry
          if (error.code === 'PGRST116') {
            await supabase
              .from('user_preferences')
              .insert({
                user_id: userId,
                dashboard_preferences: { onboarding_completed: false }
              });
            
            setHasCompletedOnboarding(false);
            setShowOnboarding(true);
          } else {
            console.error('Error fetching onboarding status:', error);
          }
        } else if (data) {
          // Check if onboarding has been completed
          const preferences = data.dashboard_preferences as Record<string, any>;
          const completed = preferences?.onboarding_completed || false;
          
          setHasCompletedOnboarding(completed);
          setShowOnboarding(forceShow || !completed);
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    };
    
    checkOnboardingStatus();
  }, [userId, forceShow, supabase]);

  // Mark onboarding as complete
  const completeOnboarding = async () => {
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          dashboard_preferences: { onboarding_completed: true }
        }, { onConflict: 'user_id' });
      
      setHasCompletedOnboarding(true);
      setShowOnboarding(false);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
    }
  };

  // Skip onboarding
  const skipOnboarding = () => {
    completeOnboarding();
  };

  // Navigate to next step
  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  // Restart onboarding
  const restartOnboarding = () => {
    setCurrentStep(0);
    setShowOnboarding(true);
    setShowHelpDialog(false);
  };

  // Get current step
  const step = onboardingSteps[currentStep];
  
  // Calculate progress
  const progressPercentage = ((currentStep + 1) / onboardingSteps.length) * 100;

  // Render help button (always visible)
  const helpButton = (
    <div className="fixed bottom-4 right-4 z-50">
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full h-12 w-12 shadow-lg"
            onClick={() => setShowHelpDialog(true)}
          >
            <HelpCircle className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Get Help</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // Render onboarding step
  const renderOnboardingStep = () => {
    if (!step) return null;
    
    // For center positioned steps (welcome and completion)
    if (step.position === 'center') {
      return (
        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{step.title}</DialogTitle>
              <DialogDescription>{step.description}</DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <DialogFooter className="mt-6 flex justify-between">
              {step.showSkip ? (
                <Button variant="ghost" onClick={skipOnboarding}>
                  Skip Tour
                </Button>
              ) : (
                <div /> // Empty div to maintain layout
              )}
              
              <Button onClick={nextStep}>
                {currentStep < onboardingSteps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Got it
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    
    // For tooltips on specific elements
    return showOnboarding ? (
      <div className="z-50">
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40",
            showOnboarding ? "block" : "hidden"
          )}
          onClick={skipOnboarding}
        />
        
        <div
          className={cn(
            "fixed z-50 max-w-[320px] rounded-lg bg-card border shadow-lg p-4",
            {
              "top-4 left-1/2 -translate-x-1/2": step.position === 'top',
              "bottom-4 left-1/2 -translate-x-1/2": step.position === 'bottom',
              "left-4 top-1/2 -translate-y-1/2": step.position === 'left',
              "right-4 top-1/2 -translate-y-1/2": step.position === 'right',
              "bottom-4 right-4": step.position === 'bottom-end',
              "bottom-4 left-4": step.position === 'bottom-start',
            }
          )}
        >
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex justify-between">
              {step.showSkip ? (
                <Button variant="ghost" size="sm" onClick={skipOnboarding}>
                  Skip
                </Button>
              ) : (
                <div />
              )}
              
              <Button size="sm" onClick={nextStep}>
                {currentStep < onboardingSteps.length - 1 ? "Next" : "Finish"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : null;
  };

  // Render help dialog
  const renderHelpDialog = () => (
    <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dashboard Help</DialogTitle>
          <DialogDescription>
            Get help with using your Trading Farm dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <Button 
              variant="outline"
              className="w-full justify-start"
              onClick={restartOnboarding}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard Tour
              <span className="ml-auto text-xs text-muted-foreground">
                {hasCompletedOnboarding ? "Restart Tour" : "Start Tour"}
              </span>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setShowHelpDialog(false);
                // Would navigate to documentation
                console.log('Open documentation');
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Documentation
              <span className="ml-auto text-xs text-muted-foreground">
                View Docs
              </span>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setShowHelpDialog(false);
                // Would open keyboard shortcuts dialog
                console.log('Open keyboard shortcuts');
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Keyboard Shortcuts
              <span className="ml-auto text-xs text-muted-foreground">
                View Shortcuts
              </span>
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowHelpDialog(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <TooltipProvider>
      <>
        {helpButton}
        {renderOnboardingStep()}
        {renderHelpDialog()}
      </>
    </TooltipProvider>
  );
}

export default DashboardOnboarding;
