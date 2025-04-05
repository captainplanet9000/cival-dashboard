/**
 * Development Configuration
 * This file is not in .gitignore and can be freely edited during development
 */

// Mock data configuration
const mockDataConfig = {
  enabled: true,          // Set to true to enable mock data
  forceMockMode: true,    // Force mock mode even when Supabase is available
};

// Supabase connection
const supabaseConfig = {
  url: "https://bgvlzvswzpfoywfxehis.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA",
};

// Agent configuration
const agentConfig = {
  // Add custom agent settings here
  defaultModel: "gpt-4",
  allowedCapabilities: [
    "market_analysis",
    "trade_execution",
    "risk_management",
    "sentiment_analysis",
    "report_generation"
  ],
  maxAgentsPerFarm: 5
};

module.exports = {
  mockDataConfig,
  supabaseConfig,
  agentConfig
};
