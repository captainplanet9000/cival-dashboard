// Types for the Master Control Panel

export enum SystemControlStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  PENDING = 'pending'
}

export interface SystemControl {
  id: string;
  name: string;
  description: string;
  status: SystemControlStatus;
  icon?: string;
  requiresElizaOS?: boolean;
}

export interface RiskParameter {
  id: string;
  name: string;
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  description: string;
  unit?: string;
  type: 'number' | 'percentage' | 'currency' | 'toggle' | 'select';
  options?: string[];
}

export interface ExchangeConnectionStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  lastConnected?: string;
  errorMessage?: string;
  tradingEnabled: boolean;
  api: {
    publicEndpoint: boolean;
    privateEndpoint: boolean;
    websocket: boolean;
  };
}

export interface ActiveTrade {
  id: string;
  strategy: string;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  openTime: string;
  stopLoss?: number;
  takeProfit?: number;
  exchange: string;
  status: 'open' | 'closing' | 'error';
  risk: 'low' | 'medium' | 'high';
}

export interface ElizaOSCommand {
  id: string;
  command: string;
  timestamp: string;
  response?: string;
  status: 'pending' | 'complete' | 'error';
  isAI: boolean;
}

export interface CommandCategory {
  id: string;
  name: string;
  description: string;
  commands: string[];
  examples: string[];
}

export interface ControlPanelState {
  systemControls: SystemControl[];
  riskParameters: RiskParameter[];
  exchangeConnections: ExchangeConnectionStatus[];
  activeTrades: ActiveTrade[];
  elizaOSCommands: ElizaOSCommand[];
  elizaOSEnabled: boolean;
}
