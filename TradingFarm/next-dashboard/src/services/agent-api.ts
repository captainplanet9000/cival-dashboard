/**
 * API client for interacting with the Trading Farm AI Agent Service
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000';

export interface AgentCreateRequest {
  name: string;
  instructions: string;
}

export interface MessageRequest {
  agent_id: string;
  message: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  created_at?: string;
  status?: string;
}

export interface AgentResponse {
  agent_id: string;
  response: any;
  timestamp: string;
}

export class AgentApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new trading agent
   */
  async createAgent(request: AgentCreateRequest): Promise<Agent> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create agent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Send a message to an agent
   */
  async sendMessage(request: MessageRequest): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${request.agent_id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: request.message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * List all available agents
   */
  async listAgents(): Promise<{ agents: Agent[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to list agents');
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing agents:', error);
      throw error;
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<{ agent_id: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete agent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  /**
   * Check if the agent service is available
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Agent service is unavailable');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking agent service health:', error);
      throw error;
    }
  }
}

export const agentApi = new AgentApiClient();

export default agentApi;
