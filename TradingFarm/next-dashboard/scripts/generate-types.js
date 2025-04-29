/**
 * Script to generate TypeScript types from Supabase schema
 * 
 * Usage: node scripts/generate-types.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure environment is loaded
require('dotenv').config({ path: '.env.local' });

async function generateTypes() {
  console.log('📦 Generating Supabase TypeScript types...');
  
  try {
    // Run the Supabase type generation command
    execSync('npx supabase gen types typescript --local > src/types/database.types.ts', {
      stdio: 'inherit'
    });
    
    // Read the generated file
    const typesPath = path.join(process.cwd(), 'src/types/database.types.ts');
    let typesContent = fs.readFileSync(typesPath, 'utf8');
    
    // Add custom interfaces for the new tables we created
    const customTypes = `
/**
 * Custom type definitions for Trading Farm
 * These supplement the auto-generated types
 */

// Health check status type
export type HealthStatus = 'healthy' | 'degraded' | 'offline';

// WebSocket connection status
export type WebSocketStatus = 'connected' | 'disconnected' | 'error';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// Dashboard layout by screen size
export interface DashboardLayout {
  version: number;
  layouts: {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
  };
}

// Layout item definition
export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  preferences: Record<string, any>;
}
`;
    
    // Append custom types to the generated file
    typesContent += customTypes;
    fs.writeFileSync(typesPath, typesContent);
    
    console.log('✅ Types generated and enhanced successfully!');
    console.log(`📄 Types file: ${typesPath}`);
  } catch (error) {
    console.error('❌ Error generating types:', error);
    process.exit(1);
  }
}

// Run the function
generateTypes();
