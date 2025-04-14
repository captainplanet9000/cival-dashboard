/**
 * useElizaMessaging Hook
 * 
 * A React hook for interacting with the ElizaOS messaging system.
 * Provides an interface for sending commands, querying knowledge, and retrieving message history
 * while avoiding infinite rendering loops by properly managing dependencies.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  elizaOSMessagingAdapter, 
  AgentMessage, 
  AgentCommunicationResponse 
} from '@/services/elizaos-messaging-adapter';

interface UseElizaMessagingProps {
  agentId: string;
  refreshInterval?: number; // in milliseconds, set to 0 to disable auto-refresh
  initialMessageLimit?: number;
}

interface UseElizaMessagingResult {
  messages: AgentMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, messageType?: AgentMessage['message_type'], metadata?: any) => Promise<AgentCommunicationResponse>;
  sendCommand: (command: string, context?: Record<string, any>) => Promise<AgentCommunicationResponse>;
  queryKnowledge: (query: string, filters?: Record<string, any>) => Promise<AgentCommunicationResponse>;
  executeTradingAction: (action: string, symbol: string, amount: number, additionalParams?: Record<string, any>) => Promise<AgentCommunicationResponse>;
  refreshMessages: () => Promise<void>;
}

export function useElizaMessaging({
  agentId,
  refreshInterval = 5000, // Default to 5 seconds
  initialMessageLimit = 50
}: UseElizaMessagingProps): UseElizaMessagingResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
  // Function to fetch messages with throttling to prevent infinite updates
  const refreshMessages = useCallback(async () => {
    if (!agentId) return;
    
    // Check if we're updating too frequently and throttle if needed
    const now = Date.now();
    if (now - lastUpdatedRef.current < MIN_UPDATE_INTERVAL) {
      console.log('Throttling message refresh to prevent update cycles');
      // Just update the timestamp but don't actually refresh
      setLastRefreshTime(now);
      return;
    }
    
    try {
      setLoading(true);
      lastUpdatedRef.current = now;
      
      const response = await elizaOSMessagingAdapter.getElizaMessages(
        agentId,
        initialMessageLimit
      );
      
      if (response.success && response.data) {
        // Store the fetched messages (without causing unnecessary re-renders if data is the same)
        setMessages(prevMessages => {
          // Check if the data is actually different to avoid unnecessary re-renders
          if (JSON.stringify(prevMessages) === JSON.stringify(response.data)) {
            return prevMessages;
          }
          return response.data;
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch messages');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching messages');
    } finally {
      setLoading(false);
      // Update the last refresh time without causing a needless re-render
      const latestTime = Date.now();
      lastUpdatedRef.current = latestTime;
      setLastRefreshTime(latestTime);
    }
  }, [agentId, initialMessageLimit]);
  
  // Send a message to the agent
  const sendMessage = useCallback(async (
    content: string,
    messageType: AgentMessage['message_type'] = 'direct',
    metadata: any = {}
  ): Promise<AgentCommunicationResponse> => {
    try {
      const response = await elizaOSMessagingAdapter.sendMessage(
        'user', // Sender ID is always 'user' for now
        agentId,
        content,
        messageType,
        'medium', // Default priority
        metadata
      );
      
      // Only refresh if we need to and the send was successful
      if (response.success) {
        // Use setTimeout to avoid immediate state updates that could cause render loops
        setTimeout(() => refreshMessages(), 500);
      }
      
      return response;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to send message'
      };
    }
  }, [agentId, refreshMessages]);
  
  // Send a command to the agent
  const sendCommand = useCallback(async (
    command: string,
    context: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> => {
    try {
      const response = await elizaOSMessagingAdapter.sendElizaCommand(
        agentId,
        command,
        context
      );
      
      // Only refresh if we need to and the send was successful
      if (response.success) {
        // Use setTimeout to avoid immediate state updates that could cause render loops
        setTimeout(() => refreshMessages(), 500);
      }
      
      return response;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to send command'
      };
    }
  }, [agentId, refreshMessages]);
  
  // Query the agent's knowledge base
  const queryKnowledge = useCallback(async (
    query: string,
    filters: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> => {
    try {
      const response = await elizaOSMessagingAdapter.queryKnowledgeBase(
        agentId,
        query,
        filters
      );
      
      // Only refresh if we need to and the query was successful
      if (response.success) {
        // Use setTimeout to avoid immediate state updates that could cause render loops
        setTimeout(() => refreshMessages(), 500);
      }
      
      return response;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to query knowledge base'
      };
    }
  }, [agentId, refreshMessages]);
  
  // Execute a trading action through the agent
  const executeTradingAction = useCallback(async (
    action: string,
    symbol: string,
    amount: number,
    additionalParams: Record<string, any> = {}
  ): Promise<AgentCommunicationResponse> => {
    try {
      const response = await elizaOSMessagingAdapter.executeTradingAction(
        agentId,
        action,
        symbol,
        amount,
        additionalParams
      );
      
      // Only refresh if we need to and the action was successful
      if (response.success) {
        // Use setTimeout to avoid immediate state updates that could cause render loops
        setTimeout(() => refreshMessages(), 500);
      }
      
      return response;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to execute trading action'
      };
    }
  }, [agentId, refreshMessages]);
  
  // Add a reference to track update cycles and prevent infinite loops
  const updateCycleRef = useRef(0);
  const lastUpdatedRef = useRef(Date.now());
  const MIN_UPDATE_INTERVAL = 2000; // 2 seconds minimum between updates
  
  // Effect for initial load and subscribe to real-time updates
  useEffect(() => {
    if (!agentId) return;
    
    // To prevent repeated calls during development with React strict mode
    if (updateCycleRef.current === 0) {
      // Load messages on mount
      refreshMessages();
      updateCycleRef.current++;
    }
    
    // Set up a subscription to real-time messages with throttling to prevent loops
    const unsubscribe = elizaOSMessagingAdapter.subscribeToMessages(
      agentId,
      (newMessage) => {
        // Only update if enough time has passed since the last update
        const now = Date.now();
        if (now - lastUpdatedRef.current < MIN_UPDATE_INTERVAL) {
          // Skip this update to prevent potential render loops
          return;
        }
        
        // Update messages list when new message arrives
        setMessages(prevMessages => {
          // Check if message already exists to prevent duplicates
          const exists = prevMessages.some(msg => msg.id === newMessage.id);
          if (exists) return prevMessages;
          
          // Add new message at the beginning of the array
          lastUpdatedRef.current = now;
          return [newMessage, ...prevMessages];
        });
      }
    );
    
    // Set up auto-refresh interval if enabled
    let intervalId: NodeJS.Timeout | undefined;
    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        // Only refresh if enough time has passed since the last refresh
        // This helps prevent render loops
        const now = Date.now();
        if (now - lastRefreshTime > refreshInterval && 
            now - lastUpdatedRef.current > MIN_UPDATE_INTERVAL) {
          lastUpdatedRef.current = now;
          refreshMessages();
        }
      }, refreshInterval);
    }
    
    // Cleanup function
    return () => {
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [agentId, refreshInterval, lastRefreshTime, refreshMessages]);
  
  return {
    messages,
    loading,
    error,
    sendMessage,
    sendCommand,
    queryKnowledge,
    executeTradingAction,
    refreshMessages
  };
}
