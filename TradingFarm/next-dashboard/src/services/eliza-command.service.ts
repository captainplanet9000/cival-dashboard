import { createServerClient } from "@/utils/supabase/server";

/**
 * Interface for ElizaCommand objects (our application type)
 */
export interface ElizaCommand {
  id: string;
  command: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result: any;
  farm_id: string;
  user_id: string;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface reflecting the actual database schema
 */
export interface DbElizaCommand {
  id: string;
  command_text: string;
  status: string | null;
  farm_id: string;
  agent_id: string;
  user_id?: string; // Add user_id as optional since it might not exist in all db records
  response_text: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  execution_time_ms: number | null;
}

/**
 * Interface for ElizaCommandEvent objects
 */
export interface ElizaCommandEvent {
  id: string;
  command_id: string;
  event_type: 'created' | 'started' | 'completed' | 'failed';
  details: Record<string, any>;
  created_at: string;
}

export class ElizaCommandService {
  async getCommands(userId: string, limit: number = 10): Promise<ElizaCommand[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('elizaos_commands')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching Eliza commands:', error);
      return [];
    }
    
    if (!data) return [];
    
    // Map database records to our interface
    return data.map(item => ({
      id: item.id,
      command: item.command_text || '',
      status: (item.status || 'pending') as 'pending' | 'executing' | 'completed' | 'failed',
      result: item.response_text ? JSON.parse(item.response_text) : null,
      farm_id: item.farm_id,
      user_id: userId, // Use the provided userId since we filtered by it
      agent_id: item.agent_id || undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
      error: item.status === 'failed' ? item.response_text || 'Unknown error' : undefined,
      metadata: item.metadata ? item.metadata as Record<string, any> : undefined
    }));
  }

  async getCommandById(commandId: string): Promise<ElizaCommand | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('elizaos_commands')
      .select('*')
      .eq('id', commandId)
      .single();
    
    if (error) {
      console.error(`Error fetching command ${commandId}:`, error);
      return null;
    }
    
    if (!data) return null;
    
    // Type assertion to access properties that might not be directly defined in TypeScript types
    const dbCommand = data as any;
    
    // Map database record to our interface
    return {
      id: dbCommand.id,
      command: dbCommand.command_text || '',
      status: (dbCommand.status || 'pending') as 'pending' | 'executing' | 'completed' | 'failed',
      result: dbCommand.response_text ? JSON.parse(dbCommand.response_text) : null,
      farm_id: dbCommand.farm_id,
      user_id: dbCommand.user_id || '', // Handle case where user_id might not exist in DB
      agent_id: dbCommand.agent_id || undefined,
      created_at: dbCommand.created_at,
      updated_at: dbCommand.updated_at,
      error: dbCommand.status === 'failed' ? dbCommand.response_text || 'Unknown error' : undefined,
      metadata: dbCommand.metadata ? dbCommand.metadata as Record<string, any> : undefined
    };
  }

  async createCommand(command: Omit<ElizaCommand, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<ElizaCommand | null> {
    const supabase = await createServerClient();
    
    // Map our interface to the database schema
    const dbCommand = {
      command_text: command.command,
      response_text: command.result ? JSON.stringify(command.result) : null,
      farm_id: command.farm_id,
      user_id: command.user_id,
      agent_id: command.agent_id || '', // Ensure agent_id is never undefined
      metadata: command.metadata || {},
      status: 'pending'
    };
    
    const { data, error } = await supabase
      .from('elizaos_commands')
      .insert(dbCommand)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating Eliza command:', error);
      return null;
    }
    
    if (!data) return null;
    
    // Map database record back to our interface
    return {
      id: data.id,
      command: command.command,
      status: 'pending',
      result: command.result,
      farm_id: command.farm_id,
      user_id: command.user_id,
      agent_id: command.agent_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: command.metadata
    };
  }

  async updateCommandStatus(id: string, status: ElizaCommand['status'], result?: any, error?: string): Promise<ElizaCommand | null> {
    const supabase = await createServerClient();
    
    // First get the current command to ensure we have all fields
    const currentCommand = await this.getCommandById(id);
    if (!currentCommand) {
      console.error(`Command ${id} not found for updating status`);
      return null;
    }
    
    // Map our interface updates to the database schema
    const updates: Record<string, any> = { 
      status: status 
    };
    
    if (result !== undefined) {
      updates.response_text = JSON.stringify(result);
    }
    
    if (error !== undefined && status === 'failed') {
      // Store error in response_text for failed commands
      updates.response_text = error;
    }
    
    const { data, error: updateError } = await supabase
      .from('elizaos_commands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error(`Error updating command ${id}:`, updateError);
      return null;
    }
    
    if (!data) return null;
    
    // Return the updated command with our interface structure - keep all fields from the current command
    // and only update the fields that have changed
    return {
      ...currentCommand,
      status,
      result: result !== undefined ? result : currentCommand.result,
      error: error !== undefined ? error : currentCommand.error,
      updated_at: data.updated_at
    };
  }

  async executeCommand(command: string, farmId: string, userId: string, metadata?: Record<string, any>): Promise<ElizaCommand | null> {
    // Create a new command
    const newCommand = await this.createCommand({
      command,
      result: null,
      farm_id: farmId,
      user_id: userId,
      metadata
    });
    
    if (!newCommand) {
      return null;
    }
    
    try {
      // In a real implementation, this would process the command
      // For now, we'll just simulate a successful execution
      const result = {
        success: true,
        message: `Executed command: ${command}`,
        timestamp: new Date().toISOString()
      };
      
      // Update the command with the result
      return await this.updateCommandStatus(newCommand.id, 'completed', result);
    } catch (error: any) {
      // If an error occurs, update the command with the error
      return await this.updateCommandStatus(newCommand.id, 'failed', null, error.message || 'Unknown error');
    }
  }

  async deleteCommand(id: string): Promise<boolean> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('elizaos_commands')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting command ${id}:`, error);
      return false;
    }
    
    return true;
  }
}

// Export a singleton instance
export const elizaCommandService = new ElizaCommandService();
