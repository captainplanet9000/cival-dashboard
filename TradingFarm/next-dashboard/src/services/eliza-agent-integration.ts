/**
 * ElizaOS Agent Integration Service
 * 
 * Connects the agent system to ElizaOS capabilities
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { AgentConfiguration, Agent, ExtendedAgent, ApiResponse } from './agent-service';
import { Database } from '@/types/database.types';

// Define interfaces that match the database schema
export interface AgentInstructionSet {
  id?: string;
  agent_id: number;
  instructions: string;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface AgentCommandHistory {
  id?: string;
  agent_id: number;
  command: string;
  response: string;
  executed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgentMessage {
  id?: string;
  agent_id: number;
  content: string;
  type: string;
  source: string;
  read: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AgentKnowledgeEntry {
  id?: string;
  agent_id: number;
  topic: string;
  content: string;
  source: string;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Helper function to check if a table exists in the database
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc('check_table_exists', {
      table_name: tableName
    });

    if (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      
      // Attempt to create the function if it doesn't exist
      const { data: createFnData, error: createFnError } = await supabase.rpc('create_check_table_exists_function');
      
      if (createFnError) {
        console.error('Error creating check_table_exists function:', createFnError);
        return false;
      }

      // Try again after creating the function
      const { data: retryData, error: retryError } = await supabase.rpc('check_table_exists', {
        table_name: tableName
      });

      if (retryError) {
        console.error(`Error on retry checking if table ${tableName} exists:`, retryError);
        return false;
      }

      return !!retryData;
    }

    return !!data;
  } catch (error) {
    console.error(`Unexpected error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Get the latest instructions for an agent
export async function getAgentInstructions(agentId: number): Promise<AgentInstructionSet | null> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_instructions');
    if (!tableExists) {
      console.warn('agent_instructions table does not exist yet');
      return null;
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_instructions')
      .select('*')
      .eq('agent_id', agentId)
      .order('version', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting agent instructions:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as AgentInstructionSet;
  } catch (error) {
    console.error('Unexpected error getting agent instructions:', error);
    return null;
  }
}

// Save instructions for an agent
export async function saveAgentInstructions(instructionSet: AgentInstructionSet): Promise<AgentInstructionSet | null> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_instructions');
    if (!tableExists) {
      console.warn('agent_instructions table does not exist yet');
      return null;
    }

    const supabase = await createServerClient();
    
    // Get the current version
    const { data: currentData, error: currentError } = await supabase
      .from('agent_instructions')
      .select('version')
      .eq('agent_id', instructionSet.agent_id)
      .order('version', { ascending: false })
      .limit(1);

    if (currentError) {
      console.error('Error getting current instructions version:', currentError);
      return null;
    }

    // Set the new version
    const newVersion = currentData && currentData.length > 0 ? (currentData[0].version + 1) : 1;
    
    // Insert new instruction set
    const { data, error } = await supabase
      .from('agent_instructions')
      .insert({
        agent_id: instructionSet.agent_id,
        instructions: instructionSet.instructions,
        version: newVersion
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving agent instructions:', error);
      return null;
    }

    return data as AgentInstructionSet;
  } catch (error) {
    console.error('Unexpected error saving agent instructions:', error);
    return null;
  }
}

// Get command history for an agent
export async function getAgentCommandHistory(agentId: number): Promise<AgentCommandHistory[]> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_command_history');
    if (!tableExists) {
      console.warn('agent_command_history table does not exist yet');
      return [];
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_command_history')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting agent command history:', error);
      return [];
    }

    return data as AgentCommandHistory[];
  } catch (error) {
    console.error('Unexpected error getting agent command history:', error);
    return [];
  }
}

// Save a command and its response to the history
export async function saveAgentCommand(command: AgentCommandHistory): Promise<AgentCommandHistory | null> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_command_history');
    if (!tableExists) {
      console.warn('agent_command_history table does not exist yet');
      return null;
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_command_history')
      .insert({
        agent_id: command.agent_id,
        command: command.command,
        response: command.response,
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving agent command:', error);
      return null;
    }

    return data as AgentCommandHistory;
  } catch (error) {
    console.error('Unexpected error saving agent command:', error);
    return null;
  }
}

// Get messages for an agent
export async function getAgentMessages(agentId: number): Promise<AgentMessage[]> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_messages');
    if (!tableExists) {
      console.warn('agent_messages table does not exist yet');
      return [];
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting agent messages:', error);
      return [];
    }

    return data as AgentMessage[];
  } catch (error) {
    console.error('Unexpected error getting agent messages:', error);
    return [];
  }
}

// Save a message for an agent
export async function saveAgentMessage(message: AgentMessage): Promise<AgentMessage | null> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_messages');
    if (!tableExists) {
      console.warn('agent_messages table does not exist yet');
      return null;
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_messages')
      .insert({
        agent_id: message.agent_id,
        content: message.content,
        type: message.type,
        source: message.source,
        read: message.read || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving agent message:', error);
      return null;
    }

    return data as AgentMessage;
  } catch (error) {
    console.error('Unexpected error saving agent message:', error);
    return null;
  }
}

// Get knowledge entries for an agent
export async function getAgentKnowledge(agentId: number): Promise<AgentKnowledgeEntry[]> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_knowledge');
    if (!tableExists) {
      console.warn('agent_knowledge table does not exist yet');
      return [];
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_knowledge')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting agent knowledge:', error);
      return [];
    }

    return data as AgentKnowledgeEntry[];
  } catch (error) {
    console.error('Unexpected error getting agent knowledge:', error);
    return [];
  }
}

// Save a knowledge entry for an agent
export async function saveAgentKnowledge(knowledgeEntry: AgentKnowledgeEntry): Promise<AgentKnowledgeEntry | null> {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('agent_knowledge');
    if (!tableExists) {
      console.warn('agent_knowledge table does not exist yet');
      return null;
    }
    
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_knowledge')
      .insert({
        agent_id: knowledgeEntry.agent_id,
        topic: knowledgeEntry.topic,
        content: knowledgeEntry.content,
        source: knowledgeEntry.source,
        verified: knowledgeEntry.verified || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving agent knowledge entry:', error);
      return null;
    }

    return data as AgentKnowledgeEntry;
  } catch (error) {
    console.error('Unexpected error saving agent knowledge entry:', error);
    return null;
  }
}
