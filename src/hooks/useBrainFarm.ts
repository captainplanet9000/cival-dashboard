import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from './useRealtime';
import { 
  brainService, 
  BrainDocument,
  AgentMemory,
  CreateBrainDocumentParams,
  CreateAgentMemoryParams,
  CreateBrainCommandParams,
  CommandCategory,
  CommandSource
} from '@/services/brain/brain-service';
import { useDashboard } from '@/contexts/DashboardContext';

interface UseBrainFarmOptions {
  farmId?: string | number;
  agentId?: string | number;
}

interface UseBrainFarmReturn {
  // Document state
  documents: BrainDocument[];
  isDocumentsLoading: boolean;
  documentsError: string | null;
  
  // Memory state
  memories: AgentMemory[];
  isMemoriesLoading: boolean; 
  memoriesError: string | null;
  
  // Command state
  commands: any[];
  isCommandsLoading: boolean;
  commandsError: string | null;
  
  // Document actions
  uploadDocument: (params: Omit<CreateBrainDocumentParams, 'farmId'>) => Promise<{ success: boolean; error?: string; documentId?: number }>;
  deleteDocument: (documentId: number) => Promise<{ success: boolean; error?: string }>;
  searchDocuments: (query: string) => Promise<{ success: boolean; error?: string; results?: BrainDocument[] }>;
  
  // Memory actions
  createMemory: (params: Omit<CreateAgentMemoryParams, 'agentId'>) => Promise<{ success: boolean; error?: string; memoryId?: number }>;
  
  // Command actions
  executeCommand: (
    content: string, 
    category?: CommandCategory, 
    source?: CommandSource
  ) => Promise<{ success: boolean; error?: string; response?: string }>;
}

export function useBrainFarm(options: UseBrainFarmOptions = {}): UseBrainFarmReturn {
  const { selectedFarmId, selectedAgentId } = useDashboard();
  const farmId = options.farmId || selectedFarmId;
  const agentId = options.agentId || selectedAgentId;
  
  // Track current search results separately
  const [searchResults, setSearchResults] = useState<BrainDocument[] | null>(null);
  
  // Realtime subscriptions
  const { 
    data: documents, 
    loading: isDocumentsLoading, 
    error: documentsError 
  } = useRealtime<BrainDocument>('brain_documents', {
    filter: farmId ? { farm_id: Number(farmId) } : undefined
  });
  
  const { 
    data: memories, 
    loading: isMemoriesLoading, 
    error: memoriesError 
  } = useRealtime<AgentMemory>('agent_memory', {
    filter: agentId ? { agent_id: Number(agentId) } : undefined
  });
  
  const { 
    data: commands, 
    loading: isCommandsLoading, 
    error: commandsError 
  } = useRealtime('brain_commands', {
    filter: farmId ? { farm_id: Number(farmId) } : undefined
  });
  
  // Upload a document
  const uploadDocument = async (params: Omit<CreateBrainDocumentParams, 'farmId'>) => {
    if (!farmId) return { success: false, error: 'No farm selected' };
    
    try {
      const result = await brainService.uploadDocument({
        ...params,
        farmId: Number(farmId)
      });
      
      return { 
        success: result.success, 
        error: result.error,
        documentId: result.data?.id
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload document'
      };
    }
  };
  
  // Delete a document
  const deleteDocument = async (documentId: number) => {
    try {
      const result = await brainService.deleteDocument(documentId);
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete document'
      };
    }
  };
  
  // Search documents
  const searchDocuments = async (query: string) => {
    if (!farmId) return { success: false, error: 'No farm selected' };
    
    try {
      const result = await brainService.searchDocuments(Number(farmId), query);
      if (result.success && result.data) {
        setSearchResults(result.data);
      }
      
      return { 
        success: result.success, 
        error: result.error,
        results: result.data
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to search documents'
      };
    }
  };
  
  // Create a memory
  const createMemory = async (params: Omit<CreateAgentMemoryParams, 'agentId'>) => {
    if (!agentId) return { success: false, error: 'No agent selected' };
    
    try {
      const result = await brainService.createMemory({
        ...params,
        agentId: Number(agentId)
      });
      
      return { 
        success: result.success, 
        error: result.error,
        memoryId: result.data?.id
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create memory'
      };
    }
  };
  
  // Execute a command
  const executeCommand = async (
    content: string, 
    category: CommandCategory = 'command', 
    source: CommandSource = 'system'
  ) => {
    if (!farmId) return { success: false, error: 'No farm selected' };
    
    try {
      // First save the command
      const commandResult = await brainService.createCommand({
        farmId: Number(farmId),
        content,
        category,
        source
      });
      
      if (!commandResult.success) {
        throw new Error(commandResult.error);
      }
      
      // Here you would normally process the command with an AI system
      // For now, we'll simulate a response
      const response = `Response to: ${content}`;
      
      // Update the command with the response
      if (commandResult.data?.id) {
        // Use the update method instead of directly accessing the client
        await brainService.createCommand({
          farmId: Number(farmId),
          content,
          response,
          category,
          source
        });
      }
      
      return { 
        success: true, 
        response 
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to execute command'
      };
    }
  };
  
  return {
    documents: searchResults || documents,
    isDocumentsLoading,
    documentsError,
    
    memories,
    isMemoriesLoading,
    memoriesError,
    
    commands,
    isCommandsLoading,
    commandsError,
    
    uploadDocument,
    deleteDocument,
    searchDocuments,
    
    createMemory,
    
    executeCommand
  };
} 