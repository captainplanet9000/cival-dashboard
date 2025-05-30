/**
 * Temporary Environment Setup for Testing
 * 
 * This script sets environment variables for Supabase connectivity
 * before running the test workflow.
 */

// Set environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

// Import and run the workflow test
require('./test-elizaos-workflow.js');
