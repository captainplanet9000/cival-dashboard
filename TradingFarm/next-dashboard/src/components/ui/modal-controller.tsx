'use client';

import React from 'react';
import { AgentHealthDetailsModal } from '@/components/agent/AgentHealthDetailsModal';
import { ExchangeSettingsModal } from '@/components/exchange/ExchangeSettingsModal';
import { StrategyConfigModal } from '@/components/strategy/StrategyConfigModal';
import { RiskManagementModal } from '@/components/risk/RiskManagementModal';
import { PositionDetailsModal } from '@/components/position/PositionDetailsModal';
import { BacktestModal } from '@/components/strategy/BacktestModal';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { AccountSettingsModalNew } from "@/components/account/AccountSettingsModalNew";
import { TradingTerminalModal } from '@/components/trading/TradingTerminalModal';
// Dynamically import the default export AgentOrchestrationModal
const AgentOrchestrationModal = dynamic(() => import('@/components/agents/AgentOrchestrationModal'));
// Using dynamic imports for components with default exports
import dynamic from 'next/dynamic';

// Dynamically import components with default exports
const CreateAgentModal = dynamic(() => import('@/components/agents/CreateAgentModal'));
const FundingModal = dynamic(() => import('@/components/banking/FundingModal'));
const ExchangeConnectExchangeModal = dynamic(() => import('@/components/exchange/ConnectExchangeModal'));
const WalletConnectExchangeModal = dynamic(() => import('@/components/wallet/ConnectExchangeModal'));
const CreateFarmModal = dynamic(() => import('@/components/farms/CreateFarmModal'));
const CreateGoalModal = dynamic(() => import('@/components/goals/CreateGoalModal'));
const CreateStrategyModal = dynamic(() => import('@/components/strategies/CreateStrategyModal'));
import { logEvent } from '@/utils/logging';
import { ErrorBoundary } from './error-boundary';

// Modal types
// Define specific types for each modal's props
export type AgentHealthModalProps = {
  agentId: string;
};

export type ExchangeSettingsModalProps = {
  credential: any; // Replace with actual credential type
  onUpdate?: () => void;
};

export type StrategyConfigModalProps = {
  strategyId: string;
  onUpdate?: () => void;
};

export type RiskManagementModalProps = {
  riskProfileId: string;
  onUpdate?: () => void;
};

export type PositionDetailsModalProps = {
  positionId: string;
};

export type BacktestModalProps = {
  strategyId: string;
  params?: Record<string, any>;
};

export type NotificationsModalProps = {
  userId?: string;
  filter?: 'all' | 'unread' | 'important';
};

export type AccountSettingsModalProps = {
  section?: 'profile' | 'security' | 'preferences' | 'billing';
};

export type TradingTerminalModalProps = {
  symbol?: string;
  exchange?: string;
  onSuccess?: (orderId: string) => void;
};

export type AgentOrchestrationModalProps = {
  isOpen?: boolean;
  onClose?: () => void;
  farmId?: string;
  onSuccess?: () => void;
};

export type CreateAgentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  farmId?: string;
  onSuccess?: () => void;
};

export type FundingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset?: string | null;
  onSuccess?: () => void;
  userId?: string;
  farmId?: string;
};

export type ConnectExchangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (credentialId: string) => void;
};

export type CreateFarmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (farmId: string) => void;
};

export type CreateGoalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  farmId?: string;
  onSuccess?: (goalId: string) => void;
};

export type CreateStrategyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (strategyId: string) => void;
};

// Union type for all possible modal types
export type ModalType = 
  | 'agentHealth'
  | 'exchangeSettings'
  | 'strategyConfig'
  | 'riskManagement'
  | 'positionDetails'
  | 'backtest'
  | 'notifications'
  | 'accountSettings'
  | 'tradingTerminal'
  | 'agentOrchestration'
  | 'createAgent'
  | 'funding'
  | 'connectExchange'
  | 'createFarm'
  | 'createGoal'
  | 'createStrategy'
  | null;

// Map modal types to their props
export type ModalPropsMap = {
  'agentHealth': AgentHealthModalProps;
  'exchangeSettings': ExchangeSettingsModalProps;
  'strategyConfig': StrategyConfigModalProps;
  'riskManagement': RiskManagementModalProps;
  'positionDetails': PositionDetailsModalProps;
  'backtest': BacktestModalProps;
  'notifications': NotificationsModalProps;
  'accountSettings': AccountSettingsModalProps;
  'tradingTerminal': TradingTerminalModalProps;
  'agentOrchestration': AgentOrchestrationModalProps;
  'createAgent': CreateAgentModalProps;
  'funding': FundingModalProps;
  'connectExchange': ConnectExchangeModalProps;
  'createFarm': CreateFarmModalProps;
  'createGoal': CreateGoalModalProps;
  'createStrategy': CreateStrategyModalProps;
};

interface ModalState {
  type: ModalType;
  props: any; // Simplified to avoid TypeScript complexity
}

interface ModalContextType {
  showModal: (type: ModalType, props: any) => void;
  hideModal: () => void;
}

const ModalContext = React.createContext<ModalContextType>({
  showModal: () => {},
  hideModal: () => {},
});

export const useModal = () => React.useContext(ModalContext);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = React.useState<ModalState>({
    type: null,
    props: {},
  });

  const showModal = (type: ModalType, props: any) => {
    // Log modal usage for analytics
    if (type) {
      logEvent({
        category: 'modal',
        action: 'open',
        label: type,
        value: 1
      });
    }
    
    setModalState({ type, props });
  };

  const hideModal = () => {
    // Log modal closing for analytics
    if (modalState.type) {
      logEvent({
        category: 'modal',
        action: 'close',
        label: modalState.type,
        value: 1
      });
    }
    
    setModalState({ type: null, props: {} });
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      
      {modalState.type && (
        <ErrorBoundary
          fallback={(
            <div className="fixed inset-0 flex items-center justify-center bg-black/50">
              <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4 text-destructive">Error</h2>
                <p className="text-muted-foreground mb-4">Something went wrong while displaying this modal.</p>
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded" 
                  onClick={hideModal}
                >Close</button>
              </div>
            </div>
          )}
          onError={(error: Error) => {
            logEvent({
              category: 'error',
              action: 'modal_error',
              label: modalState.type || 'unknown',
              value: 1
            });
            console.error('Modal error:', error);
          }}
        >
          {(() => {
            switch (modalState.type) {
            case 'agentHealth':
              return (
                <AgentHealthDetailsModal
                  agentId={modalState.props.agentId}
                  isOpen={modalState.type === 'agentHealth'}
                  onClose={hideModal}
                />
              );
            case 'exchangeSettings':
              return (
                <ExchangeSettingsModal
                  credential={modalState.props.credential}
                  isOpen={modalState.type === 'exchangeSettings'}
                  onClose={hideModal}
                  onUpdate={modalState.props.onUpdate}
                />
              );
            case 'strategyConfig':
              return (
                <StrategyConfigModal
                  strategyId={modalState.props.strategyId}
                  isOpen={modalState.type === 'strategyConfig'}
                  onClose={hideModal}
                  onUpdate={modalState.props.onUpdate}
                />
              );
            case 'riskManagement':
              return (
                <RiskManagementModal
                  riskProfileId={modalState.props.riskProfileId}
                  isOpen={modalState.type === 'riskManagement'}
                  onClose={hideModal}
                  onUpdate={modalState.props.onUpdate}
                />
              );
            case 'positionDetails':
              return (
                <PositionDetailsModal
                  positionId={modalState.props.positionId}
                  isOpen={modalState.type === 'positionDetails'}
                  onClose={hideModal}
                />
              );
            case 'backtest':
              return (
                <BacktestModal
                  strategyId={modalState.props.strategyId}
                  params={modalState.props.params}
                  isOpen={modalState.type === 'backtest'}
                  onClose={hideModal}
                />
              );
            case 'notifications':
              return (
                <NotificationsModal
                  userId={modalState.props.userId}
                  filter={modalState.props.filter}
                  isOpen={modalState.type === 'notifications'}
                  onClose={hideModal}
                />
              );
            case 'accountSettings':
              return (
                <AccountSettingsModalNew
                  isOpen={modalState.type === 'accountSettings'}
                  onClose={hideModal}
                  section={modalState.props.section}
                />
              );
            case 'tradingTerminal':
              return (
                <TradingTerminalModal
                  symbol={modalState.props.symbol}
                  exchange={modalState.props.exchange}
                  isOpen={modalState.type === 'tradingTerminal'}
                  onClose={hideModal}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'agentOrchestration':
              return (
                <AgentOrchestrationModal
                  isOpen={modalState.type === 'agentOrchestration'}
                  onClose={hideModal}
                  farmId={modalState.props.farmId}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'createAgent':
              return (
                <CreateAgentModal
                  isOpen={modalState.type === 'createAgent'}
                  onClose={hideModal}
                  farmId={modalState.props.farmId}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'funding':
              return (
                <FundingModal
                  isOpen={modalState.type === 'funding'}
                  onClose={hideModal}
                  selectedAsset={modalState.props.selectedAsset}
                  userId={modalState.props.userId}
                  farmId={modalState.props.farmId}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'connectExchange':
              return (
                <ExchangeConnectExchangeModal
                  isOpen={modalState.type === 'connectExchange'}
                  onClose={hideModal}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'createFarm':
              return (
                <CreateFarmModal
                  isOpen={modalState.type === 'createFarm'}
                  onClose={hideModal}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'createGoal':
              return (
                <CreateGoalModal
                  farmId={modalState.props.farmId}
                  isOpen={modalState.type === 'createGoal'}
                  onClose={hideModal}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            case 'createStrategy':
              return (
                <CreateStrategyModal
                  isOpen={modalState.type === 'createStrategy'}
                  onClose={hideModal}
                  onSuccess={modalState.props.onSuccess}
                />
              );
            default:
              return null;
            }
          })()}
        </ErrorBoundary>
      )}
    </ModalContext.Provider>
  );
}
