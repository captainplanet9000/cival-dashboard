import { createServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * Service for processing Eliza terminal commands
 */
export class ElizaCommandService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase?: SupabaseClient<Database>) {
    if (supabase) {
      this.supabase = supabase;
    } else {
      // Initialize in async method to avoid TypeScript Promise<SupabaseClient> vs SupabaseClient issue
      this.supabase = {} as SupabaseClient<Database>;
      this.initSupabase();
    }
  }

  /**
   * Execute a command in the Eliza terminal
   * @param command Command to execute
   * @param userId User ID
   */
  async executeCommand(command: string, userId: string): Promise<{ output: string; success: boolean }> {
    try {
      // Store command in history
      await this.storeCommandHistory(command, userId);

      // Process basic commands
      if (command.startsWith('help')) {
        return {
          output: this.getHelpText(),
          success: true
        };
      }

      // Handle market data commands
      if (command.match(/^(market|chart|price)\s+[A-Za-z]+\/[A-Za-z]+$/i)) {
        const symbol = command.split(/\s+/)[1].toUpperCase();
        return {
          output: `Loading market data for ${symbol}...`,
          success: true
        };
      }

      // Default response for unknown commands
      return {
        output: `Command not recognized: ${command}. Type 'help' for available commands.`,
        success: false
      };
    } catch (error) {
      console.error('Error executing Eliza command:', error);
      return {
        output: 'An error occurred while executing the command.',
        success: false
      };
    }
  }

  /**
   * Initialize supabase client asynchronously
   */
  private async initSupabase(): Promise<void> {
    try {
      this.supabase = await createServerClient();
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }

  /**
   * Store command in user history
   * @param command Command text
   * @param userId User ID
   */
  private async storeCommandHistory(command: string, userId: string): Promise<void> {
    try {
      // Store in elizaos_commands table with correct field names
      await this.supabase.from('elizaos_commands').insert({
        agent_id: userId, // Using the userId as agent_id for now
        command_text: command,
        created_at: new Date().toISOString(),
        status: 'processed',
        farm_id: 'default', // Required field, using 'default' placeholder
        execution_time_ms: 0 // Set to 0 for simplicity
      });
    } catch (error) {
      console.error('Error storing command history:', error);
    }
  }

  /**
   * Get help text for available commands
   */
  private getHelpText(): string {
    return `
Available Commands:
-------------------
help                    Show this help message
market [SYMBOL]         Show market data for a symbol (e.g. market BTC/USD)
chart [SYMBOL]          Display a chart for the specified symbol
price [SYMBOL]          Show current price for a symbol

For more information, visit the documentation.
    `;
  }
}
