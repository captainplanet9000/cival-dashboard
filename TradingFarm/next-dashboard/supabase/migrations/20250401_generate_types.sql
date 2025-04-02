-- ElizaOS Types Generator SQL Script
-- This script generates TypeScript type definitions that you can copy-paste into your project

-- Let's use a simpler approach that doesn't rely on complex array handling

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '// TypeScript type definitions for ElizaOS integration';
  RAISE NOTICE '// Generated from database schema: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE '// Copy everything below this line into src/types/database.types.ts';
  RAISE NOTICE '// --------------------------------------------------------';
  RAISE NOTICE '';
  
  RAISE NOTICE 'export type Database = {';
  RAISE NOTICE '  public: {';
  RAISE NOTICE '    Tables: {';
  
  -- Agent Commands Table
  RAISE NOTICE '      agent_commands: {';
  RAISE NOTICE '        Row: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'agent_commands'
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %: %;', r.column_name, 
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END || CASE WHEN r.is_nullable = 'YES' THEN ' | null' ELSE '' END;
  END LOOP;
  RAISE NOTICE '        };';
  
  RAISE NOTICE '        Insert: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'agent_commands'
    AND c.column_name NOT IN ('id', 'created_at', 'updated_at')
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %: %;', 
      CASE WHEN r.is_nullable = 'YES' THEN r.column_name || '?' ELSE r.column_name END,
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END;
  END LOOP;
  RAISE NOTICE '        };';
  
  RAISE NOTICE '        Update: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'agent_commands'
    AND c.column_name NOT IN ('id', 'created_at')
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %?: %;', r.column_name,
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END;
  END LOOP;
  RAISE NOTICE '        };';
  RAISE NOTICE '      };';
  
  -- Agent Responses Table
  RAISE NOTICE '      agent_responses: {';
  RAISE NOTICE '        Row: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'agent_responses'
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %: %;', r.column_name, 
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END || CASE WHEN r.is_nullable = 'YES' THEN ' | null' ELSE '' END;
  END LOOP;
  RAISE NOTICE '        };';
  
  RAISE NOTICE '        Insert: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'agent_responses'
    AND c.column_name NOT IN ('id', 'created_at', 'updated_at')
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %: %;', 
      CASE WHEN r.is_nullable = 'YES' THEN r.column_name || '?' ELSE r.column_name END,
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END;
  END LOOP;
  RAISE NOTICE '        };';
  
  RAISE NOTICE '        Update: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'agent_responses'
    AND c.column_name NOT IN ('id', 'created_at')
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %?: %;', r.column_name,
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END;
  END LOOP;
  RAISE NOTICE '        };';
  RAISE NOTICE '      };';
  
  -- Knowledge Base Table
  RAISE NOTICE '      knowledge_base: {';
  RAISE NOTICE '        Row: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'knowledge_base'
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %: %;', r.column_name, 
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END || CASE WHEN r.is_nullable = 'YES' THEN ' | null' ELSE '' END;
  END LOOP;
  RAISE NOTICE '        };';
  
  RAISE NOTICE '        Insert: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'knowledge_base'
    AND c.column_name NOT IN ('id', 'created_at', 'updated_at')
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %: %;', 
      CASE WHEN r.is_nullable = 'YES' THEN r.column_name || '?' ELSE r.column_name END,
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END;
  END LOOP;
  RAISE NOTICE '        };';
  
  RAISE NOTICE '        Update: {';
  FOR r IN (
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = 'public' AND c.table_name = 'knowledge_base'
    AND c.column_name NOT IN ('id', 'created_at')
    ORDER BY c.ordinal_position
  ) LOOP
    RAISE NOTICE '          %?: %;', r.column_name,
      CASE 
        WHEN r.data_type LIKE 'char%' OR r.data_type LIKE 'varchar%' OR r.data_type = 'text' OR r.data_type = 'uuid' THEN 'string'
        WHEN r.data_type LIKE 'int%' OR r.data_type = 'numeric' OR r.data_type = 'decimal' OR r.data_type = 'real' OR r.data_type = 'double precision' OR r.data_type = 'bigint' THEN 'number'
        WHEN r.data_type = 'boolean' THEN 'boolean'
        WHEN r.data_type = 'date' OR r.data_type LIKE 'timestamp%' THEN 'string'
        WHEN r.data_type = 'jsonb' OR r.data_type = 'json' THEN 'Record<string, any>'
        WHEN r.data_type LIKE '%[]' THEN 'any[]'
        ELSE 'any'
      END;
  END LOOP;
  RAISE NOTICE '        };';
  RAISE NOTICE '      };';
  
  -- Orders, Agents, and Farms tables - add basic references
  RAISE NOTICE '      orders: { Row: {}; Insert: {}; Update: {}; };';
  RAISE NOTICE '      agents: { Row: {}; Insert: {}; Update: {}; };';
  RAISE NOTICE '      farms: { Row: {}; Insert: {}; Update: {}; };';
  
  RAISE NOTICE '    };';
  RAISE NOTICE '  };';
  RAISE NOTICE '};';
  
  -- Generate helper types
  RAISE NOTICE '';
  RAISE NOTICE '// Helper Types';
  RAISE NOTICE 'export type AgentCommand = Database["public"]["Tables"]["agent_commands"]["Row"];';
  RAISE NOTICE 'export type AgentCommandInsert = Database["public"]["Tables"]["agent_commands"]["Insert"];';
  RAISE NOTICE 'export type AgentCommandUpdate = Database["public"]["Tables"]["agent_commands"]["Update"];';
  RAISE NOTICE '';
  RAISE NOTICE 'export type AgentResponse = Database["public"]["Tables"]["agent_responses"]["Row"];';
  RAISE NOTICE 'export type AgentResponseInsert = Database["public"]["Tables"]["agent_responses"]["Insert"];';
  RAISE NOTICE 'export type AgentResponseUpdate = Database["public"]["Tables"]["agent_responses"]["Update"];';
  RAISE NOTICE '';
  RAISE NOTICE 'export type KnowledgeBase = Database["public"]["Tables"]["knowledge_base"]["Row"];';
  RAISE NOTICE 'export type KnowledgeBaseInsert = Database["public"]["Tables"]["knowledge_base"]["Insert"];';
  RAISE NOTICE 'export type KnowledgeBaseUpdate = Database["public"]["Tables"]["knowledge_base"]["Update"];';
  RAISE NOTICE '';
  RAISE NOTICE '// Enum Types';
  RAISE NOTICE 'export type CommandType = "execute_order" | "analyze_market" | "manage_risk" | "custom";';
  RAISE NOTICE 'export type CommandStatus = "pending" | "processing" | "completed" | "failed";';
  RAISE NOTICE 'export type ResponseType = "order_execution" | "market_analysis" | "risk_assessment" | "custom";';
  RAISE NOTICE 'export type ResponseStatus = "pending" | "completed" | "failed";';
END $$;
