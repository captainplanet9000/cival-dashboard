import { ProtocolAction, ProtocolPosition } from '../../types/defi-protocol-types';

export interface ProtocolConnectorInterface {
  // Common methods
  connect(credentials?: Record<string, string>): Promise<boolean>;
  isConnected(): boolean;
  getUserPositions(address: string): Promise<ProtocolPosition[]>;
  executeAction(action: ProtocolAction): Promise<any>;
  getProtocolData(): Promise<any>;
  
  // Protocol-specific methods should be defined in each implementation
} 