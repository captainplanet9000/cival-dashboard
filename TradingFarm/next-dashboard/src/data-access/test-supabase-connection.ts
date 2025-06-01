/**
 * Test Supabase Connection
 * 
 * This script tests and fixes the Supabase connection for the Trading Farm dashboard.
 * Run with: npx ts-node src/data-access/test-supabase-connection.ts
 */

import { fixSupabaseConnection, testSupabaseConnection } from './supabase-connection-fix';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

// Service role key (same as used in MCP config)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Anon key (used for public client access)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  console.log('📊 Testing with service role key first...');
  
  try {
    // First try with the service role key
    const serviceResult = await testSupabaseConnection(SUPABASE_SERVICE_KEY, {
      timeout: 15000,
      retries: 2,
      usePooler: true // Try with pooler enabled by default
    });
    
    if (serviceResult.success) {
      console.log('✅ SERVICE KEY CONNECTION SUCCESSFUL');
      
      // Test a simple query
      if (serviceResult.client) {
        console.log('🔍 Running a test query with service role...');
        const { data, error } = await serviceResult.client.from('farms').select('*').limit(2);
        
        if (error) {
          console.error('❌ Service role query failed:', error.message);
        } else {
          console.log('✅ Service role query successful!');
          console.log('📋 Sample data:', JSON.stringify(data, null, 2));
        }
      }
    } else {
      console.error('❌ SERVICE KEY CONNECTION FAILED:', serviceResult.message);
      
      // Fall back to anon key
      console.log('🔄 Falling back to anon key...');
      const anonResult = await testSupabaseConnection(SUPABASE_ANON_KEY, {
        timeout: 15000,
        retries: 2, 
        usePooler: true
      });
      
      if (anonResult.success) {
        console.log('✅ ANON KEY CONNECTION SUCCESSFUL');
        if (anonResult.client) {
          console.log('🔍 Running a test query with anon role...');
          const { data, error } = await anonResult.client.from('farms').select('*').limit(2);
          
          if (error) {
            console.error('❌ Anon role query failed:', error.message);
          } else {
            console.log('✅ Anon role query successful!');
            console.log('📋 Sample data:', JSON.stringify(data, null, 2));
          }
        }
      } else {
        console.error('❌ BOTH KEYS FAILED TO CONNECT');
        console.error('📌 Service role error:', serviceResult.message);
        console.error('📌 Anon role error:', anonResult.message);
        
        // Try the fix utility as a last resort
        console.log('🔧 Attempting connection fix...');
        const fixResult = await fixSupabaseConnection(SUPABASE_SERVICE_KEY);
        
        if (fixResult.success) {
          console.log('✅ CONNECTION FIX SUCCESSFUL:', fixResult.message);
        } else {
          console.error('❌ CONNECTION FIX FAILED:', fixResult.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ UNCAUGHT ERROR:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  }
  
  // Additional diagnostics
  console.log('\n📊 CONNECTION DIAGNOSTICS:');
  console.log('- Supabase URL: https://bgvlzvswzpfoywfxehis.supabase.co');
  console.log('- Pooler URL: https://bgvlzvswzpfoywfxehis.pooler.supabase.co');
  
  // Check DNS resolution
  try {
    console.log('🔍 Checking DNS resolution...');
    const exec = promisify(execCallback);
    const { stdout, stderr } = await exec('nslookup bgvlzvswzpfoywfxehis.supabase.co');
    
    if (stderr) {
      console.error('❌ DNS lookup failed:', stderr);
      return;
    }
    console.log('✅ DNS resolution successful');
    console.log(stdout);
  } catch (e) {
    console.log('❌ DNS check error:', e instanceof Error ? e.message : String(e));
  }
}

// Run the test
testConnection().catch(err => {
  console.error('💥 FATAL ERROR:', err);
  process.exit(1);
});
