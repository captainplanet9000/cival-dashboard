/**
 * API Service Manager
 * 
 * Provides a unified interface for managing and accessing multiple AI and data services
 * for the Trading Farm platform. This enables agents to access LLMs, search engines,
 * market data, and other services through a consistent API.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import { createOpenRouterClient, OpenRouterClient, OpenRouterModel } from './openrouter-client';

// API Service Types
export type ApiServiceType = 
  | 'llm'
  | 'search'
  | 'market_data'
  | 'voice'
  | 'research'
  | 'chart'
  | 'wolfram';

// Service Provider Interface
export interface ApiServiceProvider {
  id: string;
  name: string;
  serviceType: ApiServiceType;
  description?: string;
  iconUrl?: string;
  configSchema: Record<string, any>;
  rateLimitInfo?: Record<string, any>;
  isEnabled: boolean;
}

// User API Configuration Interface
export interface UserApiConfiguration {
  id: string;
  userId: string;
  providerId: string;
  displayName: string;
  apiKey?: string;
  isEncrypted: boolean;
  configuration: Record<string, any>;
  isActive: boolean;
  usageMetrics?: Record<string, any>;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Agent API Service Assignment
export interface AgentApiService {
  id: string;
  agentId: string;
  configurationId: string;
  priority: number;
  usageQuota?: Record<string, any>;
  isActive: boolean;
}

// API Usage Log Entry
export interface ApiUsageLog {
  id: string;
  configurationId: string;
  agentId?: string;
  requestType: string;
  requestData?: Record<string, any>;
  responseStatus: string;
  tokensUsed?: number;
  cost?: number;
  durationMs?: number;
  createdAt: string;
}

// API Service Clients Map
interface ApiServiceClients {
  openrouter?: OpenRouterClient;
  // Add other client types as they are implemented
  [key: string]: any;
}

/**
 * API Service Manager for Trading Farm
 * Handles integration with multiple AI and data services
 */
export class ApiServiceManager {
  private clients: ApiServiceClients = {};
  private supabase: any;
  private isServer: boolean;
  private isInitialized: boolean = false;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;
    this.supabase = isServer ? createServerClient() : createBrowserClient();
  }

  /**
   * Initialize the service manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize OpenRouter client if API key is available
      if (process.env.OPENROUTER_API_KEY) {
        this.clients.openrouter = createOpenRouterClient(
          process.env.OPENROUTER_API_KEY,
          'anthropic/claude-3-sonnet-20240229' // Default model
        );
        await this.clients.openrouter.initialize();
      }
      
      // Initialize other clients as needed
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize API Service Manager:', error);
      throw error;
    }
  }

  /**
   * Get available service providers
   */
  async getServiceProviders(): Promise<ApiServiceProvider[]> {
    try {
      const { data, error } = await this.supabase
        .from('api_service_providers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map((provider: any) => ({
        id: provider.id,
        name: provider.name,
        serviceType: provider.service_type,
        description: provider.description,
        iconUrl: provider.icon_url,
        configSchema: provider.config_schema,
        rateLimitInfo: provider.rate_limit_info,
        isEnabled: provider.is_enabled
      }));
    } catch (error) {
      console.error('Error fetching service providers:', error);
      return [];
    }
  }

  /**
   * Get service providers by type
   */
  async getServiceProvidersByType(type: ApiServiceType): Promise<ApiServiceProvider[]> {
    try {
      const { data, error } = await this.supabase
        .from('api_service_providers')
        .select('*')
        .eq('service_type', type)
        .order('name');
      
      if (error) throw error;
      
      return data.map((provider: any) => ({
        id: provider.id,
        name: provider.name,
        serviceType: provider.service_type,
        description: provider.description,
        iconUrl: provider.icon_url,
        configSchema: provider.config_schema,
        rateLimitInfo: provider.rate_limit_info,
        isEnabled: provider.is_enabled
      }));
    } catch (error) {
      console.error(`Error fetching ${type} service providers:`, error);
      return [];
    }
  }

  /**
   * Get user API configurations
   */
  async getUserApiConfigurations(userId?: string): Promise<UserApiConfiguration[]> {
    try {
      // Get the current user's ID if not provided
      if (!userId) {
        const { data: { user }, error: userError } = await this.supabase.auth.getUser();
        if (userError) throw userError;
        userId = user?.id;
      }
      
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await this.supabase
        .from('user_api_configurations')
        .select('*, api_service_providers(*)')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return data.map((config: any) => ({
        id: config.id,
        userId: config.user_id,
        providerId: config.provider_id,
        displayName: config.display_name,
        apiKey: config.api_key,
        isEncrypted: config.is_encrypted,
        configuration: config.configuration,
        isActive: config.is_active,
        usageMetrics: config.usage_metrics,
        lastUsedAt: config.last_used_at,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
        provider: config.api_service_providers ? {
          id: config.api_service_providers.id,
          name: config.api_service_providers.name,
          serviceType: config.api_service_providers.service_type
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching user API configurations:', error);
      return [];
    }
  }

  /**
   * Create a new API configuration for a user
   */
  async createApiConfiguration(
    userId: string, 
    providerId: string, 
    config: {
      displayName: string;
      apiKey?: string;
      configuration?: Record<string, any>;
    }
  ): Promise<UserApiConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_configurations')
        .insert({
          user_id: userId,
          provider_id: providerId,
          display_name: config.displayName,
          api_key: config.apiKey,
          configuration: config.configuration || {},
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        userId: data.user_id,
        providerId: data.provider_id,
        displayName: data.display_name,
        apiKey: data.api_key,
        isEncrypted: data.is_encrypted,
        configuration: data.configuration,
        isActive: data.is_active,
        usageMetrics: data.usage_metrics,
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating API configuration:', error);
      return null;
    }
  }

  /**
   * Assign an API service to an agent
   */
  async assignApiServiceToAgent(
    agentId: string,
    configurationId: string,
    priority: number = 0,
    usageQuota?: Record<string, any>
  ): Promise<AgentApiService | null> {
    try {
      const { data, error } = await this.supabase
        .from('agent_api_services')
        .insert({
          agent_id: agentId,
          configuration_id: configurationId,
          priority,
          usage_quota: usageQuota,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        agentId: data.agent_id,
        configurationId: data.configuration_id,
        priority: data.priority,
        usageQuota: data.usage_quota,
        isActive: data.is_active
      };
    } catch (error) {
      console.error('Error assigning API service to agent:', error);
      return null;
    }
  }

  /**
   * Get API services assigned to an agent
   */
  async getAgentApiServices(agentId: string): Promise<{
    service: AgentApiService;
    configuration: UserApiConfiguration;
    provider: ApiServiceProvider;
  }[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_api_services')
        .select(`
          *,
          user_api_configurations(*),
          user_api_configurations.api_service_providers(*)
        `)
        .eq('agent_id', agentId)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        service: {
          id: item.id,
          agentId: item.agent_id,
          configurationId: item.configuration_id,
          priority: item.priority,
          usageQuota: item.usage_quota,
          isActive: item.is_active
        },
        configuration: {
          id: item.user_api_configurations.id,
          userId: item.user_api_configurations.user_id,
          providerId: item.user_api_configurations.provider_id,
          displayName: item.user_api_configurations.display_name,
          apiKey: item.user_api_configurations.api_key,
          isEncrypted: item.user_api_configurations.is_encrypted,
          configuration: item.user_api_configurations.configuration,
          isActive: item.user_api_configurations.is_active,
          usageMetrics: item.user_api_configurations.usage_metrics,
          lastUsedAt: item.user_api_configurations.last_used_at,
          createdAt: item.user_api_configurations.created_at,
          updatedAt: item.user_api_configurations.updated_at
        },
        provider: {
          id: item.user_api_configurations.api_service_providers.id,
          name: item.user_api_configurations.api_service_providers.name,
          serviceType: item.user_api_configurations.api_service_providers.service_type,
          description: item.user_api_configurations.api_service_providers.description,
          iconUrl: item.user_api_configurations.api_service_providers.icon_url,
          configSchema: item.user_api_configurations.api_service_providers.config_schema,
          rateLimitInfo: item.user_api_configurations.api_service_providers.rate_limit_info,
          isEnabled: item.user_api_configurations.api_service_providers.is_enabled
        }
      }));
    } catch (error) {
      console.error('Error fetching agent API services:', error);
      return [];
    }
  }

  /**
   * Log API service usage
   */
  async logApiUsage(
    configurationId: string,
    requestType: string,
    responseStatus: string,
    options?: {
      agentId?: string;
      requestData?: Record<string, any>;
      tokensUsed?: number;
      cost?: number;
      durationMs?: number;
    }
  ): Promise<void> {
    try {
      await this.supabase
        .from('api_service_usage_logs')
        .insert({
          configuration_id: configurationId,
          agent_id: options?.agentId,
          request_type: requestType,
          request_data: options?.requestData,
          response_status: responseStatus,
          tokens_used: options?.tokensUsed,
          cost: options?.cost,
          duration_ms: options?.durationMs
        });
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  /**
   * Get OpenRouter client
   */
  getOpenRouterClient(apiKey?: string): OpenRouterClient {
    // If API key is provided, create a new client
    if (apiKey) {
      return createOpenRouterClient(apiKey);
    }
    
    // If we already have a client, return it
    if (this.clients.openrouter) {
      return this.clients.openrouter;
    }
    
    // Otherwise, create a new client from environment
    if (process.env.OPENROUTER_API_KEY) {
      this.clients.openrouter = createOpenRouterClient(process.env.OPENROUTER_API_KEY);
      return this.clients.openrouter;
    }
    
    throw new Error('OpenRouter API key not found');
  }

  /**
   * Get an API client by provider name
   */
  async getApiClient(providerName: string, apiKey?: string): Promise<any> {
    switch (providerName.toLowerCase()) {
      case 'openrouter':
        return this.getOpenRouterClient(apiKey);
      // Add additional client types as they are implemented
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Get an API client for an agent by service type
   */
  async getAgentApiClient(
    agentId: string,
    serviceType: ApiServiceType
  ): Promise<any> {
    try {
      // Get agent's API services of the requested type
      const services = await this.getAgentApiServices(agentId);
      const matchingServices = services.filter(s => s.provider.serviceType === serviceType);
      
      if (matchingServices.length === 0) {
        throw new Error(`No ${serviceType} service configured for agent ${agentId}`);
      }
      
      // Get the highest priority service
      const service = matchingServices.sort((a, b) => b.service.priority - a.service.priority)[0];
      
      // Get the API client
      return this.getApiClient(service.provider.name, service.configuration.apiKey);
    } catch (error) {
      console.error(`Error getting ${serviceType} client for agent ${agentId}:`, error);
      throw error;
    }
  }
}

// Singleton instance for client-side
let clientInstance: ApiServiceManager | null = null;

// Create client-side instance
export function getApiServiceManager(): ApiServiceManager {
  if (typeof window === 'undefined') {
    // Server-side: Always create a new instance
    return new ApiServiceManager(true);
  }
  
  // Client-side: Return or create singleton
  if (!clientInstance) {
    clientInstance = new ApiServiceManager(false);
  }
  
  return clientInstance;
}

// Create server-side instance
export function getServerApiServiceManager(): ApiServiceManager {
  return new ApiServiceManager(true);
}
