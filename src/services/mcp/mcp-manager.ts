import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { HeuristMeshClient } from './clients/heurist-mesh-client';
import { UniswapTraderClient } from './clients/uniswap-trader-client';
import { AlphaVantageClient } from './clients/alpha-vantage-client';
import { CryptoIndicatorsClient } from './clients/crypto-indicators-client';
import { CryptoSentimentClient } from './clients/crypto-sentiment-client';

/**
 * MCP Manager
 * Central service to manage MCP server connections, configuration, and discovery
 */
export class McpManager {
  private supabase;
  private isServerSide: boolean;
  private static instance: McpManager;
  private activeMcpServers: Map<string, any> = new Map();
  private mcpServerStatus: Map<string, boolean> = new Map();
  private mcpConfigs: Record<string, any> = {};
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
    this.initializeConfigurations();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(isServerSide = false): McpManager {
    if (!McpManager.instance) {
      McpManager.instance = new McpManager(isServerSide);
    }
    return McpManager.instance;
  }
  
  /**
   * Initialize MCP server configurations
   */
  private async initializeConfigurations() {
    try {
      // Try to load from database if it exists
      let { data, error } = await this.supabase.from('mcp_server_configs').select('*');
      
      if (error || !data || data.length === 0) {
        // Use default configurations
        this.mcpConfigs = {
          // Blockchain & DeFi Integration
          'heurist-mesh': {
            name: 'Heurist Mesh',
            baseUrl: process.env.NEXT_PUBLIC_HEURIST_MESH_MCP_URL || 'http://localhost:3456',
            apiKey: process.env.HEURIST_MESH_API_KEY || '',
            category: 'blockchain',
            priority: 'high',
            autoConnect: true
          },
          'uniswap-trader': {
            name: 'Uniswap Trader',
            baseUrl: process.env.NEXT_PUBLIC_UNISWAP_TRADER_MCP_URL || 'http://localhost:3457',
            apiKey: process.env.UNISWAP_TRADER_API_KEY || '',
            category: 'defi',
            priority: 'high',
            autoConnect: true
          },
          
          // Market Data & Analysis
          'crypto-indicators': {
            name: 'Crypto Indicators',
            baseUrl: process.env.NEXT_PUBLIC_CRYPTO_INDICATORS_MCP_URL || 'http://localhost:3458',
            apiKey: process.env.CRYPTO_INDICATORS_API_KEY || '',
            category: 'market-data',
            priority: 'high',
            autoConnect: true
          },
          'crypto-sentiment': {
            name: 'Crypto Sentiment',
            baseUrl: process.env.NEXT_PUBLIC_CRYPTO_SENTIMENT_MCP_URL || 'http://localhost:3459',
            apiKey: process.env.CRYPTO_SENTIMENT_API_KEY || '',
            category: 'market-data',
            priority: 'medium',
            autoConnect: true
          },
          'alpha-vantage': {
            name: 'Alpha Vantage',
            baseUrl: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_MCP_URL || 'http://localhost:3460',
            apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
            category: 'market-data',
            priority: 'high',
            autoConnect: true
          }
        };
        
        // Store default configurations in database for future use
        await this.supabase.from('mcp_server_configs').insert(
          Object.entries(this.mcpConfigs).map(([key, config]) => ({
            server_id: key,
            ...config
          }))
        );
      } else {
        // Convert from array to record
        this.mcpConfigs = {};
        data.forEach(config => {
          this.mcpConfigs[config.server_id] = {
            name: config.name,
            baseUrl: config.base_url,
            apiKey: config.api_key,
            category: config.category,
            priority: config.priority,
            autoConnect: config.auto_connect
          };
        });
      }
      
      // Connect to high-priority servers that should auto-connect
      Object.entries(this.mcpConfigs)
        .filter(([_, config]) => config.autoConnect && config.priority === 'high')
        .forEach(([serverId]) => {
          this.connectToMcpServer(serverId).catch(error => {
            console.error(`Failed to auto-connect to MCP server ${serverId}:`, error);
          });
        });
    } catch (error) {
      console.error('Error initializing MCP configurations:', error);
    }
  }
  
  /**
   * Connect to a specific MCP server
   */
  public async connectToMcpServer(serverId: string): Promise<boolean> {
    try {
      if (!this.mcpConfigs[serverId]) {
        console.error(`MCP server configuration not found for ${serverId}`);
        return false;
      }
      
      const config = this.mcpConfigs[serverId];
      
      // Create the appropriate client based on the server ID
      let mcpClient;
      switch (serverId) {
        case 'heurist-mesh':
          mcpClient = new HeuristMeshClient(config.baseUrl, config.apiKey);
          break;
        case 'uniswap-trader':
          mcpClient = new UniswapTraderClient(config.baseUrl, config.apiKey);
          break;
        case 'crypto-indicators':
          mcpClient = new CryptoIndicatorsClient(config.baseUrl, config.apiKey);
          break;
        case 'crypto-sentiment':
          mcpClient = new CryptoSentimentClient(config.baseUrl, config.apiKey);
          break;
        case 'alpha-vantage':
          mcpClient = new AlphaVantageClient(config.baseUrl, config.apiKey);
          break;
        default:
          console.error(`Unknown MCP server type: ${serverId}`);
          return false;
      }
      
      // Initialize the client and test connection
      const isConnected = await mcpClient.initialize();
      
      if (isConnected) {
        // Store the client and update status
        this.activeMcpServers.set(serverId, mcpClient);
        this.mcpServerStatus.set(serverId, true);
        console.log(`Successfully connected to MCP server: ${config.name}`);
        return true;
      } else {
        this.mcpServerStatus.set(serverId, false);
        return false;
      }
    } catch (error) {
      console.error(`Error connecting to MCP server ${serverId}:`, error);
      this.mcpServerStatus.set(serverId, false);
      return false;
    }
  }
  
  /**
   * Get a specific MCP client by server ID
   */
  public async getMcpClient(serverId: string): Promise<any> {
    // If the client doesn't exist or isn't connected, try to connect
    if (!this.activeMcpServers.has(serverId) || !this.mcpServerStatus.get(serverId)) {
      const success = await this.connectToMcpServer(serverId);
      if (!success) {
        throw new Error(`Failed to connect to MCP server ${serverId}`);
      }
    }
    
    return this.activeMcpServers.get(serverId);
  }
  
  /**
   * Get all MCP servers by category
   */
  public getMcpServersByCategory(category: string): string[] {
    return Object.entries(this.mcpConfigs)
      .filter(([_, config]) => config.category === category)
      .map(([serverId]) => serverId);
  }
  
  /**
   * Get status of all MCP servers
   */
  public getServerStatus(): Record<string, {
    name: string;
    category: string;
    status: boolean;
    priority: string;
  }> {
    const status: Record<string, any> = {};
    
    Object.entries(this.mcpConfigs).forEach(([serverId, config]) => {
      status[serverId] = {
        name: config.name,
        category: config.category,
        status: this.mcpServerStatus.get(serverId) || false,
        priority: config.priority
      };
    });
    
    return status;
  }
  
  /**
   * Log MCP activity
   */
  public async logMcpActivity(
    serverId: string,
    toolName: string,
    parameters: any,
    result: any,
    userId: string,
    status: string,
    options?: {
      errorMessage?: string;
      vaultTransactionId?: string;
      executionTimeMs?: number;
    }
  ): Promise<void> {
    try {
      await this.supabase.from('mcp_activity_logs').insert({
        server_id: serverId,
        tool_name: toolName,
        parameters,
        result,
        user_id: userId,
        status,
        error_message: options?.errorMessage,
        vault_transaction_id: options?.vaultTransactionId,
        execution_time_ms: options?.executionTimeMs
      });
    } catch (error) {
      console.error('Error logging MCP activity:', error);
    }
  }
}

// Export singleton instance
export const mcpManager = McpManager.getInstance();
