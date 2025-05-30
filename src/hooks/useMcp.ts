import { useEffect, useCallback, useState } from 'react';
import { getSupabaseMcpClient } from '@/utils/mcp/supabase-mcp-client';
import type { McpMessage, McpEvent, McpSubscription } from '@/services/mcp/supabase-mcp-server';

export interface UseMcpOptions {
  agentId?: string;
  autoSubscribe?: string[];
  onMessage?: (message: McpMessage) => void;
}

export function useMcp(options: UseMcpOptions = {}) {
  const { agentId, autoSubscribe = [], onMessage } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mcpClient = getSupabaseMcpClient();

  // Send a message through the MCP
  const sendMessage = useCallback(async (message: Omit<McpMessage, 'id' | 'status'>) => {
    try {
      const result = await mcpClient.sendMessage(message);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [mcpClient]);

  // Subscribe to a topic
  const subscribeToTopic = useCallback(async (topic: string) => {
    if (!agentId) {
      throw new Error('Agent ID is required to subscribe to topics');
    }

    try {
      const result = await mcpClient.subscribeToTopic({
        agent_id: agentId,
        topic
      });

      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to topic');
      throw err;
    }
  }, [mcpClient, agentId]);

  // Broadcast an event to all subscribers
  const broadcastEvent = useCallback(async (event: McpEvent) => {
    try {
      const result = await mcpClient.broadcastEvent(event);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast event');
      throw err;
    }
  }, [mcpClient]);

  // Update agent status
  const updateStatus = useCallback(async (status: string, metadata?: any) => {
    if (!agentId) {
      throw new Error('Agent ID is required to update status');
    }

    try {
      const result = await mcpClient.updateAgentStatus(agentId, status, metadata);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      throw err;
    }
  }, [mcpClient, agentId]);

  // Handle incoming messages
  const handleMessages = useCallback((messages: McpMessage[]) => {
    messages.forEach(message => {
      onMessage?.(message);
      mcpClient.markMessageDelivered(message.id!);
    });
  }, [mcpClient, onMessage]);

  // Set up message polling and auto-subscriptions
  useEffect(() => {
    if (!agentId) return;

    const setup = async () => {
      try {
        // Subscribe to auto-subscribe topics
        for (const topic of autoSubscribe) {
          await subscribeToTopic(topic);
        }

        // Update initial status
        await updateStatus('online');

        // Start polling for messages
        mcpClient.startPolling(agentId, handleMessages);
        
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set up MCP connection');
        setIsConnected(false);
      }
    };

    setup();

    // Cleanup on unmount
    return () => {
      if (agentId) {
        mcpClient.stopPolling(agentId);
        updateStatus('offline').catch(console.error);
      }
    };
  }, [agentId, autoSubscribe, mcpClient, handleMessages, subscribeToTopic, updateStatus]);

  return {
    isConnected,
    error,
    sendMessage,
    subscribeToTopic,
    broadcastEvent,
    updateStatus
  };
} 