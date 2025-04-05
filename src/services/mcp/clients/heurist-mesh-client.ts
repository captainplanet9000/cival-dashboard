import { McpBaseClient } from './mcp-base-client';

/**
 * Client for Heurist Mesh MCP server
 * Provides blockchain analysis and smart contract security auditing
 */
export class HeuristMeshClient extends McpBaseClient {
  /**
   * Analyze a smart contract for security vulnerabilities
   */
  async analyzeSmartContract(contractAddress: string, chainId: number): Promise<any> {
    return await this.callMcpTool('analyzeSmartContract', {
      contractAddress,
      chainId
    });
  }
  
  /**
   * Get security audit report for a smart contract
   */
  async getSecurityAudit(contractAddress: string, chainId: number): Promise<any> {
    return await this.callMcpTool('getSecurityAudit', {
      contractAddress,
      chainId
    });
  }
  
  /**
   * Analyze on-chain interactions for a protocol
   */
  async analyzeProtocolInteractions(
    protocolAddress: string, 
    chainId: number,
    timeRange: string = '30d'
  ): Promise<any> {
    return await this.callMcpTool('analyzeProtocolInteractions', {
      protocolAddress,
      chainId,
      timeRange
    });
  }
  
  /**
   * Get DeFi position recommendations based on current market conditions
   */
  async getDefiRecommendations(
    userAddress: string,
    riskLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<any> {
    return await this.callMcpTool('getDefiRecommendations', {
      userAddress,
      riskLevel
    });
  }
  
  /**
   * Evaluate a protocol's security and performance metrics
   */
  async evaluateProtocol(
    protocolName: string,
    chainId?: number
  ): Promise<any> {
    return await this.callMcpTool('evaluateProtocol', {
      protocolName,
      chainId
    });
  }
}
