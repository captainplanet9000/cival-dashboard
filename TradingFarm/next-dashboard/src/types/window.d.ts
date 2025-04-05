interface DevConfig {
  mockDataConfig: {
    enabled: boolean;
    forceMockMode: boolean;
  };
  supabaseConfig: {
    url: string;
    anonKey: string;
  };
  agentConfig: {
    defaultModel: string;
    allowedCapabilities: string[];
    maxAgentsPerFarm: number;
  };
}

declare global {
  interface Window {
    devConfig: DevConfig;
  }
}

export {};
