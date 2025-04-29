'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useModal } from '@/components/ui/modal-controller';
import {
  PlusCircle,
  Settings,
  Wallet,
  Bell,
  BarChart2,
  Brain,
  RefreshCw,
  Target,
  Goal
} from 'lucide-react';

/**
 * Dashboard Action Bar Component
 * 
 * Provides a standardized set of action buttons that trigger modals through the modal controller.
 * This component complies with our modal standardization guidelines by using the modal controller
 * pattern instead of directly instantiating modals.
 */
export interface DashboardActionBarProps {
  farmId?: string;
  showAgents?: boolean;
  showExchanges?: boolean;
  showFunding?: boolean;
  showStrategies?: boolean;
  showGoals?: boolean;
  showAccount?: boolean;
  showNotifications?: boolean;
  showTerminal?: boolean;
  className?: string;
}

export function DashboardActionBar({
  farmId,
  showAgents = true,
  showExchanges = true,
  showFunding = true,
  showStrategies = true,
  showGoals = true,
  showAccount = true,
  showNotifications = true,
  showTerminal = true,
  className = '',
}: DashboardActionBarProps) {
  const { openModal } = useModal();

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {showAgents && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('createAgent', { farmId, onSuccess: () => {
            // Refresh agents list or show success message
          }})}
        >
          <Brain className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      )}
      
      {showExchanges && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('connectExchange', { onSuccess: (credentialId) => {
            // Refresh exchanges list or show success message
          }})}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Connect Exchange
        </Button>
      )}
      
      {showFunding && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('funding', { farmId, onSuccess: () => {
            // Refresh funding data or show success message
          }})}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Funding
        </Button>
      )}
      
      {showStrategies && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('createStrategy', { onSuccess: (strategyId) => {
            // Navigate to strategy details or show success message
          }})}
        >
          <Target className="h-4 w-4 mr-2" />
          New Strategy
        </Button>
      )}
      
      {showGoals && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('createGoal', { farmId, onSuccess: (goalId) => {
            // Navigate to goal details or show success message
          }})}
        >
          <Goal className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      )}
      
      {showTerminal && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('tradingTerminal')}
        >
          <BarChart2 className="h-4 w-4 mr-2" />
          Terminal
        </Button>
      )}
      
      {showAccount && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('accountSettings', { section: 'profile' })}
        >
          <Settings className="h-4 w-4 mr-2" />
          Account
        </Button>
      )}
      
      {showNotifications && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openModal('notifications')}
        >
          <Bell className="h-4 w-4 mr-2" />
          Notifications
        </Button>
      )}
    </div>
  );
}
