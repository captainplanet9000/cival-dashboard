import { WorkflowTemplate, WorkflowTemplateMetadata, WorkflowParameters, WorkflowStep } from '../WorkflowTemplate';

/**
 * A workflow template for conducting market research on a cryptocurrency asset.
 * This template gathers information from various sources, analyzes sentiment,
 * and creates a comprehensive market research report.
 */
export class MarketResearchTemplate extends WorkflowTemplate {
    /**
     * Gets the metadata for this workflow template.
     * @returns The template metadata
     */
    getMetadata(): WorkflowTemplateMetadata {
        return {
            id: 'market_research',
            name: 'Market Research',
            description: 'Conducts comprehensive market research on a cryptocurrency asset',
            version: '1.0.0',
            category: 'market_analysis',
            author: 'Trading Farm',
            tags: ['market', 'research', 'sentiment', 'crypto'],
            parameters: {
                symbol: {
                    name: 'symbol',
                    description: 'Trading symbol (e.g., BTC, ETH)',
                    type: 'string',
                    required: true
                },
                timeframe: {
                    name: 'timeframe',
                    description: 'Research timeframe',
                    type: 'string',
                    required: false,
                    default: 'medium',
                    enum: ['short', 'medium', 'long']
                },
                dataSources: {
                    name: 'dataSources',
                    description: 'Data sources to include in research',
                    type: 'array',
                    required: false,
                    default: ['price', 'news', 'social', 'onchain'],
                    items: {
                        type: 'string',
                        description: 'Data source name'
                    }
                },
                fundamentalFactors: {
                    name: 'fundamentalFactors',
                    description: 'Fundamental factors to analyze',
                    type: 'array',
                    required: false,
                    default: ['tokenomics', 'team', 'technology', 'adoption'],
                    items: {
                        type: 'string',
                        description: 'Fundamental factor name'
                    }
                },
                includeTradingRecommendation: {
                    name: 'includeTradingRecommendation',
                    description: 'Whether to include trading recommendation in the report',
                    type: 'boolean',
                    required: false,
                    default: true
                },
                maxNewsArticles: {
                    name: 'maxNewsArticles',
                    description: 'Maximum number of news articles to analyze',
                    type: 'number',
                    required: false,
                    default: 10,
                    minValue: 1,
                    maxValue: 30
                },
                includePriceTarget: {
                    name: 'includePriceTarget',
                    description: 'Whether to include price targets in the report',
                    type: 'boolean',
                    required: false,
                    default: true
                }
            }
        };
    }
    
    /**
     * Generates a natural language prompt based on the parameters.
     * @param parameters The parameters for the workflow
     * @returns The natural language prompt
     */
    generatePrompt(parameters: WorkflowParameters): string {
        const validatedParams = this.applyDefaults(parameters);
        
        // Extract key parameters
        const { 
            symbol, 
            timeframe, 
            dataSources, 
            fundamentalFactors, 
            includeTradingRecommendation,
            maxNewsArticles,
            includePriceTarget 
        } = validatedParams;
        
        // Map timeframe to human readable format
        const timeframeMap = {
            short: "short-term (days to weeks)",
            medium: "medium-term (weeks to months)",
            long: "long-term (months to years)"
        };
        const timeframeText = timeframeMap[timeframe as keyof typeof timeframeMap] || "medium-term";
        
        // Build prompt
        let prompt = `Conduct a comprehensive market research analysis for ${symbol} with a ${timeframeText} outlook.`;
        
        // Add data sources
        if (dataSources && dataSources.length > 0) {
            prompt += ` Include analysis from the following data sources: ${dataSources.join(', ')}.`;
        }
        
        // Add fundamental factors
        if (fundamentalFactors && fundamentalFactors.length > 0) {
            prompt += ` Evaluate these fundamental factors: ${fundamentalFactors.join(', ')}.`;
        }
        
        // Add news analysis
        if (dataSources.includes('news')) {
            prompt += ` Analyze the top ${maxNewsArticles} recent news articles related to ${symbol}.`;
        }
        
        // Add trading recommendation
        if (includeTradingRecommendation) {
            prompt += ` Provide a clear trading recommendation based on the analysis.`;
        }
        
        // Add price target
        if (includePriceTarget) {
            prompt += ` Include price targets for different timeframes and confidence levels.`;
        }
        
        // Final instructions
        prompt += ` The report should be comprehensive, well-structured, and provide actionable insights for traders and investors.`;
        
        return prompt;
    }
    
    /**
     * Generates a list of workflow steps based on the parameters.
     * @param parameters The parameters for the workflow
     * @returns The workflow steps
     */
    generateSteps(parameters: WorkflowParameters): WorkflowStep[] {
        const validatedParams = this.applyDefaults(parameters);
        
        // Extract key parameters
        const { 
            symbol, 
            dataSources, 
            maxNewsArticles, 
            includeTradingRecommendation,
            includePriceTarget
        } = validatedParams;
        
        // Define workflow steps
        const steps: WorkflowStep[] = [
            {
                id: 'fetch_market_overview',
                name: 'Fetch Market Overview',
                description: `Get general market data for ${symbol}`,
                tool: 'mcp_search',
                parameters: {
                    query: `cryptocurrency ${symbol} market overview`
                }
            }
        ];
        
        // Add steps based on data sources
        if (dataSources.includes('price')) {
            steps.push({
                id: 'fetch_price_data',
                name: 'Fetch Price Data',
                description: `Fetch historical price data for ${symbol}`,
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'price_history',
                    symbol: symbol,
                    periods: ['1d', '7d', '30d', '90d', '1y']
                },
                dependsOn: ['fetch_market_overview']
            });
        }
        
        if (dataSources.includes('news')) {
            steps.push({
                id: 'fetch_news',
                name: 'Fetch News Articles',
                description: `Fetch recent news articles for ${symbol}`,
                tool: 'mcp_firecrawl_firecrawl_search',
                parameters: {
                    query: `${symbol} cryptocurrency news latest`,
                    limit: maxNewsArticles
                },
                dependsOn: ['fetch_market_overview']
            });
            
            steps.push({
                id: 'analyze_news_sentiment',
                name: 'Analyze News Sentiment',
                description: 'Analyze sentiment from news articles',
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'sentiment_analysis',
                    data: { stepResult: 'fetch_news' }
                },
                dependsOn: ['fetch_news']
            });
        }
        
        if (dataSources.includes('social')) {
            steps.push({
                id: 'fetch_social_data',
                name: 'Fetch Social Media Data',
                description: `Fetch social media mentions and sentiment for ${symbol}`,
                tool: 'mcp_firecrawl_firecrawl_search',
                parameters: {
                    query: `${symbol} crypto twitter reddit sentiment`,
                    limit: 20
                },
                dependsOn: ['fetch_market_overview']
            });
            
            steps.push({
                id: 'analyze_social_sentiment',
                name: 'Analyze Social Sentiment',
                description: 'Analyze sentiment from social media data',
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'sentiment_analysis',
                    data: { stepResult: 'fetch_social_data' }
                },
                dependsOn: ['fetch_social_data']
            });
        }
        
        if (dataSources.includes('onchain')) {
            steps.push({
                id: 'fetch_onchain_data',
                name: 'Fetch On-Chain Data',
                description: `Fetch on-chain metrics for ${symbol}`,
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'onchain_metrics',
                    symbol: symbol,
                    metrics: ['active_addresses', 'transaction_volume', 'whale_movements']
                },
                dependsOn: ['fetch_market_overview']
            });
        }
        
        // Create dependencies for the research step
        const researchDependencies = steps.map(step => step.id).filter(id => id !== 'fetch_market_overview');
        researchDependencies.push('fetch_market_overview');
        
        // Generate comprehensive research report
        steps.push({
            id: 'generate_research_report',
            name: 'Generate Research Report',
            description: `Generate comprehensive market research report for ${symbol}`,
            tool: 'eliza_query',
            parameters: {
                topic: 'market_research',
                prompt: this.generatePrompt(validatedParams)
            },
            dependsOn: researchDependencies
        });
        
        // Add trading recommendation if requested
        if (includeTradingRecommendation) {
            steps.push({
                id: 'generate_trading_recommendation',
                name: 'Generate Trading Recommendation',
                description: `Generate trading recommendation for ${symbol}`,
                tool: 'eliza_query',
                parameters: {
                    topic: 'trading_recommendation',
                    prompt: `Based on the comprehensive market research for ${symbol}, provide a clear trading recommendation with entry points, exit targets, stop loss levels, and risk assessment.`
                },
                dependsOn: ['generate_research_report']
            });
        }
        
        // Add price target prediction if requested
        if (includePriceTarget) {
            steps.push({
                id: 'generate_price_targets',
                name: 'Generate Price Targets',
                description: `Generate price targets for ${symbol}`,
                tool: 'eliza_query',
                parameters: {
                    topic: 'price_prediction',
                    prompt: `Based on the comprehensive market research for ${symbol}, provide price targets for short-term (days to weeks), medium-term (weeks to months), and long-term (months to years) timeframes. Include confidence levels for each prediction and explain your reasoning.`
                },
                dependsOn: ['generate_research_report']
            });
        }
        
        return steps;
    }
    
    /**
     * Processes the results of a workflow execution.
     * @param stepResults The results of each step in the workflow
     * @returns The final output of the workflow
     */
    processResults(stepResults: Record<string, any>): any {
        // Gather data from each step
        const marketOverview = stepResults.fetch_market_overview;
        const researchReport = stepResults.generate_research_report;
        
        // Prepare the sentiment data if available
        const sentiment = {
            news: stepResults.analyze_news_sentiment?.results,
            social: stepResults.analyze_social_sentiment?.results,
            overall: this._calculateOverallSentiment(stepResults)
        };
        
        // Prepare price data if available
        const priceData = stepResults.fetch_price_data?.results;
        
        // Prepare on-chain data if available
        const onchainData = stepResults.fetch_onchain_data?.results;
        
        // Prepare trading recommendation if available
        const tradingRecommendation = stepResults.generate_trading_recommendation?.results;
        
        // Prepare price targets if available
        const priceTargets = stepResults.generate_price_targets?.results;
        
        // Construct final result
        return {
            symbol: marketOverview?.symbol || researchReport?.symbol,
            reportTitle: `Market Research Report for ${marketOverview?.symbol || researchReport?.symbol}`,
            generatedAt: new Date().toISOString(),
            marketOverview: {
                price: marketOverview?.currentPrice,
                marketCap: marketOverview?.marketCap,
                volume24h: marketOverview?.volume24h,
                change24h: marketOverview?.change24h
            },
            sentiment,
            priceData,
            onchainData,
            researchReport: {
                summary: researchReport?.summary,
                analysis: researchReport?.analysis,
                findings: researchReport?.findings,
                catalysts: researchReport?.catalysts,
                risks: researchReport?.risks
            },
            tradingRecommendation,
            priceTargets,
            rawData: {
                news: stepResults.fetch_news,
                social: stepResults.fetch_social_data
            }
        };
    }
    
    /**
     * Calculates the overall sentiment from available sentiment analyses.
     * @param stepResults The step results containing sentiment data
     * @returns The calculated overall sentiment
     */
    private _calculateOverallSentiment(stepResults: Record<string, any>): { score: number; label: string } {
        const newsSentiment = stepResults.analyze_news_sentiment?.results?.score;
        const socialSentiment = stepResults.analyze_social_sentiment?.results?.score;
        
        if (!newsSentiment && !socialSentiment) {
            return { score: 0, label: 'neutral' };
        }
        
        // Calculate weighted average if both are available
        let overallScore = 0;
        let divisor = 0;
        
        if (newsSentiment !== undefined) {
            overallScore += newsSentiment * 0.6; // News weighted at 60%
            divisor += 0.6;
        }
        
        if (socialSentiment !== undefined) {
            overallScore += socialSentiment * 0.4; // Social weighted at 40%
            divisor += 0.4;
        }
        
        const finalScore = divisor > 0 ? overallScore / divisor : 0;
        
        // Convert score to label
        let label = 'neutral';
        if (finalScore >= 0.7) label = 'very positive';
        else if (finalScore >= 0.3) label = 'positive';
        else if (finalScore <= -0.7) label = 'very negative';
        else if (finalScore <= -0.3) label = 'negative';
        
        return { score: finalScore, label };
    }
} 