// ElizaOS interaction types
// Define the Database type inline since database.types.ts appears to be empty
export type Database = {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
    CompositeTypes: Record<string, any>;
  };
};

// Define additional tables extending the Database type
export type ExtendedDatabase = Database & {
  public: {
    Tables: {
      elizaos_interactions: {
        Row: {
          id: string;
          farm_id: string;
          command: string;
          response: string;
          category: string;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          command: string;
          response: string;
          category: string;
          source: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          command?: string;
          response?: string;
          category?: string;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "elizaos_interactions_farm_id_fkey";
            columns: ["farm_id"];
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
    } & Database['public']['Tables'];
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
    CompositeTypes: Database['public']['CompositeTypes'];
  };
};

// Message types for the command console
export type MessageCategory = 
  | 'command'      // User input/commands
  | 'query'        // Information requests
  | 'analysis'     // AI analysis of data
  | 'alert'        // System alerts/notifications
  | 'response'     // AI responses
  | 'knowledge'    // Knowledge base information
  | 'system';      // System messages

export type MessageSource = 
  | 'knowledge-base' // Information from stored knowledge
  | 'market-data'    // Market information
  | 'strategy'       // Trading strategy information
  | 'system'         // General system information
  | 'user';          // User-generated content

export interface ConsoleMessage {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  category: MessageCategory;
  source: MessageSource;
  sender?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  metadata?: any;
  references?: {
    title: string;
    url: string;
  }[];
}

export interface ElizaCommandResponse {
  id: string;
  command: string;
  response: string;
  timestamp: string;
  category: MessageCategory;
  source: MessageSource;
  metadata?: any;
}
