/**
 * ElizaOS Hook
 * 
 * React hook for interacting with the ElizaOS AI agent framework
 * Provides agent management, messaging, and knowledge base operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ElizaOSClient,
  Agent,
  AgentConfig,
  AgentMessage,
  KnowledgeDocument,
  AgentPerformance
} from '../clients/elizaos-client';
import { MonitoringService } from '../monitoring-service';

export interface UseElizaOSOptions {
  agentId?: string;
  autoLoad?: boolean;
}

/**
 * Hook for interacting with ElizaOS agents
 */
export default function useElizaOS(options: UseElizaOSOptions = {}) {
  const { agentId: initialAgentId, autoLoad = true } = options;
  
  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  // Message subscription
  const messageSubscription = useRef<(() => void) | null>(null);
  
  // Initialize client
  const client = ElizaOSClient.getInstance();
  
  // Load agents when component mounts if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      loadAgents();
    }
  }, [autoLoad]);
  
  // Load specific agent when agentId changes
  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
      loadMessageHistory(agentId);
      setupMessageSubscription(agentId);
    }
    
    return () => {
      if (messageSubscription.current) {
        messageSubscription.current();
        messageSubscription.current = null;
      }
    };
  }, [agentId]);
  
  /**
   * Set up message subscription for an agent
   */
  const setupMessageSubscription = useCallback((agentId: string) => {
    // Clean up existing subscription
    if (messageSubscription.current) {
      messageSubscription.current();
      messageSubscription.current = null;
    }
    
    // Set up new subscription
    messageSubscription.current = client.subscribeToMessages(agentId, (message) => {
      setMessages((prev) => {
        // Check if message already exists
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        
        // Add new message
        return [...prev, message];
      });
    });
    
    setIsListening(true);
    
    return () => {
      if (messageSubscription.current) {
        messageSubscription.current();
        messageSubscription.current = null;
        setIsListening(false);
      }
    };
  }, [client]);
  
  /**
   * Load all agents for the current user
   */
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAgents();
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setAgents(response.data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load agents');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load ElizaOS agents',
        data: { error }
      });
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Load a specific agent by ID
   */
  const loadAgent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAgent(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setAgent(response.data);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load agent ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load ElizaOS agent ${id}`,
        data: { error, agentId: id }
      });
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Create a new agent
   */
  const createAgent = useCallback(async (config: AgentConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.createAgent(config);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update agents list
        setAgents((prev) => [...prev, response.data!]);
        
        // Set as current agent if no agent is selected
        if (!agentId) {
          setAgentId(response.data.id);
          setAgent(response.data);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create agent');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create ElizaOS agent',
        data: { error, config }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, agentId]);
  
  /**
   * Update an existing agent
   */
  const updateAgent = useCallback(async (
    id: string,
    updates: Partial<AgentConfig>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.updateAgent(id, updates);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update agents list
        setAgents((prev) => 
          prev.map((a) => a.id === id ? response.data! : a)
        );
        
        // Update current agent if it's the one being updated
        if (agentId === id) {
          setAgent(response.data);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update agent ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update ElizaOS agent ${id}`,
        data: { error, agentId: id, updates }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, agentId]);
  
  /**
   * Delete an agent
   */
  const deleteAgent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.deleteAgent(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update agents list
        setAgents((prev) => prev.filter((a) => a.id !== id));
        
        // Clear current agent if it's the one being deleted
        if (agentId === id) {
          setAgentId(undefined);
          setAgent(null);
          setMessages([]);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to delete agent ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete ElizaOS agent ${id}`,
        data: { error, agentId: id }
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [client, agentId]);
  
  /**
   * Load message history for an agent
   */
  const loadMessageHistory = useCallback(async (
    id: string,
    limit: number = 50,
    before?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getMessageHistory(id, limit, before);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setMessages(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load message history for agent ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load message history for ElizaOS agent ${id}`,
        data: { error, agentId: id, limit, before }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Send a message to an agent
   */
  const sendMessage = useCallback(async (
    content: string,
    metadata?: Record<string, any>
  ) => {
    if (!agentId) {
      setError(new Error('No agent selected'));
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Add message to state immediately for better UX
      const tempMessage: AgentMessage = {
        id: `temp-${Date.now()}`,
        agentId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        metadata
      };
      
      setMessages((prev) => [...prev, tempMessage]);
      
      const response = await client.sendMessage(agentId, content, metadata);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      // Replace temp message with actual message
      if (response.data) {
        setMessages((prev) => 
          prev.filter((m) => m.id !== tempMessage.id)
        );
        
        // Add real message from response
        if (response.data.message) {
          setMessages((prev) => [...prev, response.data!.message]);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to send message to ElizaOS agent ${agentId}`,
        data: { error, agentId, content }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, agentId]);
  
  /**
   * Get knowledge documents from the knowledge base
   */
  const getKnowledgeDocuments = useCallback(async (
    tags?: string[],
    limit: number = 20,
    offset: number = 0
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getKnowledgeDocuments(tags, limit, offset);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get knowledge documents');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get ElizaOS knowledge documents',
        data: { error, tags, limit, offset }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Create a knowledge document
   */
  const createKnowledgeDocument = useCallback(async (
    document: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.createKnowledgeDocument(document);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create knowledge document');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create ElizaOS knowledge document',
        data: { error, document }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Delete a knowledge document
   */
  const deleteKnowledgeDocument = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.deleteKnowledgeDocument(documentId);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to delete knowledge document ${documentId}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete ElizaOS knowledge document ${documentId}`,
        data: { error, documentId }
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Get agent performance metrics
   */
  const getAgentPerformance = useCallback(async (
    id: string,
    startDate: string,
    endDate: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAgentPerformance(id, startDate, endDate);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to get performance metrics for agent ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get performance metrics for ElizaOS agent ${id}`,
        data: { error, agentId: id, startDate, endDate }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Select an agent
   */
  const selectAgent = useCallback((id: string) => {
    setAgentId(id);
  }, []);
  
  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (messageSubscription.current) {
        messageSubscription.current();
        messageSubscription.current = null;
      }
    };
  }, []);
  
  return {
    agentId,
    agent,
    agents,
    loading,
    error,
    messages,
    isListening,
    loadAgents,
    loadAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    loadMessageHistory,
    sendMessage,
    getKnowledgeDocuments,
    createKnowledgeDocument,
    deleteKnowledgeDocument,
    getAgentPerformance,
    selectAgent,
    resetError
  };
}
