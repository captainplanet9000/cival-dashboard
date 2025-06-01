/**
 * Script to apply the agent_responses table fixes directly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Direct SQL approach to fix the agent_responses table
async function fixAgentResponsesTable() {
  console.log('🔧 Fixing agent_responses table schema...');
  
  try {
    // Execute each SQL operation individually
    const operations = [
      // Add context column if it doesn't exist
      `
      ALTER TABLE public.agent_responses 
      ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb NOT NULL;
      `,
      
      // Add metadata column if it doesn't exist
      `
      ALTER TABLE public.agent_responses 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      `,
      
      // Ensure status column exists
      `
      ALTER TABLE public.agent_responses 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;
      `,
      
      // Add timestamp columns if they don't exist
      `
      ALTER TABLE public.agent_responses 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
      `,
      
      `
      ALTER TABLE public.agent_responses 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
      `,
      
      // Create triggers for timestamps if they don't exist
      `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_responses_created_at') THEN
          CREATE TRIGGER set_agent_responses_created_at
          BEFORE INSERT ON public.agent_responses
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_created_at();
        END IF;
      END $$;
      `,
      
      `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_responses_updated_at') THEN
          CREATE TRIGGER set_agent_responses_updated_at
          BEFORE UPDATE ON public.agent_responses
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_updated_at();
        END IF;
      END $$;
      `
    ];
    
    for (let i = 0; i < operations.length; i++) {
      const sql = operations[i];
      console.log(`Executing operation ${i+1}/${operations.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
          // Direct query approach as fallback
          console.log('Exec function not available, using direct SQL instead:');
          
          const directSql = `
          -- Add context column if it doesn't exist
          ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb NOT NULL;
          
          -- Add metadata column if it doesn't exist  
          ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
          
          -- Ensure status column exists
          ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;
          
          -- Add timestamp columns if they don't exist
          ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
          ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
          `;
          
          console.log('Please execute this SQL in the Supabase SQL Editor:');
          console.log(directSql);
          
          return {
            success: false,
            message: "Please run the SQL manually in Supabase SQL Editor"
          };
        } else {
          console.error(`Error in operation ${i+1}:`, error);
        }
      }
    }
    
    // Verify the columns exist now
    const { data, error } = await supabase
      .from('agent_responses')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('context')) {
        return {
          success: false,
          message: "Column 'context' still not found. Please run the SQL manually."
        };
      } else {
        return {
          success: false,
          message: `Error verifying columns: ${error.message}`
        };
      }
    }
    
    return {
      success: true,
      message: "agent_responses table schema updated successfully!"
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error: ${error.message}`
    };
  }
}

async function main() {
  console.log('Starting schema fix process...');
  
  const result = await fixAgentResponsesTable();
  
  if (result.success) {
    console.log(`✅ Success: ${result.message}`);
    console.log('\nNow running complete ElizaOS workflow test again...');
    
    // Run the workflow test again
    const { spawn } = require('child_process');
    const test = spawn('node', ['scripts/complete-eliza-workflow.js'], { stdio: 'inherit' });
    
    test.on('close', (code) => {
      console.log(`Test script exited with code ${code}`);
    });
  } else {
    console.log(`❌ Failed: ${result.message}`);
    
    // Provide SQL to run manually
    console.log('\nPlease run this SQL in the Supabase SQL Editor:');
    console.log(`
-- Fix agent_responses table schema
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Create triggers for timestamps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_responses_created_at') THEN
    CREATE TRIGGER set_agent_responses_created_at
    BEFORE INSERT ON public.agent_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_responses_updated_at') THEN
    CREATE TRIGGER set_agent_responses_updated_at
    BEFORE UPDATE ON public.agent_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
    `);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
});
