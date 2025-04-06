/**
 * Mock API Services
 * Provides mock data for API service integrations
 */

import { ModelDetails, OpenRouterProvider } from '@/services/api/openrouter-client';

// Define API service provider types
export type ApiServiceType = 'llm' | 'tts' | 'stt' | 'data' | 'vision' | 'embedding';

// Mock API service providers for LLM integration
export const mockApiServiceProviders = [
  {
    id: '1',
    name: 'OpenRouter',
    service_type: 'llm',
    description: 'Unified API for accessing multiple language models',
    icon_url: '/logos/openrouter.png',
    config_schema: {
      properties: {
        api_key: { type: 'string', title: 'API Key' },
        default_model: { type: 'string', title: 'Default Model' }
      },
      required: ['api_key']
    },
    rate_limit_info: { requests_per_minute: 60 },
    is_enabled: true,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Google Gemini',
    service_type: 'llm',
    description: 'Google\'s multimodal AI model',
    icon_url: '/logos/gemini.png',
    config_schema: {
      properties: {
        api_key: { type: 'string', title: 'API Key' }
      },
      required: ['api_key']
    },
    rate_limit_info: { requests_per_minute: 30 },
    is_enabled: true,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'MarketStack',
    service_type: 'data',
    description: 'Real-time and historical market data API',
    icon_url: '/logos/marketstack.png',
    config_schema: {
      properties: {
        api_key: { type: 'string', title: 'API Key' }
      },
      required: ['api_key']
    },
    rate_limit_info: { requests_per_day: 1000 },
    is_enabled: true,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Eleven Labs',
    service_type: 'tts',
    description: 'Advanced voice synthesis API',
    icon_url: '/logos/elevenlabs.png',
    config_schema: {
      properties: {
        api_key: { type: 'string', title: 'API Key' },
        voice_id: { type: 'string', title: 'Default Voice ID' }
      },
      required: ['api_key']
    },
    rate_limit_info: { characters_per_month: 10000 },
    is_enabled: true,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  }
];

// Mock user API configurations
export const mockUserApiConfigurations = [
  {
    id: '1',
    user_id: 'user-1',
    api_service_id: '1',
    config: {
      api_key: 'sk-or-xxxxxxxxxxxx',
      default_model: 'anthropic/claude-3-sonnet'
    },
    is_default: true,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  },
  {
    id: '2',
    user_id: 'user-1',
    api_service_id: '2',
    config: {
      api_key: 'aig-xxxxxxxxxxxx'
    },
    is_default: true,
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  }
];

// Mock agent API service assignments
export const mockAgentApiServices = [
  {
    id: '1',
    agent_id: 'agent-1',
    api_service_id: '1',
    config: {
      model: 'anthropic/claude-3-sonnet',
      temperature: 0.7,
      max_tokens: 1000
    },
    created_at: '2025-04-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  }
];

// Helper functions
export function getApiServiceProviders() {
  return mockApiServiceProviders;
}

export function getUserApiConfigurations(userId: string) {
  return mockUserApiConfigurations.filter(config => config.user_id === userId);
}

export function getAgentApiServices(agentId: string) {
  return mockAgentApiServices.filter(service => service.agent_id === agentId);
}

// Mock OpenRouter models
export const mockOpenRouterModels: ModelDetails[] = [
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "anthropic" as OpenRouterProvider,
    pricing: {
      prompt: 15.00,
      completion: 75.00
    },
    context_length: 200000,
    capabilities: ["vision", "function-calling", "streaming"]
  },
  {
    id: "anthropic/claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "anthropic" as OpenRouterProvider,
    pricing: {
      prompt: 3.00,
      completion: 15.00
    },
    context_length: 200000,
    capabilities: ["vision", "function-calling", "streaming"]
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai" as OpenRouterProvider,
    pricing: {
      prompt: 5.00,
      completion: 15.00
    },
    context_length: 128000,
    capabilities: ["vision", "function-calling", "streaming"]
  },
  {
    id: "google/gemini-pro",
    name: "Gemini Pro",
    provider: "google" as OpenRouterProvider,
    pricing: {
      prompt: 0.125,
      completion: 0.375
    },
    context_length: 32000,
    capabilities: ["function-calling", "streaming"]
  }
];

export function getOpenRouterModels() {
  return mockOpenRouterModels;
}
