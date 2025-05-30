import { useState } from 'react';
import { elizaOSApiClient } from '@/services/api-client';
import { useToast } from '@/components/ui/use-toast';
import { ConsoleMessage, MessageCategory, MessageSource } from '@/types/elizaos.types';

type ElizaOSHookReturn = {
  executeCommand: (command: string, farmId: string) => Promise<void>;
  queryKnowledge: (query: string, farmId?: string) => Promise<void>;
  getCommandHistory: (farmId: string) => Promise<ConsoleMessage[]>;
  getStrategyRecommendations: (farmId: string) => Promise<any>;
  getRiskAnalysis: (farmId: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
};

export function useElizaOS(): ElizaOSHookReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Execute a command on ElizaOS
  const executeCommand = async (command: string, farmId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await elizaOSApiClient.executeCommand(command, farmId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to execute command');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Command Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Query the ElizaOS knowledge base
  const queryKnowledge = async (query: string, farmId?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await elizaOSApiClient.queryKnowledge(query, farmId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to query knowledge');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Knowledge Query Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get command history for a farm
  const getCommandHistory = async (farmId: string): Promise<ConsoleMessage[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await elizaOSApiClient.getCommandHistory(farmId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get command history');
      }
      
      // Convert API response to ConsoleMessage format
      const messages = response.data.map(item => ({
        id: item.id,
        content: item.response,
        timestamp: item.timestamp,
        category: item.category as MessageCategory,
        source: item.source as MessageSource,
        isUser: false,
        sender: 'elizaos',
        metadata: {
          command: item.command,
          farmId
        }
      }));
      
      return messages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get AI-generated strategy recommendations
  const getStrategyRecommendations = async (farmId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await elizaOSApiClient.getStrategyRecommendations(farmId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get strategy recommendations');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Strategy Recommendations Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get AI-powered risk analysis
  const getRiskAnalysis = async (farmId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await elizaOSApiClient.getRiskAnalysis(farmId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get risk analysis');
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Risk Analysis Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeCommand,
    queryKnowledge,
    getCommandHistory,
    getStrategyRecommendations,
    getRiskAnalysis,
    isLoading,
    error
  };
}
