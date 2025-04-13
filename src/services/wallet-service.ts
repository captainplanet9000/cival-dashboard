"use client";

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from "uuid";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EventEmitter } from 'events';
import type { WalletInfo, TokenBalance, Transaction, TransactionStatus, Network } from '@/types/wallet';

export interface WalletTransaction {
  id: string;
  wallet_address: string;
  transaction_hash: string;
  amount: string;
  currency: string;
  transaction_type: 'deposit' | 'withdrawal' | 'fee' | 'profit' | 'loss';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  farm_id?: string;
  strategy_id?: string;
  user_id: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WalletBalance {
  id?: string;
  wallet_address: string;
  currency: string;
  balance: string;
  last_updated?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WalletConnectionDetails {
  id?: string;
  address: string;
  provider: 'metamask' | 'walletconnect' | 'coinbase' | 'manual';
  chain_id: number;
  connected_at?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmFundingAllocation {
  id?: string;
  farm_id: string;
  wallet_address: string;
  amount: string;
  currency: string;
  allocation_type: 'initial' | 'additional' | 'withdrawal';
  timestamp?: string;
  user_id?: string;
  transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StrategyAllocation {
  id?: string;
  strategy_id: string;
  farm_id: string;
  amount: string;
  currency: string;
  allocation_type: 'initial' | 'additional' | 'withdrawal';
  timestamp?: string;
  user_id?: string;
  transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase';

// Define event constants as enum for better type safety
export enum WalletEvents {
  WALLET_CHANGED = 'walletChanged',
  BALANCE_CHANGED = 'balanceChanged',
  TRANSACTION_SUBMITTED = 'transactionSubmitted',
  TRANSACTION_STATUS_CHANGED = 'transactionStatusChanged'
}

export type NetworkConfig = {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

export type NetworkInfo = {
  name: string;
  chainId: number;
  icon: string;
  isTestnet: boolean;
  config: NetworkConfig;
};

/**
 * Service class for wallet-related functionality including connections, transactions,
 * and balance tracking. Implements EventEmitter for real-time updates.
 */
class WalletService extends EventEmitter {
  private static instance: WalletService;
  private supabase = createBrowserClient();
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private currentWallet: WalletConnectionDetails | null = null;
  wallet: WalletInfo | null = null;
  private transactions: Record<string, Transaction[]> = {};
  private tokenBalances: Record<string, TokenBalance[]> = {};
  private transactionHistory: WalletTransaction[] = [];
  private farmFundingAllocations: FarmFundingAllocation[] = [];
  private isInitialized = false;

  constructor() {
    super();
    this.setupEventListeners();
    this.initialize();
  }

  /**
   * Set up event listeners for account and chain changes
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        // When accounts change, update the wallet info and emit event
        if (accounts.length === 0) {
          // User disconnected their wallet
          this.disconnect();
        } else if (this.wallet && accounts[0] !== this.wallet.address) {
          // User switched accounts
          this.reconnectWallet(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        // When chain changes, update the wallet info and emit event
        if (this.wallet) {
          const updatedWallet = {
            ...this.wallet,
            chainId: parseInt(chainId, 16)
          };
          this.wallet = updatedWallet;
          this.emit(WalletEvents.WALLET_CHANGED, updatedWallet);
          
          // Refresh balances when chain changes
          this.getBalances(updatedWallet.address);
        }
      });

      window.ethereum.on('disconnect', this.handleDisconnect.bind(this));
    }
  }

  /**
   * Get singleton instance of WalletService
   */
  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Check for stored wallet connection
      await this.restoreConnection();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize wallet service:', error);
    }
  }

  private async restoreConnection(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const storedWallet = localStorage.getItem('wallet');
      if (!storedWallet) return;
      
      const walletInfo = JSON.parse(storedWallet) as WalletInfo;
      
      // Verify the wallet is still connected
      if (walletInfo.provider && walletInfo.address) {
        // Attempt to reconnect
        await this.connect(walletInfo.provider);
      }
    } catch (error) {
      console.error('Failed to restore wallet connection:', error);
      localStorage.removeItem('wallet');
    }
  }

  private async initializeWallet() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check if user was previously connected
        const { data: connections, error } = await this.supabase
          .from('wallet_connections')
          .select('*')
          .order('connected_at', { ascending: false })
          .limit(1);

        if (!error && connections && connections.length > 0) {
          this.currentWallet = connections[0];
          
          // Re-connect to existing wallet
          this.signer = await this.provider.getSigner();
          const address = await this.signer.getAddress();
          
          // Verify if the reconnected address matches the saved one
          if (address.toLowerCase() !== this.currentWallet.address.toLowerCase()) {
            this.currentWallet = null;
            this.signer = null;
          } else {
            // Successfully reconnected
            const network = await this.provider.getNetwork();
            const chainId = network.chainId;
            const networkName = NETWORK_INFO[chainId]?.name || `Unknown Network (${chainId})`;
            const balance = await this.provider.getBalance(address);
            const ethBalance = ethers.utils.formatEther(balance);
            
            // Create wallet info
            const walletInfo: WalletInfo = {
              address,
              provider: this.currentWallet.provider as WalletProvider,
              chainId,
              connected: true,
              balance: ethBalance,
              networkName,
            };
            
            this.wallet = walletInfo;
            useWalletStore.getState().setWalletInfo(walletInfo);
            
            // Emit wallet changed event
            this.emit(WalletEvents.WALLET_CHANGED, walletInfo);
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
      this.provider = null;
      this.signer = null;
      this.currentWallet = null;
      this.emit(WalletEvents.WALLET_CHANGED, null);
    }
  }

  // Handle disconnect from the wallet provider
  private handleDisconnect() {
    this.disconnect();
  }

  // Reconnect to a different account
  private async reconnectWallet(address: string) {
    if (!this.provider) return;
    
    try {
      this.signer = this.provider.getSigner();
      
      // Get current network
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      // Get network name
      const networkName = NETWORK_INFO[chainId]?.name || `Unknown Network (${chainId})`;
      
      // Get ETH balance
      const balance = await this.provider.getBalance(address);
      const ethBalance = ethers.utils.formatEther(balance);
      
      // Create wallet info
      const walletInfo: WalletInfo = {
        address,
        provider: this.wallet?.provider || 'metamask',
        chainId,
        connected: true,
        balance: ethBalance,
        networkName,
      };
      
      // Update state
      this.wallet = walletInfo;
      useWalletStore.getState().setWalletInfo(walletInfo);
      
      // Update database records
      if (this.currentWallet) {
        this.currentWallet.address = address;
        this.currentWallet.chain_id = chainId;
        
        await this.supabase
          .from('wallet_connections')
          .update({
            address,
            chain_id: chainId,
            connected_at: new Date().toISOString()
          })
          .eq('id', this.currentWallet.id);
      }
      
      // Emit wallet changed event
      this.emit(WalletEvents.WALLET_CHANGED, walletInfo);
      
      // Fetch token balances
      this.fetchTokenBalances(address);
    } catch (error) {
      console.error("Failed to reconnect wallet:", error);
      this.emit(WalletEvents.WALLET_CHANGED, null);
    }
  }

  /**
   * Connect to a wallet provider
   */
  public async connect(providerName: WalletProvider): Promise<WalletInfo | null> {
    const { setIsConnecting, setError, setWalletInfo } = useWalletStore.getState();
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        const errorMsg = 'Wallet connection is only supported in browser environments';
        setError(errorMsg);
        this.emit(WalletEvents.WALLET_CHANGED, null);
        return null;
      }
      
      let provider: any;
      
      switch (providerName) {
        case 'metamask':
          // Check if MetaMask is installed
          if (!window.ethereum) {
            const errorMsg = 'MetaMask is not installed. Please install it to continue.';
            setError(errorMsg);
            this.emit(WalletEvents.WALLET_CHANGED, null);
            return null;
          }
          
          provider = new ethers.providers.Web3Provider(window.ethereum);
          
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          break;
          
        case 'walletconnect':
          const errorWC = 'WalletConnect integration not fully implemented yet';
          setError(errorWC);
          this.emit(WalletEvents.WALLET_CHANGED, null);
          return null;
          
        case 'coinbase':
          const errorCB = 'Coinbase Wallet integration not fully implemented yet';
          setError(errorCB);
          this.emit(WalletEvents.WALLET_CHANGED, null);
          return null;
          
        default:
          const errorMsg = `Unsupported wallet provider: ${providerName}`;
          setError(errorMsg);
          this.emit(WalletEvents.WALLET_CHANGED, null);
          return null;
      }
      
      this.provider = provider;
      this.signer = provider.getSigner();
      
      // Get connected wallet address
      const address = await this.signer.getAddress();
      
      // Get current network
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      
      // Get network name
      const networkName = NETWORK_INFO[chainId]?.name || `Unknown Network (${chainId})`;
      
      // Get ETH balance
      const balance = await provider.getBalance(address);
      const ethBalance = ethers.utils.formatEther(balance);
      
      // Create wallet info
      const walletInfo: WalletInfo = {
        address,
        provider: providerName,
        chainId,
        connected: true,
        balance: ethBalance,
        networkName,
      };
      
      // Save connection to database
      const { data: connectionData, error: connectionError } = await this.supabase
        .from('wallet_connections')
        .upsert({
          address,
          provider: providerName,
          chain_id: chainId,
          connected_at: new Date().toISOString(),
          user_id: (await this.supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
        
      if (!connectionError) {
        this.currentWallet = connectionData;
      }
      
      // Update state
      setWalletInfo(walletInfo);
      this.wallet = walletInfo;
      
      // Emit wallet changed event
      this.emit(WalletEvents.WALLET_CHANGED, walletInfo);
      
      // Fetch token balances
      await this.fetchTokenBalances(address);
      
      return walletInfo;
    } catch (error: any) {
      console.error('Error connecting to wallet:', error);
      const errorMsg = error.message || 'Failed to connect to wallet';
      setError(errorMsg);
      this.emit(WalletEvents.WALLET_CHANGED, null);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }

  /**
   * Disconnect from the current wallet
   */
  public disconnect(): void {
    // Update state
    this.provider = null;
    this.signer = null;
    this.wallet = null;
    useWalletStore.getState().disconnect();
    
    // Emit wallet changed event
    this.emit(WalletEvents.WALLET_CHANGED, null);
  }

  async getWalletConnection(): Promise<WalletConnectionDetails | null> {
    return this.currentWallet;
  }

  async getWalletBalance(currency: string = 'ETH'): Promise<WalletBalance> {
    if (!this.signer) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      const address = await this.signer.getAddress();
      
      // For ETH, get the balance from the network
      if (currency.toUpperCase() === 'ETH') {
        const balance = await this.provider!.getBalance(address);
        const formattedBalance = ethers.formatEther(balance);
        
        // Save the balance to the database
        const balanceData: WalletBalance = {
          wallet_address: address,
          currency: 'ETH',
          balance: formattedBalance,
          last_updated: new Date().toISOString(),
        };
        
        const { data, error } = await this.supabase
          .from('wallet_balances')
          .upsert({
            ...balanceData,
            user_id: (await this.supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        // Emit balance changed event
        this.emit(WalletEvents.BALANCE_CHANGED, data);
        
        return data;
      } else {
        // For tokens, we need to call the token contract
        // Simplified implementation - in a real app, we'd interact with ERC20 contracts
        const error = `Balance fetching for ${currency} not implemented yet`;
        this.emit(WalletEvents.WALLET_CHANGED, null);
        throw new Error(error);
      }
    } catch (error) {
      console.error("Failed to get wallet balance:", error);
      const errorMsg = "Failed to get wallet balance. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  async getAllBalances(): Promise<WalletBalance[]> {
    if (!this.currentWallet) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      const { data, error } = await this.supabase
        .from('wallet_balances')
        .select('*')
        .eq('wallet_address', this.currentWallet.address);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error("Failed to get all balances:", error);
      const errorMsg = "Failed to get all balances. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  async sendTransaction(to: string, amount: string, currency: string = 'ETH'): Promise<WalletTransaction> {
    if (!this.signer) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      const from = await this.signer.getAddress();
      
      // For ETH transfers
      if (currency.toUpperCase() === 'ETH') {
        const transaction: WalletTransaction = {
          id: uuidv4(),
          wallet_address: from,
          transaction_hash: '', // Will be updated after submission
          amount,
          currency: 'ETH',
          transaction_type: 'withdrawal',
          status: 'pending',
          timestamp: new Date().toISOString(),
          user_id: (await this.supabase.auth.getUser()).data.user?.id || '',
        };
        
        // Emit transaction submitted event
        this.emit(WalletEvents.TRANSACTION_SUBMITTED, { ...transaction });
        
        const tx = await this.signer.sendTransaction({
          to,
          value: ethers.parseEther(amount)
        });
        
        // Update the transaction hash
        transaction.transaction_hash = tx.hash;
        
        // Save the transaction to the database
        const { data, error } = await this.supabase
          .from('wallet_transactions')
          .insert(transaction)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        
        // Update transaction status
        const updatedTransaction = {
          ...transaction,
          status: receipt ? 'completed' : 'failed'
        };
        
        const { error: updateError } = await this.supabase
          .from('wallet_transactions')
          .update({
            status: updatedTransaction.status
          })
          .eq('id', transaction.id);
        
        if (updateError) {
          console.error("Failed to update transaction status:", updateError);
        }
        
        // Emit transaction completed event
        this.emit(WalletEvents.TRANSACTION_STATUS_CHANGED, updatedTransaction);
        
        // Update the balances after transaction is completed
        await this.getWalletBalance('ETH');
        
        return updatedTransaction;
      } else {
        // For tokens, we need to call the token contract
        // Simplified implementation - in a real app, we'd interact with ERC20 contracts
        const error = `Transactions for ${currency} not implemented yet`;
        this.emit(WalletEvents.WALLET_CHANGED, null);
        throw new Error(error);
      }
    } catch (error) {
      console.error("Failed to send transaction:", error);
      const errorMsg = "Failed to send transaction. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  async getTransactionHistory(limit: number = 10, offset: number = 0): Promise<WalletTransaction[]> {
    if (!this.currentWallet) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_address', this.currentWallet.address)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error("Failed to get transaction history:", error);
      const errorMsg = "Failed to get transaction history. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  async allocateFundingToFarm(farmId: string, amount: string, currency: string = 'ETH'): Promise<FarmFundingAllocation> {
    if (!this.currentWallet) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      // Create a transaction for the allocation
      const transaction: WalletTransaction = {
        id: uuidv4(),
        wallet_address: this.currentWallet.address,
        transaction_hash: `internal-${uuidv4()}`, // Internal transaction
        amount,
        currency,
        transaction_type: 'withdrawal',
        status: 'completed',
        timestamp: new Date().toISOString(),
        farm_id: farmId,
        user_id: (await this.supabase.auth.getUser()).data.user?.id || '',
      };
      
      // Emit transaction submitted event
      this.emit(WalletEvents.TRANSACTION_SUBMITTED, { ...transaction });
      
      // Save the transaction
      const { error: txError } = await this.supabase
        .from('wallet_transactions')
        .insert(transaction);
      
      if (txError) {
        throw txError;
      }
      
      // Create the farm funding allocation
      const allocation: FarmFundingAllocation = {
        farm_id: farmId,
        wallet_address: this.currentWallet.address,
        amount,
        currency,
        allocation_type: 'initial',
        transaction_id: transaction.id,
      };
      
      const { data, error } = await this.supabase
        .from('farm_funding_allocations')
        .insert({
          ...allocation,
          user_id: (await this.supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Emit transaction completed event
      this.emit(WalletEvents.TRANSACTION_STATUS_CHANGED, transaction);
      
      return data;
    } catch (error) {
      console.error("Failed to allocate funding to farm:", error);
      const errorMsg = "Failed to allocate funding to farm. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  async allocateToStrategy(strategyId: string, farmId: string, amount: string, currency: string = 'ETH'): Promise<StrategyAllocation> {
    if (!this.currentWallet) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      // Create a transaction for the allocation
      const transaction: WalletTransaction = {
        id: uuidv4(),
        wallet_address: this.currentWallet.address,
        transaction_hash: `internal-${uuidv4()}`, // Internal transaction
        amount,
        currency,
        transaction_type: 'withdrawal',
        status: 'completed',
        timestamp: new Date().toISOString(),
        farm_id: farmId,
        strategy_id: strategyId,
        user_id: (await this.supabase.auth.getUser()).data.user?.id || '',
      };
      
      // Emit transaction submitted event
      this.emit(WalletEvents.TRANSACTION_SUBMITTED, { ...transaction });
      
      // Save the transaction
      const { error: txError } = await this.supabase
        .from('wallet_transactions')
        .insert(transaction);
      
      if (txError) {
        throw txError;
      }
      
      // Create the strategy allocation
      const allocation: StrategyAllocation = {
        strategy_id: strategyId,
        farm_id: farmId,
        amount,
        currency,
        allocation_type: 'initial',
        transaction_id: transaction.id,
      };
      
      const { data, error } = await this.supabase
        .from('strategy_allocations')
        .insert({
          ...allocation,
          user_id: (await this.supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Emit transaction completed event
      this.emit(WalletEvents.TRANSACTION_STATUS_CHANGED, transaction);
      
      return data;
    } catch (error) {
      console.error("Failed to allocate to strategy:", error);
      const errorMsg = "Failed to allocate to strategy. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  // Server-side methods
  async getTransactionHistoryForServer(userId: string, limit: number = 10, offset: number = 0): Promise<WalletTransaction[]> {
    const supabase = await createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw error;
      }
      
      return data as WalletTransaction[];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }
  
  async getWalletBalancesForServer(userId: string): Promise<WalletBalance[]> {
    const supabase = await createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('wallet_balances')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      return data as WalletBalance[];
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      throw error;
    }
  }

  async fetchTokenBalances(address: string): Promise<TokenBalance[]> {
    const { setTokenBalances, setError } = useWalletStore.getState();
    
    try {
      // For now we'll return mock data
      // In production, we would call an API like Covalent, Moralis, or TheGraph
      const mockTokenBalances: TokenBalance[] = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '0.75',
          value_usd: '1485.23',
          logo_url: 'https://ethereum.org/static/4d030a46f561e5c754cabfc1a97528ff/6ed5f/eth-diamond-black.webp',
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '250.00',
          value_usd: '250.00',
          token_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          logo_url: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        },
        {
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          balance: '0.01',
          value_usd: '320.45',
          token_address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          logo_url: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
        },
      ];
      
      setTokenBalances(mockTokenBalances);
      
      // Emit balance changed event
      this.emit(WalletEvents.BALANCE_CHANGED, mockTokenBalances);
      
      return mockTokenBalances;
    } catch (error: any) {
      console.error('Error fetching token balances:', error);
      const errorMsg = `Failed to fetch token balances: ${error.message}`;
      setError(errorMsg);
      this.emit(WalletEvents.WALLET_CHANGED, null);
      return [];
    }
  }

  // Helper methods
  async getFarmFundingAllocations(): Promise<FarmFundingAllocation[]> {
    if (!this.currentWallet) {
      const error = "Wallet not connected";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(error);
    }
    
    try {
      const { data, error } = await this.supabase
        .from('farm_funding_allocations')
        .select('*')
        .eq('wallet_address', this.currentWallet.address)
        .order('timestamp', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error("Failed to get farm funding allocations:", error);
      const errorMsg = "Failed to get farm funding allocations. Please try again.";
      this.emit(WalletEvents.WALLET_CHANGED, null);
      throw new Error(errorMsg);
    }
  }

  // Utility methods
  truncateAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
  
  getWalletInfo(): WalletInfo | null {
    return useWalletStore.getState().walletInfo;
  }
  
  getTokenBalances(): TokenBalance[] {
    return useWalletStore.getState().tokenBalances;
  }
  
  isConnecting(): boolean {
    return useWalletStore.getState().isConnecting;
  }
  
  getError(): string | null {
    return useWalletStore.getState().error;
  }

  // Add methods for event handling with improved documentation
  /**
   * Register an event listener
   * @param event Event name to listen for
   * @param listener Callback function to execute when the event is emitted
   * @returns this instance for method chaining
   * 
   * Available events:
   * - walletChanged: Emitted when a wallet is connected or disconnected
   * - balanceChanged: Emitted when a wallet's balance changes
   * - transactionSubmitted: Emitted when a transaction is submitted
   * - transactionStatusChanged: Emitted when a transaction status changes
   * - error: Emitted when an error occurs
   */
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Callback function to remove
   * @returns this instance for method chaining
   */
  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }

  /**
   * Emit an event
   * @param event Event name
   * @param args Arguments to pass to the event listeners
   * @returns boolean indicating if the event had listeners
   */
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }
}

export const walletService = WalletService.getInstance();

// Add a global type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string, params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
} 