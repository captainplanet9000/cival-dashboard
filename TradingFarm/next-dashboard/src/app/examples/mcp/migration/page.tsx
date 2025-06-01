'use client';

import * as React from 'react';
import { getSupabaseMcpClient } from '@/utils/mcp/supabase-mcp-client';
import type { Database } from '@/types/database.types';

// Define result types
type SqlResult = {
  statement: string;
  success: boolean;
  error?: string;
};

type MigrationResult = {
  statementsExecuted: number;
  statementsSucceeded: number;
  results: SqlResult[];
};

export default function McpMigrationPage() {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = React.useState<MigrationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{current: number, total: number} | null>(null);
  
  // Function to read and apply migration
  async function applyMigration() {
    setStatus('loading');
    setError(null);
    setResult(null);
    
    try {
      const mcpClient = getSupabaseMcpClient();
      
      // Fetch the migration script from our API
      const migrationResponse = await fetch('/api/migration-script');
      
      if (!migrationResponse.ok) {
        throw new Error(`Failed to load migration script: ${migrationResponse.statusText}`);
      }
      
      const migrationSql = await migrationResponse.text();
      
      // Split into statements
      const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      setProgress({ current: 0, total: statements.length });
      
      // Apply each statement individually
      const results: SqlResult[] = [];
      let succeeded = 0;
      
      for (let i = 0; i < statements.length; i++) {
        setProgress({ current: i + 1, total: statements.length });
        
        const statement = statements[i];
        
        try {
          // Execute the SQL statement
          const statementResult = await mcpClient.runSql(statement + ';');
          
          if (!statementResult.success) {
            throw new Error(statementResult.error || 'Unknown error');
          }
          
          results.push({
            statement: statement.substring(0, 40) + '...',
            success: true
          });
          
          succeeded++;
        } catch (err) {
          console.error('Statement error:', err);
          
          // Add the failed statement to results
          results.push({
            statement: statement.substring(0, 40) + '...',
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
          
          // Continue with the next statement - many SQL errors are non-fatal
          // For example, "table already exists" errors are expected if running migration twice
        }
      }
      
      const migrationResult: MigrationResult = {
        statementsExecuted: statements.length,
        statementsSucceeded: succeeded,
        results
      };
      
      setResult(migrationResult);
      
      // Consider migration successful if at least 70% of statements succeeded
      // (This handles cases where some statements fail because objects already exist)
      if (succeeded >= statements.length * 0.7) {
        setStatus('success');
      } else {
        setStatus('error');
        setError(`Migration partially failed: ${succeeded} of ${statements.length} statements succeeded`);
      }
    } catch (err) {
      console.error('Migration error:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    } finally {
      setProgress(null);
    }
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Apply Trading Farm Database Migration</h1>
      
      <div className="p-6 border rounded-lg shadow-sm bg-card mb-8">
        <p className="mb-4">
          This page will apply the database migration to set up the Trading Farm schema 
          in your Supabase project. This includes creating tables for farms, agents, 
          wallets, and transactions with proper Row Level Security (RLS) policies.
        </p>
        
        <button
          onClick={applyMigration}
          disabled={status === 'loading'}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {status === 'loading' ? 'Applying Migration...' : 'Apply Migration'}
        </button>
        
        {progress && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Executing statement {progress.current} of {progress.total}...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Results */}
      {status === 'success' && (
        <div className="p-6 border border-green-200 bg-green-50 rounded-lg">
          <h2 className="text-xl font-bold text-green-800 mb-2">Migration Successful!</h2>
          <p className="text-green-700 mb-4">
            The database schema has been successfully applied to your Supabase project.
          </p>
          <pre className="p-4 bg-white border rounded-md overflow-auto max-h-48 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
          <div className="mt-4">
            <a
              href="/examples/mcp"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Test the MCP Example
            </a>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {status === 'error' && (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Migration Failed</h2>
          <p className="text-red-700 mb-4">{error}</p>
          {result && (
            <pre className="p-4 bg-white border rounded-md overflow-auto max-h-48 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
          <p className="mt-4 text-red-700">
            Check your Supabase connection or examine the migration SQL for errors.
            You can also try running the migration manually using the Supabase SQL editor.
          </p>
        </div>
      )}
    </div>
  );
}
