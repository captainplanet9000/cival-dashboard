/**
 * Tools Service - Connects to FastAPI backend for natural language command processing
 * This service interfaces with the LangChain-powered trading tools
 */
import { createBrowserClient } from '@/utils/supabase/client';

export interface ToolInput {
  command: string;
  farm_id?: string;
  agent_id?: string;
  user_id?: string;
}

export interface ToolResponse {
  response: string;
  parsed_intent?: any;
  success: boolean;
  needs_confirmation: boolean;
  confirmation_data?: any;
  error?: string;
}

export interface ConfirmationData {
  action: string;
  details: {
    symbol?: string;
    direction?: string;
    size?: number;
    leverage?: number;
    stop_loss?: number;
    take_profit?: number;
    price?: number;
    [key: string]: any;
  };
}

class ToolsService {
  private apiUrl: string;
  
  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  /**
   * Execute a natural language command using backend LangChain tools
   */
  async executeCommand(input: ToolInput): Promise<ToolResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute command');
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing command:', error);
      return {
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        success: false,
        needs_confirmation: false,
      };
    }
  }

  /**
   * Confirm a command execution that was flagged for confirmation
   */
  async confirmCommand(commandId: string, confirmation: boolean): Promise<ToolResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/tools/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command_id: commandId,
          confirm: confirmation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to confirm command');
      }

      return await response.json();
    } catch (error) {
      console.error('Error confirming command:', error);
      return {
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        success: false,
        needs_confirmation: false,
      };
    }
  }

  /**
   * Get the current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

export const toolsService = new ToolsService();
