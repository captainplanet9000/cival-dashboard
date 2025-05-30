import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../types/defi-protocol-types';

/**
 * Interface for protocol connectors
 * All protocol connectors must implement this interface
 */
export interface ProtocolConnectorInterface {
  /**
   * Connect to the protocol with the provided credentials
   * For wallet-based protocols, this would typically be a wallet address
   * or a signer
   */
  connect(credentials?: Record<string, string>): Promise<boolean>;
  
  /**
   * Get information about the protocol
   */
  getProtocolInfo(): Promise<any>;
  
  /**
   * Get available actions for this protocol
   */
  getAvailableActions(): Promise<ProtocolAction[]>;
  
  /**
   * Get user positions for a specific address
   */
  getUserPositions(address: string): Promise<ProtocolPosition[]>;
  
  /**
   * Execute an action on the protocol with the provided parameters
   */
  executeAction(action: ProtocolAction, params?: any): Promise<any>;
} 