/**
 * ElizaOS Service
 * Handles interactions with the ElizaOS AI system for command processing,
 * knowledge retrieval, and agent communication
 */

import { nanoid } from 'nanoid';
import { CommandMessage, CommandMessageType, CommandSourceType } from '@/components/ui/command-terminal';
import { KnowledgeDocument, KnowledgeQuery } from '@/types/knowledge';
import { DEMO_MODE, demoKnowledgeDocuments } from '@/utils/demo-data';
import { createBrowserClient } from '@/utils/supabase/client';

// Socket event types
export enum SocketEventType {
  COMMAND_REQUEST = 'command_request',
  COMMAND_RESPONSE = 'command_response',
  KNOWLEDGE_QUERY = 'knowledge_query',
  KNOWLEDGE_RESPONSE = 'knowledge_response',
  AGENT_STATUS = 'agent_status',
  AGENT_ACTION = 'agent_action',
  ERROR = 'error'
}

// Response types
export interface ElizaResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Manages WebSocket connection to ElizaOS backend
 */
class WebSocketManager {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private eventListeners: Record<string, Function[]> = {};
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      // In demo mode, we'll simulate a socket connection
      if (DEMO_MODE || process.env.NODE_ENV === 'development') {
        this.isConnected = true;
        this.triggerEvent('connect', {});
        resolve(true);
        return;
      }

      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.triggerEvent('connect', {});
          resolve(true);
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          this.triggerEvent('disconnect', {});
          this.attemptReconnect();
          resolve(false);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.triggerEvent('error', { error });
          resolve(false);
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.type) {
              this.triggerEvent(data.type, data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        resolve(false);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  sendMessage(type: string, data: any): boolean {
    // In demo mode, we'll simulate sending messages
    if (DEMO_MODE || process.env.NODE_ENV === 'development') {
      return true;
    }

    if (!this.isConnected || !this.socket) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify({ type, data }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  on(event: string, callback: Function) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  private triggerEvent(event: string, data: any) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.isConnected = false;
  }
}

/**
 * Main ElizaOS service implementation
 */
class ElizaOSService {
  private socketManager: WebSocketManager | null = null;
  private commandCallbacks: Record<string, (response: any) => void> = {};
  private supabase = createBrowserClient();
  
  // Command processing regular expressions
  private commandPatterns = {
    help: /^help|^commands|^help\s+with|^what\s+can\s+you\s+do|^capabilities/i,
    status: /^status|^system\s+status|^health|^stats|^performance/i,
    searchKnowledge: /^(find|search|lookup|get|what|tell me|how|explain)\s+.+/i,
    farmCommands: /^farm\s+|^trading\s+farm\s+/i,
    agentCommands: /^agent\s+|^trading\s+agent\s+/i
  };

  constructor() {
    // Initialize socket connection in real app
    const wsUrl = process.env.NEXT_PUBLIC_ELIZA_WS_URL || 'wss://api.tradingfarm.ai/eliza/ws';
    this.socketManager = new WebSocketManager(wsUrl);
  }

  async connect(): Promise<boolean> {
    if (!this.socketManager) {
      return false;
    }
    
    const connected = await this.socketManager.connect();
    
    if (connected) {
      this.setupEventListeners();
    }
    
    return connected;
  }

  private setupEventListeners() {
    if (!this.socketManager) return;

    this.socketManager.on(SocketEventType.COMMAND_RESPONSE, (data: any) => {
      const commandId = data.commandId;
      if (commandId && this.commandCallbacks[commandId]) {
        this.commandCallbacks[commandId](data);
        delete this.commandCallbacks[commandId];
      }
    });

    this.socketManager.on(SocketEventType.KNOWLEDGE_RESPONSE, (data: any) => {
      const commandId = data.commandId;
      if (commandId && this.commandCallbacks[commandId]) {
        this.commandCallbacks[commandId](data);
        delete this.commandCallbacks[commandId];
      }
    });

    this.socketManager.on(SocketEventType.ERROR, (data: any) => {
      console.error('ElizaOS Error:', data.error);
    });
  }

  /**
   * Process a user command and return appropriate responses
   */
  async processCommand(commandText: string): Promise<CommandMessage[]> {
    const commandId = nanoid();
    const messages: CommandMessage[] = [];
    
    // Add user command as a message
    messages.push({
      id: nanoid(),
      content: commandText,
      timestamp: new Date(),
      type: 'command',
      source: 'user'
    });

    // For demo mode or development, generate a response locally
    if (DEMO_MODE || process.env.NODE_ENV === 'development') {
      const response = await this.generateDemoResponse(commandText);
      messages.push(...response);
      return messages;
    }
    
    // Send actual command to backend via WebSocket
    return new Promise((resolve) => {
      if (!this.socketManager) {
        messages.push({
          id: nanoid(),
          content: 'Error: Connection to ElizaOS not available.',
          timestamp: new Date(),
          type: 'alert',
          source: 'system'
        });
        resolve(messages);
        return;
      }
      
      // Register callback for this command
      this.commandCallbacks[commandId] = (response) => {
        if (response.messages && Array.isArray(response.messages)) {
          messages.push(...response.messages);
        } else if (response.error) {
          messages.push({
            id: nanoid(),
            content: `Error: ${response.error}`,
            timestamp: new Date(),
            type: 'alert',
            source: 'system'
          });
        }
        resolve(messages);
      };
      
      // Send command
      const success = this.socketManager.sendMessage(SocketEventType.COMMAND_REQUEST, {
        commandId,
        command: commandText
      });
      
      if (!success) {
        delete this.commandCallbacks[commandId];
        messages.push({
          id: nanoid(),
          content: 'Error: Failed to send command to ElizaOS.',
          timestamp: new Date(),
          type: 'alert',
          source: 'system'
        });
        resolve(messages);
      }
      
      // Set timeout for response
      setTimeout(() => {
        if (this.commandCallbacks[commandId]) {
          delete this.commandCallbacks[commandId];
          messages.push({
            id: nanoid(),
            content: 'Error: Command timed out. Please try again.',
            timestamp: new Date(),
            type: 'alert',
            source: 'system'
          });
          resolve(messages);
        }
      }, 10000); // 10 second timeout
    });
  }
  
  /**
   * Generate demo responses for testing without a backend
   */
  private async generateDemoResponse(command: string): Promise<CommandMessage[]> {
    const messages: CommandMessage[] = [];
    
    // Process with simple pattern matching
    if (this.commandPatterns.help.test(command)) {
      messages.push({
        id: nanoid(),
        content: 'Available commands:\n' +
                '- help: Display this help message\n' +
                '- status: Check system status\n' +
                '- search/find <query>: Search the knowledge base\n' +
                '- farm list: List all trading farms\n' +
                '- farm status <id>: Check status of a specific farm\n' +
                '- agent list: List all trading agents\n' +
                '- agent status <id>: Check status of a specific agent',
        timestamp: new Date(),
        type: 'system',
        source: 'system'
      });
    } 
    else if (this.commandPatterns.status.test(command)) {
      messages.push({
        id: nanoid(),
        content: 'System Status: Operational\n' +
                'Active Farms: 3\n' +
                'Active Agents: 7\n' +
                'Knowledge Base: 123 documents\n' +
                'Network: Stable\n' +
                'Backend Services: All operational',
        timestamp: new Date(),
        type: 'analysis',
        source: 'system'
      });
    }
    else if (this.commandPatterns.searchKnowledge.test(command)) {
      // Extract search query
      const query = command.replace(/^(find|search|lookup|get|what|tell me|how|explain)\s+/i, '').trim();
      
      // Simulate knowledge search
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
      
      const results = await this.searchKnowledgeBase(query);
      
      if (results.length > 0) {
        messages.push({
          id: nanoid(),
          content: `Found ${results.length} results for "${query}":`,
          timestamp: new Date(),
          type: 'query',
          source: 'knowledge-base'
        });
        
        // Add first result
        const firstResult = results[0];
        messages.push({
          id: nanoid(),
          content: `${firstResult.title}\n\n${firstResult.content.substring(0, 200)}${firstResult.content.length > 200 ? '...' : ''}`,
          timestamp: new Date(),
          type: 'analysis',
          source: 'knowledge-base'
        });
      } else {
        messages.push({
          id: nanoid(),
          content: `No knowledge base entries found for "${query}". Try a different search term.`,
          timestamp: new Date(),
          type: 'system',
          source: 'knowledge-base'
        });
      }
    }
    else if (this.commandPatterns.farmCommands.test(command)) {
      if (/list|show|all/i.test(command)) {
        messages.push({
          id: nanoid(),
          content: 'Trading Farms:\n' +
                  '1. Bitcoin Momentum Farm (ID: 1) - Status: Active\n' +
                  '2. Altcoin Swing Trader (ID: 2) - Status: Active\n' +
                  '3. DeFi Yield Aggregator (ID: 3) - Status: Paused',
          timestamp: new Date(),
          type: 'analysis',
          source: 'system'
        });
      } else if (/status|health|performance/i.test(command)) {
        // Extract farm ID if provided
        const idMatch = command.match(/(\d+)$/);
        const farmId = idMatch ? idMatch[1] : '1'; // Default to first farm if no ID specified
        
        messages.push({
          id: nanoid(),
          content: `Farm Status - ID: ${farmId}\n` +
                  'Name: Bitcoin Momentum Farm\n' +
                  'Status: Active\n' +
                  'Agents: 3 active\n' +
                  'Performance: +12.8% (30d)\n' +
                  'Current Positions: 5 open\n' +
                  'Risk Level: Medium',
          timestamp: new Date(),
          type: 'analysis',
          source: 'system'
        });
      } else {
        messages.push({
          id: nanoid(),
          content: 'Unknown farm command. Try "farm list" or "farm status <id>".',
          timestamp: new Date(),
          type: 'system',
          source: 'system'
        });
      }
    }
    else if (this.commandPatterns.agentCommands.test(command)) {
      if (/list|show|all/i.test(command)) {
        messages.push({
          id: nanoid(),
          content: 'Trading Agents:\n' +
                  '1. BTC Trend Follower (ID: 101) - Farm: 1 - Status: Active\n' +
                  '2. ETH Swing Trader (ID: 102) - Farm: 1 - Status: Active\n' +
                  '3. SOL Momentum (ID: 103) - Farm: 1 - Status: Idle\n' +
                  '4. AVAX DCA (ID: 201) - Farm: 2 - Status: Active\n' +
                  '5. DOT Grid (ID: 202) - Farm: 2 - Status: Active',
          timestamp: new Date(),
          type: 'analysis',
          source: 'system'
        });
      } else if (/status|health|performance/i.test(command)) {
        // Extract agent ID if provided
        const idMatch = command.match(/(\d+)$/);
        const agentId = idMatch ? idMatch[1] : '101'; // Default to first agent if no ID specified
        
        messages.push({
          id: nanoid(),
          content: `Agent Status - ID: ${agentId}\n` +
                  'Name: BTC Trend Follower\n' +
                  'Type: Momentum\n' +
                  'Farm: Bitcoin Momentum Farm\n' +
                  'Status: Active\n' +
                  'Performance: +8.2% (30d)\n' +
                  'Current Position: Long BTC (2.5x)\n' +
                  'Last Action: Increased position at $61,240',
          timestamp: new Date(),
          type: 'analysis',
          source: 'strategy'
        });
      } else {
        messages.push({
          id: nanoid(),
          content: 'Unknown agent command. Try "agent list" or "agent status <id>".',
          timestamp: new Date(),
          type: 'system',
          source: 'system'
        });
      }
    }
    else {
      // Default response for unrecognized commands
      messages.push({
        id: nanoid(),
        content: `I'm not sure how to process "${command}". Type "help" to see available commands.`,
        timestamp: new Date(),
        type: 'system',
        source: 'system'
      });
    }
    
    return messages;
  }
  
  /**
   * Search the knowledge base for relevant documents
   */
  private async searchKnowledgeBase(query: string): Promise<KnowledgeDocument[]> {
    // In demo mode, search the demo knowledge documents
    if (DEMO_MODE || process.env.NODE_ENV === 'development') {
      // Simple search implementation for demo purposes
      const results = demoKnowledgeDocuments.filter(doc => {
        const lowerQuery = query.toLowerCase();
        return (
          doc.title.toLowerCase().includes(lowerQuery) ||
          doc.content.toLowerCase().includes(lowerQuery) ||
          (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
        );
      });
      
      return results;
    }
    
    // In production, search using Supabase or API
    try {
      // First try exact match search
      const { data: exactMatches, error: exactError } = await this.supabase
        .from('knowledge_base')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(5);
        
      if (exactError) throw exactError;
      
      if (exactMatches && exactMatches.length > 0) {
        return exactMatches as KnowledgeDocument[];
      }
      
      // If no exact matches, try semantic search if available
      // This would use a vector database like pgvector in Supabase
      
      // Fallback to demo data if nothing found
      return [];
      
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }
  
  /**
   * Clean up resources
   */
  disconnect() {
    if (this.socketManager) {
      this.socketManager.disconnect();
    }
  }
}

// Export singleton instance
export const elizaService = new ElizaOSService();
