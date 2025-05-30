/**
 * Script to generate TypeScript types from a remote Supabase database
 * For use when local Supabase is not available
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🔍 Inspecting database schema...');
    
    // Fetch all tables
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .not('table_name', 'like', 'pg_%');
    
    if (tableError) {
      console.error('Error fetching tables:', tableError.message);
      return;
    }
    
    console.log(`Found ${tables.length} tables in the public schema`);
    
    // Generate TypeScript types
    let typeDefinitions = `/**
 * This file was auto-generated from the remote Supabase database.
 * Run "node scripts/generate-remote-types.js" to update it.
 * Generated on ${new Date().toISOString()}
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
`;
    
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`Processing table: ${tableName}`);
      
      // Fetch columns for this table
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, udt_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);
      
      if (columnError) {
        console.error(`Error fetching columns for ${tableName}:`, columnError.message);
        continue;
      }
      
      typeDefinitions += `      ${tableName}: {\n`;
      typeDefinitions += `        Row: {\n`;
      
      // Add columns
      for (const column of columns) {
        const typeName = mapToTypeScript(column.udt_name, column.data_type);
        const nullableSuffix = column.is_nullable === 'YES' ? ' | null' : '';
        
        typeDefinitions += `          ${column.column_name}: ${typeName}${nullableSuffix}\n`;
      }
      
      typeDefinitions += `        }\n`;
      typeDefinitions += `        Insert: {\n`;
      
      // Add insert columns (same as row but all optional)
      for (const column of columns) {
        const typeName = mapToTypeScript(column.udt_name, column.data_type);
        const nullableSuffix = column.is_nullable === 'YES' ? ' | null' : '';
        
        typeDefinitions += `          ${column.column_name}?: ${typeName}${nullableSuffix}\n`;
      }
      
      typeDefinitions += `        }\n`;
      typeDefinitions += `        Update: {\n`;
      
      // Add update columns (same as insert)
      for (const column of columns) {
        const typeName = mapToTypeScript(column.udt_name, column.data_type);
        const nullableSuffix = column.is_nullable === 'YES' ? ' | null' : '';
        
        typeDefinitions += `          ${column.column_name}?: ${typeName}${nullableSuffix}\n`;
      }
      
      typeDefinitions += `        }\n`;
      typeDefinitions += `        Relationships: []\n`;
      typeDefinitions += `      }\n`;
    }
    
    typeDefinitions += `    }\n`;
    typeDefinitions += `    Views: {}\n`;
    typeDefinitions += `    Functions: {}\n`;
    typeDefinitions += `    Enums: {}\n`;
    typeDefinitions += `    CompositeTypes: {}\n`;
    typeDefinitions += `  }\n`;
    typeDefinitions += `}\n`;
    
    // Write to file
    const outputPath = path.resolve('src/types/database.types.ts');
    fs.writeFileSync(outputPath, typeDefinitions);
    
    console.log(`✅ TypeScript definitions written to ${outputPath}`);
  } catch (error) {
    console.error('Error generating types:', error.message);
  }
}

function mapToTypeScript(postgresType, fullType) {
  // Map PostgreSQL types to TypeScript types
  const typeMap = {
    'int2': 'number',
    'int4': 'number',
    'int8': 'number',
    'float4': 'number',
    'float8': 'number',
    'numeric': 'number',
    'bool': 'boolean',
    'text': 'string',
    'varchar': 'string',
    'char': 'string',
    'date': 'string',
    'timestamp': 'string',
    'timestamptz': 'string',
    'uuid': 'string',
    'jsonb': 'Json',
    'json': 'Json',
    '_text': 'string[]',
    '_int4': 'number[]',
    '_int8': 'number[]',
    '_float4': 'number[]',
    '_float8': 'number[]',
  };
  
  if (fullType.includes('ARRAY')) {
    return `${mapToTypeScript(postgresType.replace('_', ''), fullType.replace('ARRAY', ''))}[]`;
  }
  
  return typeMap[postgresType] || 'unknown';
}

main().catch(error => {
  console.error('Fatal error:', error);
});
