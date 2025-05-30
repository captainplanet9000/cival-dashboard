import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { AgentTask } from '../AutonomousAgent';
import { AgentCapability, SpecializedWorkerAgent } from './SpecializedWorkerAgent';

/**
 * An AnalystAgent specializes in market analysis and data processing.
 * It can perform technical analysis, sentiment analysis, and research tasks.
 */
export class AnalystAgent extends SpecializedWorkerAgent {
    // Define standard capabilities for analyst agents
    private static readonly DEFAULT_CAPABILITIES: AgentCapability[] = [
        {
            id: 'technical_analysis',
            name: 'Technical Analysis',
            description: 'Analyzes price charts and calculates technical indicators',
            confidence: 0.9,
            parameters: {
                supportedIndicators: ['RSI', 'MACD', 'Moving Averages', 'Bollinger Bands']
            }
        },
        {
            id: 'sentiment_analysis',
            name: 'Sentiment Analysis',
            description: 'Analyzes market sentiment from news and social media',
            confidence: 0.75,
            parameters: {
                sources: ['Twitter', 'Reddit', 'Financial News']
            }
        },
        {
            id: 'market_research',
            name: 'Market Research',
            description: 'Conducts research on assets, markets, and trends',
            confidence: 0.85
        },
        {
            id: 'data_visualization',
            name: 'Data Visualization',
            description: 'Creates visual representations of market data',
            confidence: 0.8,
            parameters: {
                formats: ['charts', 'heatmaps', 'correlation matrices']
            }
        }
    ];

    constructor(
        id: string,
        memory: AgentMemory,
        tools: AgentTools,
        supabaseClient: SupabaseClient<Database>,
        additionalCapabilities: AgentCapability[] = []
    ) {
        // Combine default capabilities with any additional ones
        const allCapabilities = [
            ...AnalystAgent.DEFAULT_CAPABILITIES,
            ...additionalCapabilities
        ];
        
        super(id, memory, tools, supabaseClient, allCapabilities);
        this.log('info', `AnalystAgent ${id} initialized with ${allCapabilities.length} capabilities`);
        
        // Initialize any analyst-specific state or configuration
        this.initializeAnalystConfig();
    }

    /**
     * Initializes analyst-specific configuration.
     * @private
     */
    private async initializeAnalystConfig(): Promise<void> {
        try {
            // Load any persisted configuration
            const config = await this.memory.retrieve('analyst_config');
            if (!config) {
                // Set default configuration if none exists
                const defaultConfig = {
                    preferredDataSources: ['binance', 'coingecko', 'tradingview'],
                    defaultTimeframes: ['1h', '4h', '1d'],
                    autoRefreshInterval: 3600, // seconds
                    alertThresholds: {
                        significantMovement: 5.0, // percent
                        volatilityIncrease: 20.0 // percent
                    }
                };
                await this.memory.store('analyst_config', defaultConfig);
                this.log('info', 'Initialized default analyst configuration');
            }
        } catch (error: any) {
            this.log('error', `Failed to initialize analyst configuration: ${error.message}`);
        }
    }

    /**
     * Updates the analyst configuration.
     * @param updates Partial updates to apply to the configuration
     */
    public async updateAnalystConfig(updates: Record<string, any>): Promise<void> {
        try {
            const currentConfig = await this.memory.retrieve('analyst_config') || {};
            const updatedConfig = { ...currentConfig, ...updates };
            await this.memory.store('analyst_config', updatedConfig);
            this.log('info', 'Updated analyst configuration', updates);
        } catch (error: any) {
            this.log('error', `Failed to update analyst configuration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Performs a task specifically for market analysis.
     * @override
     */
    protected async _performTask(task: AgentTask): Promise<any> {
        this.log('info', `AnalystAgent ${this.id} processing task: ${task.type}`);

        switch (task.type) {
            case 'technical_analysis':
                return this.performTechnicalAnalysis(task);
                
            case 'sentiment_analysis':
                return this.performSentimentAnalysis(task);
                
            case 'market_research':
                return this.performMarketResearch(task);
                
            case 'data_visualization':
                return this.createDataVisualization(task);
                
            default:
                // Delegate to parent class for unknown task types
                return super._performTask(task);
        }
    }

    /**
     * Performs technical analysis on market data.
     * @param task The task with technical analysis parameters
     */
    private async performTechnicalAnalysis(task: AgentTask): Promise<any> {
        this.log('info', `Performing technical analysis: ${JSON.stringify(task.payload)}`);
        
        const { symbol, indicators, timeframe } = task.payload || {};
        
        if (!symbol) {
            throw new Error('Symbol is required for technical analysis');
        }
        
        // Get the necessary tools for technical analysis
        const dataCruncher = this.tools.getTool('dataCruncher');
        if (!dataCruncher) {
            throw new Error('Required tool dataCruncher not available');
        }
        
        // Prepare indicator calculations
        const requestedIndicators = indicators || ['RSI', 'MACD', 'SMA'];
        const period = timeframe || '1d';
        
        try {
            // Call data cruncher tool to perform analysis
            const analysisResult = await dataCruncher.execute({
                data: { symbol, period },
                analysisType: 'technical_indicators',
                config: { indicators: requestedIndicators }
            });
            
            // Enrich results with interpretation
            const interpretation = await this.interpretIndicators(analysisResult.results, symbol);
            
            return {
                symbol,
                timeframe: period,
                timestamp: new Date().toISOString(),
                indicators: analysisResult.results,
                interpretation,
                summary: `Technical analysis completed for ${symbol} (${period}) with ${requestedIndicators.length} indicators`
            };
        } catch (error: any) {
            this.log('error', `Technical analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Performs sentiment analysis on market data.
     * @param task The task with sentiment analysis parameters
     */
    private async performSentimentAnalysis(task: AgentTask): Promise<any> {
        this.log('info', `Performing sentiment analysis: ${JSON.stringify(task.payload)}`);
        
        const { symbol, sources, timeRange } = task.payload || {};
        
        if (!symbol) {
            throw new Error('Symbol is required for sentiment analysis');
        }
        
        // Get the necessary tools for sentiment analysis
        const dataCruncher = this.tools.getTool('dataCruncher');
        if (!dataCruncher) {
            throw new Error('Required tool dataCruncher not available');
        }
        
        try {
            // Call data cruncher tool to perform sentiment analysis
            const sentimentResult = await dataCruncher.execute({
                data: { 
                    symbol, 
                    sources: sources || ['twitter', 'reddit', 'news'],
                    timeRange: timeRange || '24h'
                },
                analysisType: 'sentiment',
                config: { 
                    includeKeywords: true,
                    includeTrending: true
                }
            });
            
            // Process and interpret results
            return {
                symbol,
                timestamp: new Date().toISOString(),
                timeRange: timeRange || '24h',
                sources: sources || ['twitter', 'reddit', 'news'],
                sentiment: sentimentResult.results,
                summary: `Sentiment analysis for ${symbol} shows ${sentimentResult.results.overallSentiment} sentiment with ${sentimentResult.results.totalMentions} mentions`
            };
        } catch (error: any) {
            this.log('error', `Sentiment analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Performs market research on assets or markets.
     * @param task The task with market research parameters
     */
    private async performMarketResearch(task: AgentTask): Promise<any> {
        this.log('info', `Performing market research: ${JSON.stringify(task.payload)}`);
        
        const { topic, depth, focus } = task.payload || {};
        
        if (!topic) {
            throw new Error('Research topic is required');
        }
        
        try {
            // Using query tool to perform research
            const elizaQuery = await this.tools.getTool('eliza_query');
            if (!elizaQuery) {
                throw new Error('Required tool eliza_query not available');
            }
            
            const researchResult = await elizaQuery.execute({
                topic: 'market_research',
                prompt: `Perform market research on ${topic}`,
                context: {
                    depth: depth || 'medium',
                    focus: focus || 'general',
                    includeCharts: true,
                    includeHistoricalData: true
                }
            });
            
            return {
                topic,
                timestamp: new Date().toISOString(),
                research: researchResult,
                summary: researchResult.summary || `Market research on ${topic} completed`
            };
        } catch (error: any) {
            this.log('error', `Market research failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates data visualizations from market data.
     * @param task The task with data visualization parameters
     */
    private async createDataVisualization(task: AgentTask): Promise<any> {
        this.log('info', `Creating data visualization: ${JSON.stringify(task.payload)}`);
        
        const { data, type, options } = task.payload || {};
        
        if (!data || !type) {
            throw new Error('Data and visualization type are required');
        }
        
        // This would typically call a visualization service or use a charting library
        // For now, return a placeholder response
        
        return {
            visualizationType: type,
            timestamp: new Date().toISOString(),
            options: options || {},
            visualUrl: `https://example.com/visualizations/${Date.now()}`,
            summary: `${type} visualization created successfully`
        };
    }

    /**
     * Interprets technical indicators to provide human-readable analysis.
     * @private
     */
    private async interpretIndicators(indicators: any, symbol: string): Promise<string> {
        try {
            // This would typically call ElizaOS or another LLM service for interpretation
            // For now, return a placeholder response
            return `Analysis for ${symbol} based on technical indicators suggests a neutral market position with moderate volatility.`;
        } catch (error: any) {
            this.log('warn', `Failed to interpret indicators: ${error.message}`);
            return 'Indicator interpretation unavailable';
        }
    }
} 