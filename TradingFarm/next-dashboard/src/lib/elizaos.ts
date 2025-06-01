/**
 * ElizaOS - A simple agent operation system simulation
 * This library provides utilities for managing and interacting with ELIZA agents.
 */

// Basic agent state types
export type AgentStatus = 'online' | 'offline' | 'busy' | 'error' | 'warning';

export interface ElizaAgent {
  id: string;
  name: string;
  status: AgentStatus;
  capabilities: string[];
  lastActivity?: Date;
  description?: string;
  contextSize?: number;
  version?: string;
}

export interface ElizaMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'agent';
  metadata?: Record<string, any>;
}

export interface ElizaCommand {
  command: string;
  args?: Record<string, any>;
  callback?: (response: any) => void;
}

// Agent manager class - handles agent lifecycle and interactions
export class ElizaAgentManager {
  private agents: Map<string, ElizaAgent> = new Map();
  private messages: ElizaMessage[] = [];
  private listeners: ((event: string, data: any) => void)[] = [];

  // Initialize an agent
  public registerAgent(agent: ElizaAgent): void {
    this.agents.set(agent.id, agent);
    this.notifyListeners('agent_registered', agent);
  }

  // Remove an agent
  public removeAgent(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    if (removed) {
      this.notifyListeners('agent_removed', { agentId });
    }
    return removed;
  }

  // Update agent status
  public updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActivity = new Date();
      this.agents.set(agentId, agent);
      this.notifyListeners('agent_status_changed', { agentId, status });
    }
  }

  // Send a message to an agent
  public sendMessage(agentId: string, content: string): ElizaMessage | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    // Update agent status to busy
    this.updateAgentStatus(agentId, 'busy');

    // Create and store message
    const message: ElizaMessage = {
      id: this.generateId(),
      agentId,
      content,
      timestamp: new Date(),
      sender: 'user',
    };

    this.messages.push(message);
    this.notifyListeners('message_sent', message);

    // Simulate agent processing and response
    setTimeout(() => {
      this.simulateAgentResponse(agentId, content);
    }, 1000);

    return message;
  }

  // Simulate an agent response (for demo purposes)
  private simulateAgentResponse(agentId: string, prompt: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Create simple response based on prompt
    const responses = [
      `I've processed your request regarding "${prompt.substring(0, 20)}..."`,
      `Here's what I found about "${prompt.substring(0, 20)}..."`,
      `I'm analyzing the data related to "${prompt.substring(0, 20)}..."`,
      `Working on your request for "${prompt.substring(0, 20)}..."`,
    ];

    const responseText = responses[Math.floor(Math.random() * responses.length)];

    // Create and store response message
    const message: ElizaMessage = {
      id: this.generateId(),
      agentId,
      content: responseText,
      timestamp: new Date(),
      sender: 'agent',
    };

    this.messages.push(message);
    this.notifyListeners('message_received', message);

    // Update agent status back to online
    setTimeout(() => {
      this.updateAgentStatus(agentId, 'online');
    }, 500);
  }

  // Execute a command on an agent
  public executeCommand(agentId: string, command: ElizaCommand): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      if (command.callback) {
        command.callback({ error: 'Agent not found', success: false });
      }
      return;
    }

    // Update agent status
    this.updateAgentStatus(agentId, 'busy');

    // Simulate command execution
    setTimeout(() => {
      // Mock response based on command
      const response = {
        command: command.command,
        timestamp: new Date(),
        success: true,
        result: `Executed ${command.command} successfully`,
      };

      // Call the callback if provided
      if (command.callback) {
        command.callback(response);
      }

      this.notifyListeners('command_executed', {
        agentId,
        command: command.command,
        response,
      });

      // Update agent status back to online
      setTimeout(() => {
        this.updateAgentStatus(agentId, 'online');
      }, 500);
    }, 1500);
  }

  // Get all messages for an agent
  public getMessages(agentId: string): ElizaMessage[] {
    return this.messages.filter((msg) => msg.agentId === agentId);
  }

  // Get an agent by ID
  public getAgent(agentId: string): ElizaAgent | undefined {
    return this.agents.get(agentId);
  }

  // Get all agents
  public getAllAgents(): ElizaAgent[] {
    return Array.from(this.agents.values());
  }

  // Add event listener
  public addEventListener(callback: (event: string, data: any) => void): void {
    this.listeners.push(callback);
  }

  // Remove event listener
  public removeEventListener(callback: (event: string, data: any) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notify all listeners of an event
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in ElizaOS event listener:', error);
      }
    });
  }

  // Generate a unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}

// Create a singleton instance
const elizaManager = new ElizaAgentManager();

/**
 * React hook to access and manage ELIZA agents
 * Mock implementation for build
 */
export function useElizaAgents() {
  return {
    agents: [] as ElizaAgent[],
    isLoading: false,
    error: null,
    refreshAgents: () => {},
    getAgent: (id: string) => null as ElizaAgent | null,
    sendMessage: (agentId: string, content: string) => Promise.resolve({} as ElizaMessage),
    messages: [] as ElizaMessage[],
  };
}

export default elizaManager;
