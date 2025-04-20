import { SafeAccountConfig, SafeFactory, SafeTransactionDataPartial, ContractNetworksConfig } from '@safe-global/protocol-kit';
import { EthersAdapter, SafeVersion } from '@safe-global/protocol-kit';
import Safe, { SafeTransactionOptionalProps } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import { SupportedChainId } from '@/types/chains';
import { SimulationResult, SafeTransactionRequest } from '@/types/defi-lending.types';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Service responsible for managing Safe wallets across different chains
 * - Creates new Safe wallets
 * - Executes transactions through Safe
 * - Builds multi-call transactions for batched operations
 * - Simulates transactions before execution
 */
export class SafeManager {
  private providers: Record<SupportedChainId, ethers.providers.JsonRpcProvider> = {} as any;
  private safeSDKs: Record<string, Safe> = {};
  private contractNetworks: ContractNetworksConfig;
  
  /**
   * Initialize the Safe Manager with provider connections for all supported chains
   */
  constructor(
    private readonly rpcUrls: Record<SupportedChainId, string>,
    private readonly apiKeys: Record<SupportedChainId, string | undefined> = {},
    private readonly multisendAddresses: Record<SupportedChainId, string> = {}
  ) {
    // Initialize providers for each chain
    Object.entries(rpcUrls).forEach(([chainId, url]) => {
      const numericChainId = parseInt(chainId) as SupportedChainId;
      this.providers[numericChainId] = new ethers.providers.JsonRpcProvider(url);
    });
    
    // Initialize Safe contract networks config
    this.contractNetworks = this.buildContractNetworks();
  }
  
  /**
   * Build the contract networks configuration for Safe SDK
   */
  private buildContractNetworks(): ContractNetworksConfig {
    const networks: ContractNetworksConfig = {};
    
    // Add each supported chain to the networks config
    Object.keys(this.providers).forEach((chainIdStr) => {
      const chainId = parseInt(chainIdStr);
      // This would normally be populated with the addresses of the Safe contracts
      // on each network. For now, we'll use an empty object and let the SDK
      // use the default addresses.
      networks[chainId] = {};
    });
    
    return networks;
  }
  
  /**
   * Create a new Safe wallet for an agent on a specific chain
   * @param agentId The ID of the agent that will own this Safe
   * @param chainId The chain ID where the Safe will be deployed
   * @param ownerAddresses List of owner addresses for the Safe (typically includes backend signer and maybe user address)
   * @param threshold Number of signatures required (defaults to 1 for autonomous agent)
   * @returns The address of the newly created Safe
   */
  async createSafe(
    agentId: string,
    chainId: SupportedChainId,
    ownerAddresses: string[],
    threshold: number = 1
  ): Promise<string> {
    try {
      const provider = this.providers[chainId];
      if (!provider) {
        throw new Error(`No provider configured for chain ${chainId}`);
      }
      
      // For actual implementation, we'd use a dedicated signer from a secure system
      // In production, this should be from a secure key management system
      const signer = new ethers.Wallet(process.env.SAFE_DEPLOYER_PRIVATE_KEY || '', provider);
      
      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer
      });
      
      const safeFactory = await SafeFactory.create({ 
        ethAdapter, 
        contractNetworks: this.contractNetworks,
        safeVersion: SafeVersion.V1_3_0
      });
      
      const safeAccountConfig: SafeAccountConfig = {
        owners: ownerAddresses,
        threshold
      };
      
      // Deploy the Safe
      const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });
      const safeAddress = await safeSdk.getAddress();
      
      // Store Safe SDK instance for future use
      this.safeSDKs[safeAddress.toLowerCase()] = safeSdk;
      
      // Store in database
      await this.storeSafeInDatabase(agentId, safeAddress, chainId, ownerAddresses, threshold);
      
      return safeAddress;
    } catch (error) {
      console.error('Error creating Safe wallet:', error);
      throw new Error(`Failed to create Safe wallet: ${(error as Error).message}`);
    }
  }
  
  /**
   * Store Safe details in the database
   */
  private async storeSafeInDatabase(
    agentId: string,
    safeAddress: string,
    chainId: SupportedChainId,
    owners: string[],
    threshold: number
  ): Promise<void> {
    try {
      const supabase = createServerClient();
      
      await supabase.from('agent_safes').insert({
        agent_id: agentId,
        safe_address: safeAddress.toLowerCase(),
        chain_id: chainId,
        owners: owners,
        threshold: threshold,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error storing Safe in database:', error);
      // Continue even if DB storage fails - we don't want to revert the Safe creation
      // But we'll log it for monitoring
    }
  }
  
  /**
   * Get a Safe SDK instance for a specific Safe address
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param signer A signer that is an owner of the Safe
   */
  async getSafeSdk(
    safeAddress: string,
    chainId: SupportedChainId,
    signer?: ethers.Signer
  ): Promise<Safe> {
    const normalizedAddress = safeAddress.toLowerCase();
    
    // Return cached SDK if available
    if (this.safeSDKs[normalizedAddress]) {
      return this.safeSDKs[normalizedAddress];
    }
    
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`No provider configured for chain ${chainId}`);
    }
    
    if (!signer) {
      // For actual implementation, use a dedicated signer from a secure system
      signer = new ethers.Wallet(process.env.SAFE_OWNER_PRIVATE_KEY || '', provider);
    }
    
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: signer
    });
    
    const safeSdk = await Safe.create({
      ethAdapter,
      safeAddress,
      contractNetworks: this.contractNetworks
    });
    
    // Cache the SDK instance
    this.safeSDKs[normalizedAddress] = safeSdk;
    
    return safeSdk;
  }
  
  /**
   * Build a single transaction for the Safe
   */
  async buildTransaction(
    safeAddress: string,
    chainId: SupportedChainId,
    tx: SafeTransactionRequest
  ): Promise<SafeTransactionDataPartial> {
    return {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation || 0 // 0 = Call, 1 = DelegateCall
    };
  }
  
  /**
   * Build a multi-call transaction for batched execution via Safe's MultiSend contract
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param transactions Array of transactions to batch
   */
  async buildMultiSendTransaction(
    safeAddress: string,
    chainId: SupportedChainId,
    transactions: SafeTransactionRequest[]
  ): Promise<SafeTransactionDataPartial> {
    const safeSdk = await this.getSafeSdk(safeAddress, chainId);
    
    // Convert to SafeTransactionDataPartial format
    const txs = transactions.map(tx => ({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation || 0
    }));
    
    // Create a batch transaction using MultiSend
    const multiSendTx = await safeSdk.createTransaction({ transactions: txs });
    const multiSendData = await safeSdk.getMultiSendCallOnlyData(multiSendTx.data);
    
    // Get the MultiSend contract address for this chain
    const multiSendAddress = this.multisendAddresses[chainId] || 
                            await safeSdk.getMultiSendCallOnlyAddress();
    
    // Return as a delegate call to the MultiSend contract
    return {
      to: multiSendAddress,
      value: '0',
      data: multiSendData,
      operation: 1 // DelegateCall
    };
  }
  
  /**
   * Simulate a transaction before executing it
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param transaction The transaction to simulate
   */
  async simulateTransaction(
    safeAddress: string,
    chainId: SupportedChainId,
    transaction: SafeTransactionDataPartial
  ): Promise<SimulationResult> {
    try {
      // Get the provider for this chain
      const provider = this.providers[chainId];
      
      // In a production implementation, this would use a simulation service like Tenderly
      // For now, we'll use a basic eth_call simulation
      
      // Get Safe SDK for this Safe
      const safeSdk = await this.getSafeSdk(safeAddress, chainId);
      
      // Create a transaction object
      const safeTransaction = await safeSdk.createTransaction({
        safeTransactionData: transaction
      });
      
      // Get the Safe transaction data for execution
      const txData = await safeSdk.getTransactionData(safeTransaction);
      
      // Simulate the transaction using eth_call
      await provider.call({
        to: safeAddress,
        data: txData.data
      });
      
      // If we reach here, the simulation was successful
      return {
        success: true,
        // We could get more detailed results from a simulation API like Tenderly
        // For now, we just report success
      };
    } catch (error) {
      console.error('Transaction simulation failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Execute a transaction through the Safe
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param transaction The transaction to execute
   * @param options Optional transaction properties like safeTxGas
   */
  async executeTransaction(
    safeAddress: string,
    chainId: SupportedChainId,
    transaction: SafeTransactionDataPartial,
    options?: SafeTransactionOptionalProps
  ): Promise<string> {
    try {
      // Simulate the transaction first
      const simulation = await this.simulateTransaction(safeAddress, chainId, transaction);
      if (!simulation.success) {
        throw new Error(`Transaction simulation failed: ${simulation.error}`);
      }
      
      // Get Safe SDK for this Safe
      const safeSdk = await this.getSafeSdk(safeAddress, chainId);
      
      // Create a transaction object
      const safeTransaction = await safeSdk.createTransaction({
        safeTransactionData: transaction,
        options
      });
      
      // Sign the transaction
      const signedSafeTx = await safeSdk.signTransaction(safeTransaction);
      
      // Execute the transaction
      const executeTxResponse = await safeSdk.executeTransaction(signedSafeTx);
      await executeTxResponse.transactionResponse?.wait();
      
      return executeTxResponse.hash || '';
    } catch (error) {
      console.error('Failed to execute transaction:', error);
      throw new Error(`Failed to execute transaction: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get a Safe's balance of a specific token
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param tokenAddress The address of the token (use '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' for native token)
   */
  async getTokenBalance(
    safeAddress: string,
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<string> {
    const provider = this.providers[chainId];
    
    // Handle native token (ETH/MATIC/etc)
    if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      const balance = await provider.getBalance(safeAddress);
      return balance.toString();
    }
    
    // Handle ERC20 tokens
    const erc20Abi = ['function balanceOf(address owner) view returns (uint256)'];
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    const balance = await tokenContract.balanceOf(safeAddress);
    return balance.toString();
  }
  
  /**
   * Transfer tokens from a Safe to another address
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param tokenAddress The address of the token (use '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' for native token)
   * @param to The recipient address
   * @param amount The amount to transfer
   */
  async transferTokens(
    safeAddress: string,
    chainId: SupportedChainId,
    tokenAddress: string,
    to: string,
    amount: string
  ): Promise<string> {
    // Handle native token (ETH/MATIC/etc)
    if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      const tx: SafeTransactionDataPartial = {
        to,
        value: amount,
        data: '0x'
      };
      
      return this.executeTransaction(safeAddress, chainId, tx);
    }
    
    // Handle ERC20 tokens
    const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const tokenInterface = new ethers.utils.Interface(erc20Abi);
    
    const data = tokenInterface.encodeFunctionData('transfer', [to, amount]);
    
    const tx: SafeTransactionDataPartial = {
      to: tokenAddress,
      value: '0',
      data
    };
    
    return this.executeTransaction(safeAddress, chainId, tx);
  }
  
  /**
   * Approve a spender to use tokens from the Safe
   * @param safeAddress The address of the Safe
   * @param chainId The chain ID where the Safe is deployed
   * @param tokenAddress The address of the token
   * @param spender The address to approve
   * @param amount The amount to approve
   */
  async approveTokens(
    safeAddress: string,
    chainId: SupportedChainId,
    tokenAddress: string,
    spender: string,
    amount: string
  ): Promise<string> {
    const erc20Abi = ['function approve(address spender, uint256 amount) returns (bool)'];
    const tokenInterface = new ethers.utils.Interface(erc20Abi);
    
    const data = tokenInterface.encodeFunctionData('approve', [spender, amount]);
    
    const tx: SafeTransactionDataPartial = {
      to: tokenAddress,
      value: '0',
      data
    };
    
    return this.executeTransaction(safeAddress, chainId, tx);
  }
}

export default SafeManager;
