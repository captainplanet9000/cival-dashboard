import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { AgentTask } from '../AutonomousAgent';
import { AgentCapability, SpecializedWorkerAgent } from './SpecializedWorkerAgent';
import { WorkflowRegistry } from '../workflow/WorkflowRegistry';
import { WorkflowExecutor, WorkflowStatus } from '../workflow/WorkflowExecutor';
import { WorkflowParameters, WorkflowResult } from '../workflow/WorkflowTemplate';

/**
 * ResearchAgent specializes in market research and data analysis.
 * It focuses on gathering and analyzing information from various sources to provide
 * comprehensive research reports and insights.
 */
export class ResearchAgent extends SpecializedWorkerAgent {
    // Define standard capabilities for research agents
    private static readonly DEFAULT_CAPABILITIES: AgentCapability[] = [
        {
            id: 'market_research',
            name: 'Market Research',
            description: 'Conduct comprehensive market research on assets, markets, and trends',
            confidence: 0.9
        },
        {
            id: 'sentiment_analysis',
            name: 'Sentiment Analysis',
            description: 'Analyze sentiment from news, social media, and other sources',
            confidence: 0.85
        },
        {
            id: 'data_aggregation',
            name: 'Data Aggregation',
            description: 'Collect and aggregate data from multiple sources',
            confidence: 0.8
        },
        {
            id: 'competitor_analysis',
            name: 'Competitor Analysis',
            description: 'Research and analyze competitive landscape',
            confidence: 0.75
        },
        {
            id: 'technical_analysis',
            name: 'Technical Analysis',
            description: 'Perform technical analysis on price charts',
            confidence: 0.7
        },
        {
            id: 'trend_identification',
            name: 'Trend Identification',
            description: 'Identify emerging trends and patterns in data',
            confidence: 0.8
        }
    ];

    // The workflow registry for accessing workflow templates
    private workflowRegistry: WorkflowRegistry;
    
    // The workflow executor for running workflows
    private workflowExecutor: WorkflowExecutor;

    /**
     * Creates a new ResearchAgent instance.
     * @param id The agent ID
     * @param memory The agent memory system
     * @param tools The agent tools registry
     * @param supabaseClient The Supabase client
     * @param workflowRegistry The workflow registry
     * @param workflowExecutor The workflow executor
     * @param additionalCapabilities Optional additional capabilities to add
     */
    constructor(
        id: string,
        memory: AgentMemory,
        tools: AgentTools,
        supabaseClient: SupabaseClient<Database>,
        workflowRegistry: WorkflowRegistry,
        workflowExecutor: WorkflowExecutor,
        additionalCapabilities?: AgentCapability[]
    ) {
        super(id, memory, tools, supabaseClient);
        
        // Register the standard capabilities
        ResearchAgent.DEFAULT_CAPABILITIES.forEach(capability => {
            this.registerCapability(capability);
        });
        
        // Register any additional capabilities
        if (additionalCapabilities && additionalCapabilities.length > 0) {
            additionalCapabilities.forEach(capability => {
                this.registerCapability(capability);
            });
        }
        
        // Store the workflow registry and executor
        this.workflowRegistry = workflowRegistry;
        this.workflowExecutor = workflowExecutor;
        
        this.log('info', `ResearchAgent ${id} initialized with ${this.getCapabilities().length} capabilities`);
    }
    
    /**
     * Performs the core task logic for research-related tasks.
     * @param task The task to perform
     * @returns The task result
     */
    protected async _performTask(task: AgentTask): Promise<any> {
        this.log('info', `ResearchAgent ${this.id} performing task: ${task.type} (ID: ${task.id})`, task.payload);
        
        switch (task.type) {
            case 'market_research':
                return await this.performMarketResearch(task);
                
            case 'technical_analysis':
                return await this.performTechnicalAnalysis(task);
                
            case 'sentiment_analysis':
                return await this.performSentimentAnalysis(task);
                
            case 'data_aggregation':
                return await this.aggregateData(task);
                
            case 'competitor_analysis':
                return await this.analyzeCompetitors(task);
                
            case 'trend_identification':
                return await this.identifyTrends(task);
                
            default:
                this.log('warn', `ResearchAgent ${this.id} received unhandled task type: ${task.type}`);
                throw new Error(`Task type '${task.type}' not supported by ResearchAgent`);
        }
    }
    
    /**
     * Performs comprehensive market research on a cryptocurrency or market.
     * @param task The market research task
     * @returns The market research results
     */
    private async performMarketResearch(task: AgentTask): Promise<any> {
        this.log('info', `Starting market research for ${task.payload.symbol || 'market'}`);
        
        try {
            // Get the market research workflow template
            const template = this.workflowRegistry.getTemplate('market_research');
            if (!template) {
                throw new Error('Market research workflow template not found');
            }
            
            // Prepare the workflow parameters
            const workflowParams: WorkflowParameters = {
                ...task.payload,
                // Add any missing required parameters with defaults
                symbol: task.payload.symbol || 'BTC',
                timeframe: task.payload.timeframe || 'medium'
            };
            
            // Execute the workflow
            const executionId = await this.workflowExecutor.executeWorkflow(template, workflowParams);
            this.log('info', `Started market research workflow execution: ${executionId}`);
            
            // Monitor the workflow execution until completion
            let result: WorkflowResult | undefined;
            let execution = this.workflowExecutor.getExecution(executionId);
            
            // Wait for the workflow to complete or fail
            while (execution && execution.status !== WorkflowStatus.COMPLETED && execution.status !== WorkflowStatus.FAILED) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                execution = this.workflowExecutor.getExecution(executionId);
                this.log('info', `Market research workflow progress: ${execution?.progress || 0}%`);
            }
            
            // Get the workflow result
            result = this.workflowExecutor.getWorkflowResult(executionId);
            
            if (!result) {
                throw new Error(`Workflow execution ${executionId} failed or did not produce a result`);
            }
            
            this.log('info', `Market research workflow completed successfully for ${task.payload.symbol || 'market'}`);
            return result.output;
            
        } catch (error: any) {
            this.log('error', `Error performing market research: ${error.message}`, error);
            throw error;
        }
    }
    
    /**
     * Performs technical analysis on a cryptocurrency or market.
     * @param task The technical analysis task
     * @returns The technical analysis results
     */
    private async performTechnicalAnalysis(task: AgentTask): Promise<any> {
        this.log('info', `Starting technical analysis for ${task.payload.symbol || 'unknown symbol'}`);
        
        try {
            // Get the technical analysis workflow template
            const template = this.workflowRegistry.getTemplate('technical_analysis');
            if (!template) {
                throw new Error('Technical analysis workflow template not found');
            }
            
            // Prepare the workflow parameters
            const workflowParams: WorkflowParameters = {
                ...task.payload,
                // Add any missing required parameters with defaults
                symbol: task.payload.symbol || 'BTC/USD',
                timeframe: task.payload.timeframe || '1d',
                period: task.payload.period || 100
            };
            
            // Execute the workflow
            const executionId = await this.workflowExecutor.executeWorkflow(template, workflowParams);
            this.log('info', `Started technical analysis workflow execution: ${executionId}`);
            
            // Monitor the workflow execution until completion
            let result: WorkflowResult | undefined;
            let execution = this.workflowExecutor.getExecution(executionId);
            
            // Wait for the workflow to complete or fail
            while (execution && execution.status !== WorkflowStatus.COMPLETED && execution.status !== WorkflowStatus.FAILED) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                execution = this.workflowExecutor.getExecution(executionId);
            }
            
            // Get the workflow result
            result = this.workflowExecutor.getWorkflowResult(executionId);
            
            if (!result) {
                throw new Error(`Workflow execution ${executionId} failed or did not produce a result`);
            }
            
            this.log('info', `Technical analysis workflow completed successfully for ${task.payload.symbol || 'unknown symbol'}`);
            return result.output;
            
        } catch (error: any) {
            this.log('error', `Error performing technical analysis: ${error.message}`, error);
            throw error;
        }
    }
    
    /**
     * Performs sentiment analysis on text data.
     * @param task The sentiment analysis task
     * @returns The sentiment analysis results
     */
    private async performSentimentAnalysis(task: AgentTask): Promise<any> {
        this.log('info', `Starting sentiment analysis for ${task.payload.source || 'unknown source'}`);
        
        try {
            // Get the sentiment analyzer tool
            const sentimentTool = this.tools.getTool('sentimentAnalyzer');
            if (!sentimentTool) {
                throw new Error('Sentiment analyzer tool not found');
            }
            
            // Determine if we're analyzing a single text or multiple texts
            if (task.payload.texts && Array.isArray(task.payload.texts)) {
                // Batch analysis
                this.log('info', `Performing batch sentiment analysis on ${task.payload.texts.length} texts`);
                const results = await this.tools.executeTool('sentimentAnalyzer', {
                    texts: task.payload.texts,
                    source: task.payload.source
                });
                
                // Calculate aggregate sentiment
                if (Array.isArray(results)) {
                    const scores = results.map((r: any) => r.score || 0);
                    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                    
                    // Count sentiment labels
                    const labels = results.map((r: any) => r.label || 'neutral');
                    const labelCounts = labels.reduce((counts: {[key: string]: number}, label) => {
                        counts[label] = (counts[label] || 0) + 1;
                        return counts;
                    }, {});
                    
                    // Find the most common label
                    let dominantLabel = 'neutral';
                    let maxCount = 0;
                    for (const [label, count] of Object.entries(labelCounts)) {
                        if (count > maxCount) {
                            dominantLabel = label;
                            maxCount = count;
                        }
                    }
                    
                    // Add aggregate data
                    return {
                        individualResults: results,
                        aggregate: {
                            averageScore: avgScore,
                            dominantLabel,
                            labelCounts,
                            totalTexts: results.length
                        }
                    };
                }
                
                return results;
                
            } else {
                // Single text analysis
                this.log('info', `Performing sentiment analysis on single text`);
                return await this.tools.executeTool('sentimentAnalyzer', {
                    text: task.payload.text,
                    source: task.payload.source
                });
            }
            
        } catch (error: any) {
            this.log('error', `Error performing sentiment analysis: ${error.message}`, error);
            throw error;
        }
    }
    
    /**
     * Aggregates data from multiple sources.
     * @param task The data aggregation task
     * @returns The aggregated data
     */
    private async aggregateData(task: AgentTask): Promise<any> {
        this.log('info', `Starting data aggregation for ${task.payload.topic || 'unknown topic'}`);
        
        try {
            // This is a simplified implementation
            // In a real implementation, this would:
            // 1. Identify data sources relevant to the topic
            // 2. Fetch data from each source
            // 3. Clean and normalize the data
            // 4. Merge the data from different sources
            // 5. Return the aggregated dataset
            
            const dataSources = task.payload.dataSources || [];
            const results: Record<string, any> = {};
            
            for (const source of dataSources) {
                // Simulate fetching data from each source
                this.log('info', `Fetching data from source: ${source}`);
                
                // Here we would actually fetch data from external APIs or databases
                // For now, just create placeholder data
                results[source] = {
                    source,
                    timestamp: new Date().toISOString(),
                    data: { /* Placeholder data */ },
                    metadata: {
                        recordCount: Math.floor(Math.random() * 100) + 10,
                        format: 'json',
                        topic: task.payload.topic
                    }
                };
            }
            
            return {
                topic: task.payload.topic,
                timestamp: new Date().toISOString(),
                sourceCount: dataSources.length,
                sources: dataSources,
                aggregatedData: results
            };
            
        } catch (error: any) {
            this.log('error', `Error aggregating data: ${error.message}`, error);
            throw error;
        }
    }
    
    /**
     * Analyzes competitors in a market.
     * @param task The competitor analysis task
     * @returns The competitor analysis results
     */
    private async analyzeCompetitors(task: AgentTask): Promise<any> {
        this.log('info', `Starting competitor analysis for ${task.payload.symbol || 'unknown asset'}`);
        
        try {
            // This is a simplified implementation
            // In a real implementation, this would:
            // 1. Identify competitors in the same market segment
            // 2. Gather data about each competitor
            // 3. Analyze strengths and weaknesses
            // 4. Compare metrics between competitors
            // 5. Generate a competitive landscape report
            
            const mainAsset = task.payload.symbol || 'BTC';
            
            // In a real implementation, this would use a market segmentation
            // database or API to find competitors
            let competitors: string[] = [];
            if (mainAsset === 'BTC') {
                competitors = ['ETH', 'SOL', 'BNB', 'XRP'];
            } else if (mainAsset === 'ETH') {
                competitors = ['BTC', 'SOL', 'ADA', 'AVAX'];
            } else {
                // For other assets, simulate some competitors
                competitors = ['BTC', 'ETH', 'SOL', 'AVAX', 'DOT'].filter(c => c !== mainAsset);
            }
            
            // Simulate competitive analysis
            const competitorData = competitors.map(symbol => ({
                symbol,
                marketCap: Math.random() * 1000000000,
                volume24h: Math.random() * 100000000,
                priceChange7d: (Math.random() * 40) - 20, // -20% to +20%
                strengths: ['Example strength 1', 'Example strength 2'],
                weaknesses: ['Example weakness 1', 'Example weakness 2'],
                opportunities: ['Example opportunity'],
                threats: ['Example threat']
            }));
            
            return {
                mainAsset,
                timestamp: new Date().toISOString(),
                competitorCount: competitors.length,
                competitors: competitorData,
                summary: 'Simulated competitor analysis summary'
            };
            
        } catch (error: any) {
            this.log('error', `Error analyzing competitors: ${error.message}`, error);
            throw error;
        }
    }
    
    /**
     * Identifies trends in market data.
     * @param task The trend identification task
     * @returns The identified trends
     */
    private async identifyTrends(task: AgentTask): Promise<any> {
        this.log('info', `Starting trend identification for ${task.payload.topic || 'unknown topic'}`);
        
        try {
            // This is a simplified implementation
            // In a real implementation, this would:
            // 1. Gather historical data for the topic
            // 2. Apply trend detection algorithms
            // 3. Validate trends with statistical tests
            // 4. Categorize and prioritize identified trends
            // 5. Generate a trend report
            
            // Simulate identifying trends
            const trendCount = Math.floor(Math.random() * 5) + 2; // 2 to 6 trends
            const trends = [];
            
            for (let i = 0; i < trendCount; i++) {
                trends.push({
                    id: `trend-${i + 1}`,
                    name: `Simulated Trend ${i + 1}`,
                    description: `This is a placeholder description for trend ${i + 1}`,
                    strength: Math.random() * 0.7 + 0.3, // 0.3 to 1.0
                    direction: Math.random() > 0.5 ? 'upward' : 'downward',
                    duration: ['short-term', 'medium-term', 'long-term'][Math.floor(Math.random() * 3)],
                    confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
                    relatedFactors: ['Factor 1', 'Factor 2', 'Factor 3']
                });
            }
            
            return {
                topic: task.payload.topic,
                timestamp: new Date().toISOString(),
                trendCount,
                trends,
                summary: 'Simulated trend identification summary'
            };
            
        } catch (error: any) {
            this.log('error', `Error identifying trends: ${error.message}`, error);
            throw error;
        }
    }
} 