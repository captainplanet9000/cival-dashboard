/**
 * Exchange Service
 * 
 * Handles API communication for the exchange connections component.
 * Provides methods for fetching, adding, updating, and testing exchange connections.
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';

// Types for exchange-related requests and responses
export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet: boolean;
  description: string;
}

export interface ExchangeConfig extends ExchangeCredentials {
  name: string;
}

export interface ExchangeStatus {
  name: string;
  connected: boolean;
  testnet: boolean;
  last_check: number;
  has_credentials: boolean;
  balances?: Record<string, { free: number; locked: number }>;
}

export interface ExchangeStatusResponse {
  [key: string]: ExchangeStatus;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  details?: any;
}

const ENDPOINTS = {
  EXCHANGES: `${API_BASE_URL}/exchanges`,
  EXCHANGE_STATUS: `${API_BASE_URL}/exchanges/status`,
  TEST_CONNECTION: `${API_BASE_URL}/exchanges/test-connection`,
  ACCOUNT_BALANCE: `${API_BASE_URL}/exchanges/account-balance`,
  WITHDRAW_PROTECTION: `${API_BASE_URL}/exchanges/withdraw-protection`,
  BALANCE_ALERTS: `${API_BASE_URL}/exchanges/balance-alerts`,
};

/**
 * Fetch the status of all configured exchanges
 */
export const fetchExchangeStatus = async (): Promise<ExchangeStatusResponse> => {
  try {
    const response = await axios.get(ENDPOINTS.EXCHANGE_STATUS);
    return response.data;
  } catch (error) {
    console.error('Error fetching exchange status:', error);
    throw error;
  }
};

/**
 * Fetch detailed account balances for a specific exchange
 */
export const fetchAccountBalance = async (exchangeName: string): Promise<Record<string, { free: number; locked: number }>> => {
  try {
    const response = await axios.get(`${ENDPOINTS.ACCOUNT_BALANCE}/${exchangeName}`);
    return response.data.balances;
  } catch (error) {
    console.error(`Error fetching account balance for ${exchangeName}:`, error);
    throw error;
  }
};

/**
 * Add a new exchange connection
 */
export const addExchange = async (exchangeConfig: ExchangeConfig): Promise<void> => {
  try {
    await axios.post(ENDPOINTS.EXCHANGES, exchangeConfig);
  } catch (error) {
    console.error('Error adding exchange:', error);
    throw error;
  }
};

/**
 * Update an existing exchange connection
 */
export const updateExchange = async (
  exchangeName: string,
  credentials: Partial<ExchangeCredentials>
): Promise<void> => {
  try {
    await axios.put(`${ENDPOINTS.EXCHANGES}/${exchangeName}`, credentials);
  } catch (error) {
    console.error('Error updating exchange:', error);
    throw error;
  }
};

/**
 * Delete an exchange connection
 */
export const deleteExchange = async (exchangeName: string): Promise<void> => {
  try {
    await axios.delete(`${ENDPOINTS.EXCHANGES}/${exchangeName}`);
  } catch (error) {
    console.error('Error deleting exchange:', error);
    throw error;
  }
};

/**
 * Test an exchange connection without saving it
 */
export const testConnection = async (exchangeConfig: ExchangeConfig): Promise<TestConnectionResult> => {
  try {
    const response = await axios.post(ENDPOINTS.TEST_CONNECTION, exchangeConfig);
    return response.data;
  } catch (error) {
    console.error('Error testing exchange connection:', error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Connection test failed',
        details: error.response.data.details
      };
    }
    return {
      success: false,
      message: 'Connection test failed'
    };
  }
};

/**
 * Configure withdrawal protection settings for an exchange
 */
export const configureWithdrawProtection = async (
  exchangeName: string,
  settings: {
    enabled: boolean;
    maxDailyWithdrawal?: number;
    whitelistedAddresses?: string[];
    requireConfirmation?: boolean;
    timeDelayMinutes?: number;
  }
): Promise<void> => {
  try {
    await axios.post(`${ENDPOINTS.WITHDRAW_PROTECTION}/${exchangeName}`, settings);
  } catch (error) {
    console.error('Error configuring withdraw protection:', error);
    throw error;
  }
};

/**
 * Get withdrawal protection settings for an exchange
 */
export const getWithdrawProtectionSettings = async (exchangeName: string): Promise<any> => {
  try {
    const response = await axios.get(`${ENDPOINTS.WITHDRAW_PROTECTION}/${exchangeName}`);
    return response.data;
  } catch (error) {
    console.error('Error getting withdraw protection settings:', error);
    throw error;
  }
};

/**
 * Configure balance alerts for an exchange
 */
export const configureBalanceAlerts = async (
  exchangeName: string,
  settings: {
    enabled: boolean;
    minBalanceAlerts?: Record<string, number>;
    maxBalanceAlerts?: Record<string, number>;
    balanceChangeThreshold?: number;
    notificationChannels?: string[];
  }
): Promise<void> => {
  try {
    await axios.post(`${ENDPOINTS.BALANCE_ALERTS}/${exchangeName}`, settings);
  } catch (error) {
    console.error('Error configuring balance alerts:', error);
    throw error;
  }
};

/**
 * Get balance alert settings for an exchange
 */
export const getBalanceAlertSettings = async (exchangeName: string): Promise<any> => {
  try {
    const response = await axios.get(`${ENDPOINTS.BALANCE_ALERTS}/${exchangeName}`);
    return response.data;
  } catch (error) {
    console.error('Error getting balance alert settings:', error);
    throw error;
  }
};

/**
 * Enable or disable withdrawals for an exchange
 */
export const setWithdrawalStatus = async (
  exchangeName: string,
  enabled: boolean
): Promise<void> => {
  try {
    await axios.post(`${ENDPOINTS.EXCHANGES}/${exchangeName}/withdrawals`, { enabled });
  } catch (error) {
    console.error('Error setting withdrawal status:', error);
    throw error;
  }
};

/**
 * Get ElizaOS analysis of exchange connectivity
 */
export const getElizaExchangeAnalysis = async (): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/eliza/analyze/exchanges`);
    return response.data;
  } catch (error) {
    console.error('Error getting ElizaOS exchange analysis:', error);
    throw error;
  }
};

/**
 * Send command to ElizaOS regarding exchange management
 */
export const sendElizaExchangeCommand = async (command: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/eliza/command`, {
      command,
      context: 'exchange_management'
    });
    return response.data;
  } catch (error) {
    console.error('Error sending ElizaOS exchange command:', error);
    throw error;
  }
};
