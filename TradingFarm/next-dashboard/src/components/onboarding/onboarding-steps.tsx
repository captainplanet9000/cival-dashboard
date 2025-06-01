'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboarding, type OnboardingStep } from './onboarding-provider';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  ShieldCheck,
  LineChart,
  Settings,
  BarChart3
} from 'lucide-react';

interface OnboardingStepCardProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  onNext?: () => Promise<boolean> | boolean;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  hideBackButton?: boolean;
  hideNextButton?: boolean;
}

export function OnboardingStepCard({
  children,
  title,
  description,
  onNext,
  onBack,
  nextLabel = 'Continue',
  backLabel = 'Back',
  hideBackButton = false,
  hideNextButton = false
}: OnboardingStepCardProps) {
  const { state, nextStep, previousStep } = useOnboarding();
  const [loading, setLoading] = React.useState(false);

  const handleNext = async () => {
    if (onNext) {
      setLoading(true);
      try {
        const canProceed = await onNext();
        if (canProceed) {
          nextStep();
        }
      } catch (error) {
        console.error('Error in onNext handler:', error);
      } finally {
        setLoading(false);
      }
    } else {
      nextStep();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      previousStep();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <Progress value={state.stepProgress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!hideBackButton && (
          <Button variant="ghost" onClick={handleBack} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        )}
        {hideBackButton && <div />}
        
        {!hideNextButton && (
          <Button onClick={handleNext} disabled={loading}>
            {nextLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// Step 1: Welcome
export function WelcomeStep() {
  return (
    <OnboardingStepCard
      title="Welcome to Trading Farm"
      description="Let's set up your trading environment in a few simple steps"
      hideBackButton
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-6 rounded-full">
            <BarChart3 className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">Your complete trading platform</h3>
          <p className="text-muted-foreground">
            Trading Farm helps you create, test, and deploy automated trading strategies with ease.
            Follow this quick setup to get started.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="flex flex-col items-center text-center p-4 bg-secondary/50 rounded-lg">
            <ShieldCheck className="h-8 w-8 text-primary mb-2" />
            <h4 className="font-medium">Secure & Private</h4>
            <p className="text-sm text-muted-foreground">Your keys never leave your browser</p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4 bg-secondary/50 rounded-lg">
            <Settings className="h-8 w-8 text-primary mb-2" />
            <h4 className="font-medium">Customizable</h4>
            <p className="text-sm text-muted-foreground">Tailor strategies to your needs</p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4 bg-secondary/50 rounded-lg">
            <LineChart className="h-8 w-8 text-primary mb-2" />
            <h4 className="font-medium">Data-Driven</h4>
            <p className="text-sm text-muted-foreground">Advanced analytics & backtesting</p>
          </div>
        </div>
      </div>
    </OnboardingStepCard>
  );
}

// Step 2: Exchange Connection
export function ExchangeConnectionStep() {
  return (
    <OnboardingStepCard
      title="Connect Your Exchange"
      description="Link your exchange account to start trading"
    >
      <div className="space-y-4">
        <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-600 dark:text-yellow-400">Secure Connection</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-500">
              Your API keys are encrypted and stored locally in your browser.
              They are never sent to our servers, ensuring maximum security.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {['Binance', 'Coinbase', 'Kraken', 'Kucoin', 'BitGet', 'Bybit'].map((exchange) => (
            <Button 
              key={exchange} 
              variant="outline" 
              className="h-auto py-6 flex flex-col items-center justify-center gap-2"
            >
              <img 
                src={`/logos/${exchange.toLowerCase()}.svg`}
                alt={`${exchange} logo`}
                className="h-8 w-8 mb-2"
                onError={(e) => {
                  // Fallback to text if image doesn't load
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span>{exchange}</span>
              <span className="text-xs text-muted-foreground">Connect</span>
            </Button>
          ))}
        </div>
        
        <div className="text-center mt-4">
          <Button variant="link" size="sm">
            See all supported exchanges
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </OnboardingStepCard>
  );
}

// Step 3: Risk Profile Setup
export function RiskProfileStep() {
  return (
    <OnboardingStepCard
      title="Set Up Risk Management"
      description="Configure your risk parameters to protect your capital"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {['Conservative', 'Moderate', 'Aggressive'].map((profile, index) => (
            <div 
              key={profile} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`
                  h-10 w-10 rounded-full flex items-center justify-center mr-4
                  ${index === 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : ''}
                  ${index === 1 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' : ''}
                  ${index === 2 ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : ''}
                `}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium">{profile}</h4>
                  <p className="text-sm text-muted-foreground">
                    {index === 0 && 'Low risk, steady growth. Max drawdown: 10%'}
                    {index === 1 && 'Balanced approach. Max drawdown: 20%'}
                    {index === 2 && 'Higher risk, higher reward. Max drawdown: 30%'}
                  </p>
                </div>
              </div>
              <CheckCircle className="h-5 w-5 text-primary opacity-0" />
            </div>
          ))}
        </div>
        
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Custom Risk Profile
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Want more control? Create a custom risk profile with detailed parameters.
          </p>
          <Button variant="outline" size="sm" className="mt-2">
            Customize Parameters
          </Button>
        </div>
      </div>
    </OnboardingStepCard>
  );
}

// Step 4: Strategy Creation
export function StrategyCreationStep() {
  return (
    <OnboardingStepCard
      title="Create Your First Strategy"
      description="Choose how you want to start trading"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-5 hover:bg-accent/50 cursor-pointer">
            <h3 className="font-medium text-lg">Template Strategy</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Choose from proven strategies to get started quickly
            </p>
            <Button size="sm">Browse Templates</Button>
          </div>
          
          <div className="border rounded-lg p-5 hover:bg-accent/50 cursor-pointer">
            <h3 className="font-medium text-lg">Create from Scratch</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Build a custom strategy with our visual editor
            </p>
            <Button size="sm" variant="outline">Create Strategy</Button>
          </div>
        </div>
        
        <div className="border rounded-lg p-5">
          <h3 className="font-medium text-lg">Import Existing</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Import your existing strategies from files or code
          </p>
          <Button size="sm" variant="secondary">Import Strategy</Button>
        </div>
      </div>
    </OnboardingStepCard>
  );
}

// Step 5: Dashboard Tour
export function DashboardTourStep() {
  return (
    <OnboardingStepCard
      title="Dashboard Tour"
      description="Get familiar with your trading dashboard"
      nextLabel="Complete Setup"
    >
      <div className="space-y-6">
        <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
          <img 
            src="/dashboard-preview.jpg" 
            alt="Dashboard Preview" 
            className="w-full h-full object-cover" 
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium">Trading Terminal</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage your active trades in real-time
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium">Performance Analytics</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Track your strategy performance with detailed metrics
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium">Strategy Management</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Create, edit, and optimize your trading strategies
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium">Risk Controls</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Manage risk parameters and circuit breakers
            </p>
          </div>
        </div>
      </div>
    </OnboardingStepCard>
  );
}

// Step 6: Complete
export function CompleteStep() {
  const { skipOnboarding } = useOnboarding();
  
  return (
    <OnboardingStepCard
      title="Setup Complete!"
      description="You're ready to start trading with Trading Farm"
      nextLabel="Start Trading"
      hideBackButton
      onNext={() => {
        skipOnboarding();
        return true;
      }}
    >
      <div className="text-center space-y-6 py-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <h3 className="text-xl font-medium">Your trading environment is ready!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          You've successfully set up your Trading Farm account. You're now ready to create, test, 
          and deploy profitable trading strategies.
        </p>
        
        <div className="pt-4">
          <Button size="lg" onClick={() => skipOnboarding()}>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </OnboardingStepCard>
  );
}

// Onboarding Step Switcher
export function OnboardingStepSwitcher() {
  const { state } = useOnboarding();
  
  if (!state.active) return null;
  
  const renderStep = (step: OnboardingStep) => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep />;
      case 'exchange-connection':
        return <ExchangeConnectionStep />;
      case 'risk-profile':
        return <RiskProfileStep />;
      case 'strategy-creation':
        return <StrategyCreationStep />;
      case 'dashboard-tour':
        return <DashboardTourStep />;
      case 'complete':
        return <CompleteStep />;
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {renderStep(state.currentStep)}
      </div>
    </div>
  );
}
