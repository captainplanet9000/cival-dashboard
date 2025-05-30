import { AgentTask, HealthStatus as BaseHealthStatus } from '@/agents/AutonomousAgent';
import { ElizaOSClient } from '@/agents/ElizaManagerAgent';
import { Database } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

// Configuration interface for the real client
interface RealElizaOSClientConfig {
    apiUrl: string;
    apiKey: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

// API response interfaces
interface ElizaTaskAnalysisResponse {
    workerType: string;
    priority: number;
    requiredCapabilities?: string[];
}

interface ElizaWorkerRecommendationResponse {
    workerIds: string[];
    confidence: number;
}

interface ElizaCommandInterpretationResponse {
    commandName: string;
    context: any;
    priority: number;
}

interface ElizaQueryResponse {
    result: any;
    error?: string;
}

interface ElizaAgentCreationResponse {
    id: string;
    status: string;
}

/**
 * Real implementation of the ElizaOSClient for interacting with the ElizaOS API.
 * Implements all required methods with proper error handling, retries, and logging.
 */
export class RealElizaOSClient implements ElizaOSClient {
    private config: Required<RealElizaOSClientConfig>;

    constructor(config: RealElizaOSClientConfig) {
        // Set defaults for optional parameters
        this.config = { 
            timeout: 15000, 
            retryAttempts: 3,
            retryDelay: 1000,
            ...config 
        };
        
        if (!this.config.apiUrl || !this.config.apiKey) {
            throw new Error('[RealElizaOSClient] API URL and API Key are required.');
        }
        
        // Ensure API URL doesn't end with a slash
        this.config.apiUrl = this.config.apiUrl.replace(/\/$/, '');
        console.info(`[RealElizaOSClient] Initialized for URL: ${this.config.apiUrl}`);
    }

    // Helper to construct headers
    private _getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-ElizaOS-Client': 'GWDS-Trading-Farm',
            'X-ElizaOS-Client-Version': '1.0.0'
        };
    }

    // Enhanced API request helper with retries
    private async _makeApiRequest<T>(
        endpoint: string, 
        method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
        payload?: any,
        customHeaders?: Record<string, string>
    ): Promise<T> {
        const url = `${this.config.apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        console.debug(`[RealElizaOSClient] Preparing ${method} request to ${url}`, payload);

        const headers = { ...this._getHeaders(), ...customHeaders };
        
        let lastError: Error | null = null;
        
        // Implement retry logic
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const requestOptions: RequestInit = {
                    method: method,
                    headers: headers,
                    signal: AbortSignal.timeout(this.config.timeout),
                };

                if (payload && (method === 'POST' || method === 'PUT')) {
                    requestOptions.body = JSON.stringify(payload);
                }

                const response = await fetch(url, requestOptions);

                // Handle rate limiting with exponential backoff
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
                    console.warn(`[RealElizaOSClient] Rate limited, retrying after ${retryAfter}s...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }

                if (!response.ok) {
                    let errorBody = 'Unknown error';
                    try {
                        errorBody = await response.text();
                    } catch {}
                    
                    const errorMessage = `ElizaOS API Error (${response.status}): ${response.statusText} - ${errorBody}`;
                    console.error(`[RealElizaOSClient] ${errorMessage}`);
                    
                    if (attempt < this.config.retryAttempts && (response.status >= 500 || response.status === 429)) {
                        // Only retry on server errors or rate limiting
                        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                        console.warn(`[RealElizaOSClient] Retry attempt ${attempt}/${this.config.retryAttempts} after ${delay}ms`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    
                    throw new Error(errorMessage);
                }

                // Handle cases with no content expected
                if (response.status === 204) {
                    return undefined as any;
                }
                
                const responseData = await response.json();
                console.debug(`[RealElizaOSClient] Received response from ${endpoint}:`, responseData);
                return responseData as T;

            } catch (error: any) {
                lastError = error;
                
                if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                    console.warn(`[RealElizaOSClient] Request timed out (attempt ${attempt}/${this.config.retryAttempts})`);
                } else {
                    console.error(`[RealElizaOSClient] Error calling ${endpoint} (attempt ${attempt}/${this.config.retryAttempts}):`, error.message);
                }
                
                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                    console.warn(`[RealElizaOSClient] Retry attempt ${attempt}/${this.config.retryAttempts} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // If we get here, all retry attempts failed
        throw lastError || new Error(`[RealElizaOSClient] All retry attempts failed for ${endpoint}`);
    }

    /**
     * Analyzes a task to determine the most suitable worker type.
     * @param task The task to analyze
     * @returns Worker type recommendation and priority
     */
    async analyzeTaskRequirements(task: AgentTask): Promise<{ suitableWorkerType: string; priority: number }> {
        console.info(`[RealElizaOSClient] Analyzing task requirements for task ${task.id}`);
        
        const response = await this._makeApiRequest<ElizaTaskAnalysisResponse>(
            '/task-analysis',
            'POST',
            {
                taskId: task.id,
                taskType: task.type,
                payload: task.payload,
                commandName: task.commandName,
                context: task.context,
                priority: task.priority
            }
        );
        
        return {
            suitableWorkerType: response.workerType,
            priority: response.priority
        };
    }

    /**
     * Gets worker recommendations based on criteria.
     * @param criteria Criteria for worker selection
     * @returns Array of recommended worker IDs
     */
    async getWorkerRecommendations(criteria: any): Promise<string[]> {
        console.info('[RealElizaOSClient] Getting worker recommendations', criteria);
        
        const response = await this._makeApiRequest<ElizaWorkerRecommendationResponse>(
            '/recommend-workers',
            'POST',
            criteria
        );
        
        return response.workerIds;
    }

    /**
     * Reports agent status to ElizaOS for monitoring.
     * @param agentId The agent ID
     * @param status The health status
     */
    async reportAgentStatus(agentId: string, status: BaseHealthStatus): Promise<void> {
        console.info(`[RealElizaOSClient] Reporting status for agent ${agentId}:`, status);
        
        await this._makeApiRequest<void>(
            `/agents/${encodeURIComponent(agentId)}/status`,
            'PUT',
            {
                status: status.status,
                details: status.details,
                timestamp: new Date().toISOString()
            }
        );
    }

    /**
     * Interprets a natural language command.
     * @param command The natural language command
     * @returns An agent task created from the command
     */
    async interpretNaturalLanguageCommand(command: string): Promise<AgentTask> {
        console.info('[RealElizaOSClient] Interpreting command:', command);
        
        const response = await this.query('command_interpretation', command);
        
        if (!response || !response.commandName) {
            throw new Error('Failed to interpret command: invalid response structure');
        }
        
        // Map the response to an AgentTask structure
        const taskId = crypto.randomUUID();
        return {
            id: taskId,
            type: response.commandName,
            payload: response.context || {},
            status: 'pending',
            command: command,
            commandName: response.commandName,
            context: response.context || {},
            priority: response.priority || 5,
            result: null,
            error: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedAgentId: null,
            metadata: { source: 'natural_language_command' }
        };
    }

    /**
     * Sends a query to ElizaOS.
     * @param topic The query topic
     * @param prompt The query prompt
     * @param context Additional context
     * @returns The query result
     */
    async query(topic: string, prompt: string, context?: any): Promise<any> {
        console.info(`[RealElizaOSClient] Querying topic '${topic}':`, prompt);
        
        const response = await this._makeApiRequest<ElizaQueryResponse>(
            '/query',
            'POST',
            {
                topic,
                prompt,
                context: context || {}
            }
        );
        
        if (response.error) {
            throw new Error(`ElizaOS query error: ${response.error}`);
        }
        
        return response.result;
    }

    /**
     * Sends a strategic query for high-level decision making.
     * @param topic The query topic
     * @param prompt The query prompt
     * @param context Additional context
     * @returns The strategic decision result
     */
    async strategicQuery(topic: string, prompt: string, context?: any): Promise<any> {
        console.info(`[RealElizaOSClient] Strategic query on topic '${topic}':`, prompt);
        
        const response = await this._makeApiRequest<ElizaQueryResponse>(
            '/strategic-query',
            'POST',
            {
                topic,
                prompt,
                context: context || {},
                requireDecision: true
            }
        );
        
        if (response.error) {
            throw new Error(`ElizaOS strategic query error: ${response.error}`);
        }
        
        return response.result;
    }

    /**
     * Creates a new agent with ElizaOS.
     * @param spec Agent specification
     * @returns The created agent info
     */
    async createAgent(spec: any): Promise<{ id: string }> {
        console.info('[RealElizaOSClient] Creating agent:', spec);
        
        const response = await this._makeApiRequest<ElizaAgentCreationResponse>(
            '/agents',
            'POST',
            spec
        );
        
        return { id: response.id };
    }

    /**
     * Destroys an agent.
     * @param agentId The agent ID to destroy
     */
    async destroyAgent(agentId: string): Promise<void> {
        console.info(`[RealElizaOSClient] Destroying agent ${agentId}`);
        
        await this._makeApiRequest<void>(
            `/agents/${encodeURIComponent(agentId)}`,
            'DELETE'
        );
    }
}

// Helper function (Example - needs actual implementation based on API response)
// function mapResponseToAgentTask(response: any): AgentTask {
//    // ... logic to map ElizaOS response fields to AgentTask fields ...
//    throw new Error("mapResponseToAgentTask not implemented");
// }
 