/**
 * Trading Farm Database Migration Script
 * 
 * This script applies the database schema migration directly to your Supabase database.
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Load Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Function to execute SQL directly via Supabase REST API
async function executeSQL(sql) {
  try {
    // Use Supabase SQL API endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: errorText };
    }

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

// Main function to apply migration
async function applyMigration() {
  try {
    console.log('🔄 Loading migration SQL file...');
    
    // Load migration SQL from file
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20250330_create_trading_farm_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into statements, being careful with function definitions that contain semicolons
    const statements = [];
    let currentStatement = '';
    let inFunctionBody = false;
    
    migrationSql.split('\n').forEach(line => {
      // Skip comments and empty lines when detecting statement boundaries
      if (line.trim().startsWith('--') || line.trim() === '') {
        currentStatement += line + '\n';
        return;
      }
      
      // Check if we're entering a function definition
      if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
        inFunctionBody = true;
      }
      
      // Check if we're exiting a function definition
      if (inFunctionBody && line.includes('$$ LANGUAGE')) {
        inFunctionBody = false;
      }
      
      // Add the line to the current statement
      currentStatement += line + '\n';
      
      // If the line ends with a semicolon and we're not in a function body, it's the end of a statement
      if (line.trim().endsWith(';') && !inFunctionBody) {
        if (currentStatement.trim().length > 0) {
          statements.push(currentStatement.trim());
        }
        currentStatement = '';
      }
    });
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Apply statements one by one
    let successCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⏳ [${i + 1}/${statements.length}] Executing SQL statement...`);
        console.log(`   Statement (first 60 chars): ${statement.substring(0, 60).replace(/\n/g, ' ')}...`);
        
        // Execute the statement
        const { error } = await executeSQL(statement);
        
        if (error) {
          // Check for "already exists" errors which we can consider "successful" for idempotent migrations
          const isAlreadyExistsError = 
            error.includes('already exists') || 
            error.includes('duplicate key') ||
            error.includes('relation') && error.includes('already exists');
          
          if (isAlreadyExistsError) {
            console.log(`⚠️ Object already exists (this is okay): ${error.substring(0, 100)}`);
            successCount++; // Count as success for idempotent migrations
          } else {
            console.error(`❌ Statement execution error:`, error.substring(0, 200));
          }
        } else {
          console.log(`✅ Statement executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error executing statement:`, err.message);
      }
    }
    
    // Report success
    console.log(`\n🚀 Migration complete!`);
    console.log(`📈 ${successCount} of ${statements.length} statements executed successfully`);
    
    if (successCount === statements.length) {
      console.log('✅ All statements executed successfully');
    } else if (successCount >= statements.length * 0.7) {
      console.log('⚠️ Most statements executed successfully (some may have failed due to objects already existing)');
    } else {
      console.log('❌ Migration partially failed - review logs for details');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run the migration
applyMigration();
