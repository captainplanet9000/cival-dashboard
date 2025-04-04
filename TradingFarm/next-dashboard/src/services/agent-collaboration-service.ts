/**
 * Agent Collaboration Service
 * Manages agent-to-agent communication and collaboration
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Types for agent communication
export interface AgentCommunication {
  id: string;
  sender_id: string;
  recipient_id?: string;
  farm_id?: string;
  is_broadcast: boolean;
  content: string;
  message_type: 'broadcast' | 'direct' | 'command' | 'status' | 'query' | 'analysis' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Types for agent collaborations
export interface AgentCollaboration {
  id: string;
  name: string;
  description?: string;
  farm_id: string;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  members?: AgentCollaborationMember[];
}

export interface AgentCollaborationMember {
  id: string;
  collaboration_id: string;
  agent_id: string;
  role: 'leader' | 'member' | 'observer';
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
  agent?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Agent collaboration service for managing agent-to-agent interactions
 */
export const agentCollaborationService = {
  /**
   * Send a message from one agent to another
   */
  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: AgentCommunication['message_type'] = 'direct',
    priority: AgentCommunication['priority'] = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<ApiResponse<AgentCommunication>> {
    try {
      const response = await fetch('/api/agents/communications/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          priority,
          metadata
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send direct message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return { data: result.communication };
    } catch (error) {
      console.error('Error sending direct message:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Broadcast a message to all agents in a farm
   */
  async broadcastToFarm(
    senderId: string,
    farmId: string,
    content: string,
    messageType: AgentCommunication['message_type'] = 'broadcast',
    priority: AgentCommunication['priority'] = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<ApiResponse<AgentCommunication>> {
    try {
      const response = await fetch('/api/agents/communications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: senderId,
          farm_id: farmId,
          content,
          message_type: messageType,
          priority,
          metadata,
          is_broadcast: true
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to broadcast message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return { data: result.communication };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get messages for an agent
   */
  async getMessagesForAgent(
    agentId: string,
    limit: number = 50,
    includeRead: boolean = false
  ): Promise<ApiResponse<AgentCommunication[]>> {
    try {
      const url = new URL(`/api/agents/communications`, window.location.origin);
      url.searchParams.append('agentId', agentId);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('includeRead', includeRead.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.communications || !Array.isArray(result.communications)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.communications };
    } catch (error) {
      console.error('Error fetching messages for agent:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Mark a message as read
   */
  async markMessageAsRead(
    messageId: string
  ): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`/api/agents/communications/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark message as read: ${response.statusText}`);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Create a new collaboration group
   */
  async createCollaboration(
    name: string,
    farmId: string,
    description?: string,
    config: Record<string, any> = {}
  ): Promise<ApiResponse<AgentCollaboration>> {
    try {
      const response = await fetch('/api/agents/collaborations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          farm_id: farmId,
          description,
          config
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create collaboration: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return { data: result.collaboration };
    } catch (error) {
      console.error('Error creating collaboration:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get all collaborations for a farm
   */
  async getCollaborationsForFarm(
    farmId: string
  ): Promise<ApiResponse<AgentCollaboration[]>> {
    try {
      const response = await fetch(`/api/agents/collaborations?farmId=${farmId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch collaborations: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.collaborations || !Array.isArray(result.collaborations)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.collaborations };
    } catch (error) {
      console.error('Error fetching collaborations for farm:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get a specific collaboration with its members
   */
  async getCollaboration(
    collaborationId: string
  ): Promise<ApiResponse<AgentCollaboration>> {
    try {
      const response = await fetch(`/api/agents/collaborations/${collaborationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch collaboration: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.collaboration) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.collaboration };
    } catch (error) {
      console.error('Error fetching collaboration:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Add an agent to a collaboration
   */
  async addAgentToCollaboration(
    collaborationId: string,
    agentId: string,
    role: AgentCollaborationMember['role'] = 'member',
    permissions: Record<string, any> = {}
  ): Promise<ApiResponse<AgentCollaborationMember>> {
    try {
      const response = await fetch(`/api/agents/collaborations/${collaborationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          role,
          permissions
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add agent to collaboration: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return { data: result.member };
    } catch (error) {
      console.error('Error adding agent to collaboration:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Remove an agent from a collaboration
   */
  async removeAgentFromCollaboration(
    collaborationId: string,
    agentId: string
  ): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`/api/agents/collaborations/${collaborationId}/members/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove agent from collaboration: ${response.statusText}`);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error removing agent from collaboration:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Update an agent's role in a collaboration
   */
  async updateAgentRole(
    collaborationId: string,
    agentId: string,
    role: AgentCollaborationMember['role'],
    permissions?: Record<string, any>
  ): Promise<ApiResponse<AgentCollaborationMember>> {
    try {
      const body: Record<string, any> = { role };
      if (permissions) body.permissions = permissions;
      
      const response = await fetch(`/api/agents/collaborations/${collaborationId}/members/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update agent role: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return { data: result.member };
    } catch (error) {
      console.error('Error updating agent role:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Subscribe to collaboration messages
   * This allows agents to communicate in real-time
   */
  subscribeToCollaborationMessages(
    collaborationId: string,
    callback: (message: AgentCommunication) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    // Create a channel for this collaboration
    const channel = supabase.channel(`collaboration-${collaborationId}`);
    
    channel
      .on('broadcast', { event: 'collaboration_message' }, (payload) => {
        callback(payload.payload as AgentCommunication);
      })
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Send a message to a collaboration group
   */
  async sendCollaborationMessage(
    senderId: string,
    collaborationId: string,
    content: string,
    messageType: AgentCommunication['message_type'] = 'direct',
    priority: AgentCommunication['priority'] = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<ApiResponse<AgentCommunication>> {
    try {
      const response = await fetch(`/api/agents/collaborations/${collaborationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: senderId,
          content,
          message_type: messageType,
          priority,
          metadata
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send collaboration message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return { data: result.communication };
    } catch (error) {
      console.error('Error sending collaboration message:', error);
      return { error: 'An unexpected error occurred' };
    }
  }
};
