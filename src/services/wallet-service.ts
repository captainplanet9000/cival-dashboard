"use client";

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from "uuid";

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

export class WalletService {
  private static instance: WalletService;
  private supabase = createBrowserClient();
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private currentWallet: WalletConnectionDetails | null = null;

  private constructor() {
    this.initializeWallet();
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  private async initializeWallet() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        
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
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
      this.provider = null;
      this.signer = null;
      this.currentWallet = null;
    }
  }

  async connectWallet(providerType: 'metamask' | 'walletconnect' | 'coinbase' = 'metamask'): Promise<WalletConnectionDetails> {
    if (!this.provider && typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    
    if (!this.provider) {
      throw new Error(`${providerType} is not installed or not accessible`);
    }

    try {
      // Request account access
      if (providerType === 'metamask' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Save the wallet connection to database
      const connection: WalletConnectionDetails = {
        address: address,
        provider: providerType,
        chain_id: chainId,
        connected_at: new Date().toISOString(),
      };
      
      const { data, error } = await this.supabase
        .from('wallet_connections')
        .upsert({
          ...connection,
          user_id: (await this.supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      this.currentWallet = data;
      return data;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw new Error("Failed to connect wallet. Please try again.");
    }
  }

  async disconnectWallet(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.currentWallet = null;
  }

  async getWalletConnection(): Promise<WalletConnectionDetails | null> {
    return this.currentWallet;
  }

  async getWalletBalance(currency: string = 'ETH'): Promise<WalletBalance> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
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
        
        return data;
      } else {
        // For tokens, we need to call the token contract
        // Simplified implementation - in a real app, we'd interact with ERC20 contracts
        throw new Error(`Balance fetching for ${currency} not implemented yet`);
      }
    } catch (error) {
      console.error("Failed to get wallet balance:", error);
      throw new Error("Failed to get wallet balance. Please try again.");
    }
  }

  async getAllBalances(): Promise<WalletBalance[]> {
    if (!this.currentWallet) {
      throw new Error("Wallet not connected");
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
      throw new Error("Failed to get all balances. Please try again.");
    }
  }

  async sendTransaction(to: string, amount: string, currency: string = 'ETH'): Promise<WalletTransaction> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }
    
    try {
      const from = await this.signer.getAddress();
      
      // For ETH transfers
      if (currency.toUpperCase() === 'ETH') {
        const tx = await this.signer.sendTransaction({
          to,
          value: ethers.parseEther(amount)
        });
        
        const transaction: WalletTransaction = {
          id: uuidv4(),
          wallet_address: from,
          transaction_hash: tx.hash,
          amount,
          currency: 'ETH',
          transaction_type: 'withdrawal',
          status: 'pending',
          timestamp: new Date().toISOString(),
          user_id: (await this.supabase.auth.getUser()).data.user?.id || '',
        };
        
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
        const { error: updateError } = await this.supabase
          .from('wallet_transactions')
          .update({
            status: receipt ? 'completed' : 'failed'
          })
          .eq('