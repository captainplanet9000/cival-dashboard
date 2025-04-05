import { ethers } from 'ethers';

export enum WalletType {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  PHANTOM = 'phantom'
}

export interface WalletInfo {
  address: string;
  chainId: number;
  type: WalletType;
  isConnected: boolean;
  balance?: string;
}

export interface TransactionOptions {
  gasLimit?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  value?: string;
  nonce?: number;
}

export class WalletProvider {
  private static instance: WalletProvider;
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private walletInfo: WalletInfo | null = null;
  private walletChangeListeners: ((wallet: WalletInfo | null) => void)[] = [];
  
  private constructor() {}
  
  public static getInstance(): WalletProvider {
    if (!WalletProvider.instance) {
      WalletProvider.instance = new WalletProvider();
    }
    return WalletProvider.instance;
  }
  
  /**
   * Connect to a wallet
   */
  async connect(walletType: WalletType): Promise<WalletInfo> {
    try {
      switch (walletType) {
        case WalletType.METAMASK:
          return await this.connectMetamask();
        case WalletType.WALLETCONNECT:
          return await this.connectWalletConnect();
        case WalletType.COINBASE:
          return await this.connectCoinbase();
        case WalletType.PHANTOM:
          return await this.connectPhantom();
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }
    } catch (error) {
      console.error(`Failed to connect to ${walletType} wallet:`, error);
      throw error;
    }
  }
  
  /**
   * Connect to MetaMask
   */
  private async connectMetamask(): Promise<WalletInfo> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Get address and chain ID
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      // Get ETH balance
      const balance = await this.provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);
      
      // Create wallet info
      this.walletInfo = {
        address,
        chainId,
        type: WalletType.METAMASK,
        isConnected: true,
        balance: formattedBalance
      };
      
      // Set up event listeners
      this.setupMetamaskListeners();
      
      // Notify listeners
      this.notifyWalletChangeListeners();
      
      return this.walletInfo;
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      throw error;
    }
  }
  
  /**
   * Connect to WalletConnect
   */
  private async connectWalletConnect(): Promise<WalletInfo> {
    try {
      // In a real implementation, we would:
      // 1. Initialize the WalletConnect client
      // 2. Create a provider and signer
      // 3. Get address and chain ID
      // 4. Set up event listeners
      
      throw new Error('WalletConnect implementation pending');
    } catch (error) {
      console.error('Failed to connect to WalletConnect:', error);
      throw error;
    }
  }
  
  /**
   * Connect to Coinbase Wallet
   */
  private async connectCoinbase(): Promise<WalletInfo> {
    try {
      // In a real implementation, we would:
      // 1. Initialize the Coinbase Wallet SDK
      // 2. Create a provider and signer
      // 3. Get address and chain ID
      // 4. Set up event listeners
      
      throw new Error('Coinbase Wallet implementation pending');
    } catch (error) {
      console.error('Failed to connect to Coinbase Wallet:', error);
      throw error;
    }
  }
  
  /**
   * Connect to Phantom (Solana)
   */
  private async connectPhantom(): Promise<WalletInfo> {
    try {
      // In a real implementation, we would:
      // 1. Check if Phantom is installed
      // 2. Connect to Phantom
      // 3. Get address and network
      
      throw new Error('Phantom implementation pending');
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      throw error;
    }
  }
  
  /**
   * Set up MetaMask event listeners
   */
  private setupMetamaskListeners(): void {
    if (!window.ethereum) return;
    
    // Handle account changes
    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        this.disconnect();
      } else {
        // Account changed, update wallet info
        await this.updateWalletInfo();
      }
    });
    
    // Handle chain changes
    window.ethereum.on('chainChanged', async () => {
      // Chain changed, update wallet info
      await this.updateWalletInfo();
    });
    
    // Handle disconnect
    window.ethereum.on('disconnect', () => {
      this.disconnect();
    });
  }
  
  /**
   * Update wallet info after changes
   */
  private async updateWalletInfo(): Promise<void> {
    if (!this.provider || !this.signer) return;
    
    try {
      // Get updated address and chain ID
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      // Get updated balance
      const balance = await this.provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);
      
      // Update wallet info
      this.walletInfo = {
        ...this.walletInfo!,
        address,
        chainId,
        balance: formattedBalance
      };
      
      // Notify listeners
      this.notifyWalletChangeListeners();
    } catch (error) {
      console.error('Failed to update wallet info:', error);
      this.disconnect();
    }
  }
  
  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    
    if (this.walletInfo) {
      this.walletInfo = {
        ...this.walletInfo,
        isConnected: false
      };
    }
    
    this.notifyWalletChangeListeners();
  }
  
  /**
   * Get current wallet info
   */
  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }
  
  /**
   * Get provider for use with contracts
   */
  getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }
  
  /**
   * Get signer for use with contracts
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }
  
  /**
   * Sign a transaction
   */
  async signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await this.signer.signTransaction(transaction);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  }
  
  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await this.signer.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }
  
  /**
   * Send a transaction
   */
  async sendTransaction(
    to: string,
    data: string,
    options: TransactionOptions = {}
  ): Promise<ethers.providers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest> = {
        to,
        data,
        ...options
      };
      
      return await this.signer.sendTransaction(transaction);
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }
  
  /**
   * Send a contract transaction
   */
  async sendContractTransaction(
    contract: ethers.Contract,
    method: string,
    args: any[],
    options: TransactionOptions = {}
  ): Promise<ethers.providers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Create a contract instance with the signer
      const contractWithSigner = contract.connect(this.signer);
      
      // Estimate gas if not provided
      if (!options.gasLimit) {
        try {
          options.gasLimit = (await contractWithSigner.estimateGas[method](...args)) * 1.2;
        } catch (error) {
          console.warn(`Gas estimation failed for ${method}:`, error);
          // If estimation fails, use a default
          options.gasLimit = 500000;
        }
      }
      
      // Send the transaction
      return await contractWithSigner[method](...args, options);
    } catch (error) {
      console.error(`Failed to send contract transaction ${method}:`, error);
      throw error;
    }
  }
  
  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<boolean> {
    if (!this.provider || !window.ethereum) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Convert chain ID to hex
      const chainIdHex = `0x${chainId.toString(16)}`;
      
      // Request chain switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      });
      
      // Update wallet info
      await this.updateWalletInfo();
      
      return true;
    } catch (error: any) {
      // If chain doesn't exist, error code 4902
      if (error.code === 4902) {
        // Chain needs to be added
        console.error('Chain not added to wallet. Please add the chain first.');
      }
      
      console.error(`Failed to switch to chain ${chainId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add a chain to the wallet
   */
  async addChain(
    chainId: number,
    chainName: string,
    rpcUrl: string,
    currencySymbol: string,
    blockExplorerUrl?: string
  ): Promise<boolean> {
    if (!window.ethereum) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Convert chain ID to hex
      const chainIdHex = `0x${chainId.toString(16)}`;
      
      // Request to add chain
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName,
            rpcUrls: [rpcUrl],
            nativeCurrency: {
              name: chainName,
              symbol: currencySymbol,
              decimals: 18
            },
            blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : undefined
          }
        ]
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to add chain ${chainId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add a wallet change listener
   */
  addWalletChangeListener(listener: (wallet: WalletInfo | null) => void): void {
    this.walletChangeListeners.push(listener);
  }
  
  /**
   * Remove a wallet change listener
   */
  removeWalletChangeListener(listener: (wallet: WalletInfo | null) => void): void {
    this.walletChangeListeners = this.walletChangeListeners.filter(l => l !== listener);
  }
  
  /**
   * Notify all wallet change listeners
   */
  private notifyWalletChangeListeners(): void {
    for (const listener of this.walletChangeListeners) {
      listener(this.walletInfo);
    }
  }
}

// Add type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
} 