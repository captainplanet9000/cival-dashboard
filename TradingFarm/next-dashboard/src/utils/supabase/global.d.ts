/**
 * Global type declarations
 */

interface MockAgentStore {
  agents: any[];
  elizaAgents: any[];
}

declare global {
  interface Window {
    mockAgentStore: MockAgentStore;
  }
}
