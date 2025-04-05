import axios, { AxiosInstance } from 'axios';

/**
 * Base client for MCP server interactions
 * Provides common functionality for all MCP clients
 */
export class McpBaseClient {
  protected axiosInstance: AxiosInstance;
  protected baseUrl: string;
  protected apiKey: string;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
      }
    });
  }
  
  /**
   * Initialize the client and test connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Try to list available tools as a basic connection test
      const response = await this.axiosInstance.post('/list-tools', {});
      
      if (response.status !== 200) {
        throw new Error(`Failed to connect to MCP server: ${response.statusText}`);
      }
      
      console.log(`Successfully connected to MCP server at ${this.baseUrl}`);
      return true;
    } catch (error) {
      console.error('Error initializing MCP client:', error);
      return false;
    }
  }
  
  /**
   * Generic method to call an MCP tool
   */
  protected async callMcpTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/call-tool', {
        name: toolName,
        input: parameters
      });
      
      if (response.status !== 200) {
        throw new Error(`MCP tool call failed: ${response.statusText}`);
      }
      
      return response.data.output;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if the MCP server is online
   */
  async isOnline(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the list of available tools from the MCP server
   */
  async listAvailableTools(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.post('/list-tools', {});
      return response.data.tools || [];
    } catch (error) {
      console.error('Error listing available tools:', error);
      return [];
    }
  }
}
