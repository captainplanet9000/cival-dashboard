/**
 * React hook for accessing Trading Farm database services
 * Provides type-safe access to both Neon PostgreSQL and Pinecone Vector Database functionality
 */
import { useState, useEffect } from 'react';
import tradingFarmDb, {
  Farm, Agent, Strategy, Trade, Goal, WalletTransaction,
  StrategyKnowledge, AgentInstruction, ElizaCommand
} from '@/utils/database';

// Types for hook return values
interface UseTradingFarmDbReturn {
  // Loading and error states
  isLoading: boolean;
  error: Error | null;
  
  // Farm Management
  farms: Farm[];
  createFarm: (farm: Omit<Farm, 'id' | 'created_at'>) => Promise<Farm>;
  getFarm: (id: string) => Promise<Farm | null>;
  updateFarm: (id: string, data: Partial<Farm>) => Promise<Farm | null>;
  deleteFarm: (id: string) => Promise<boolean>;
  refreshFarms: () => Promise<void>;
  
  // Strategy Knowledge Management
  addStrategyDocument: (document: StrategyKnowledge) => Promise<string>;
  searchStrategyDocuments: (query: string, farmId?: string) => Promise<StrategyKnowledge[]>;
  
  // Agent Instructions
  addAgentInstruction: (instruction: AgentInstruction) => Promise<string>;
  getRelevantInstructions: (context: string, agentId: string) => Promise<AgentInstruction[]>;
  
  // ElizaOS Command Intent Detection
  addElizaCommand: (command: ElizaCommand) => Promise<string>;
  detectCommandIntent: (userInput: string) => Promise<ElizaCommand | null>;
  
  // Message Bus Activity
  logMessageBusActivity: (
    fromFarmId: string,
    toFarmId: string,
    messageType: string,
    content: string
  ) => Promise<{ id: string, vectorId: string }>;
  searchMessageBusActivity: (query: string) => Promise<any[]>;
}

/**
 * Hook for accessing Trading Farm database services
 * Provides a centralized way to interact with the database layer
 */
export function useTradingFarmDb(): UseTradingFarmDbReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize the database connection
  useEffect(() => {
    const initializeDb = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await tradingFarmDb.initialize();
        setInitialized(true);
        await refreshFarms();
      } catch (err) {
        console.error('Failed to initialize Trading Farm database:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!initialized) {
      initializeDb();
    }
    
    // Clean up connection when component unmounts
    return () => {
      if (initialized) {
        tradingFarmDb.close().catch(console.error);
      }
    };
  }, [initialized]);
  
  // Farm Management functions
  const refreshFarms = async () => {
    try {
      const farmsList = await tradingFarmDb.getFarms();
      setFarms(farmsList);
    } catch (err) {
      console.error('Failed to fetch farms:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };
  
  const createFarm = async (farm: Omit<Farm, 'id' | 'created_at'>) => {
    try {
      const newFarm = await tradingFarmDb.createFarm(farm);
      await refreshFarms();
      return newFarm;
    } catch (err) {
      console.error('Failed to create farm:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const getFarm = async (id: string) => {
    try {
      return await tradingFarmDb.getFarm(id);
    } catch (err) {
      console.error(`Failed to get farm ${id}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const updateFarm = async (id: string, data: Partial<Farm>) => {
    try {
      const updatedFarm = await tradingFarmDb.updateFarm(id, data);
      await refreshFarms();
      return updatedFarm;
    } catch (err) {
      console.error(`Failed to update farm ${id}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const deleteFarm = async (id: string) => {
    try {
      const result = await tradingFarmDb.deleteFarm(id);
      await refreshFarms();
      return result;
    } catch (err) {
      console.error(`Failed to delete farm ${id}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  // Strategy Knowledge Management
  const addStrategyDocument = async (document: StrategyKnowledge) => {
    try {
      return await tradingFarmDb.addStrategyDocument(document);
    } catch (err) {
      console.error('Failed to add strategy document:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const searchStrategyDocuments = async (query: string, farmId?: string) => {
    try {
      return await tradingFarmDb.searchStrategyDocuments(query, farmId);
    } catch (err) {
      console.error('Failed to search strategy documents:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  // Agent Instructions
  const addAgentInstruction = async (instruction: AgentInstruction) => {
    try {
      return await tradingFarmDb.addAgentInstruction(instruction);
    } catch (err) {
      console.error('Failed to add agent instruction:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const getRelevantInstructions = async (context: string, agentId: string) => {
    try {
      return await tradingFarmDb.getRelevantInstructions(context, agentId);
    } catch (err) {
      console.error('Failed to get relevant instructions:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  // ElizaOS Command Intent Detection
  const addElizaCommand = async (command: ElizaCommand) => {
    try {
      return await tradingFarmDb.addElizaCommand(command);
    } catch (err) {
      console.error('Failed to add ElizaOS command:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const detectCommandIntent = async (userInput: string) => {
    try {
      return await tradingFarmDb.detectCommandIntent(userInput);
    } catch (err) {
      console.error('Failed to detect command intent:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  // Message Bus Activity
  const logMessageBusActivity = async (
    fromFarmId: string,
    toFarmId: string,
    messageType: string,
    content: string
  ) => {
    try {
      return await tradingFarmDb.logMessageBusActivity(
        fromFarmId,
        toFarmId,
        messageType,
        content
      );
    } catch (err) {
      console.error('Failed to log message bus activity:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  const searchMessageBusActivity = async (query: string) => {
    try {
      return await tradingFarmDb.searchMessageBusActivity(query);
    } catch (err) {
      console.error('Failed to search message bus activity:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };
  
  // Return all functions and state
  return {
    isLoading,
    error,
    
    // Farm Management
    farms,
    createFarm,
    getFarm,
    updateFarm,
    deleteFarm,
    refreshFarms,
    
    // Strategy Knowledge Management
    addStrategyDocument,
    searchStrategyDocuments,
    
    // Agent Instructions
    addAgentInstruction,
    getRelevantInstructions,
    
    // ElizaOS Command Intent Detection
    addElizaCommand,
    detectCommandIntent,
    
    // Message Bus Activity
    logMessageBusActivity,
    searchMessageBusActivity,
  };
}
