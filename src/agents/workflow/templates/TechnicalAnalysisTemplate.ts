import { WorkflowTemplate, WorkflowTemplateMetadata, WorkflowParameters, WorkflowStep } from '../WorkflowTemplate';

/**
 * A workflow template for performing technical analysis on market data.
 * This template fetches historical price data, calculates technical indicators,
 * and generates an analysis with insights.
 */
export class TechnicalAnalysisTemplate extends WorkflowTemplate {
    /**
     * Gets the metadata for this workflow template.
     * @returns The template metadata
     */
    getMetadata(): WorkflowTemplateMetadata {
        return {
            id: 'technical_analysis',
            name: 'Technical Analysis',
            description: 'Analyzes price charts and calculates technical indicators to identify trends and patterns',
            version: '1.0.0',
            category: 'market_analysis',
            author: 'Trading Farm',
            tags: ['technical', 'analysis', 'market', 'indicators'],
            parameters: {
                symbol: {
                    name: 'symbol',
                    description: 'Trading symbol (e.g., BTC/USD, ETH/USD)',
                    type: 'string',
                    required: true,
                    pattern: '^[A-Za-z0-9]+(/[A-Za-z0-9]+)?$'
                },
                timeframe: {
                    name: 'timeframe',
                    description: 'Chart timeframe',
                    type: 'string',
                    required: false,
                    default: '1d',
                    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
                },
                period: {
                    name: 'period',
                    description: 'Number of candles to analyze',
                    type: 'number',
                    required: false,
                    default: 100,
                    minValue: 10,
                    maxValue: 1000
                },
                indicators: {
                    name: 'indicators',
                    description: 'Technical indicators to calculate',
                    type: 'array',
                    required: false,
                    default: ['RSI', 'MACD', 'MA', 'BB'],
                    items: {
                        type: 'string',
                        description: 'Indicator name'
                    }
                },
                includeVisualization: {
                    name: 'includeVisualization',
                    description: 'Whether to include chart visualization',
                    type: 'boolean',
                    required: false,
                    default: false
                },
                indicatorSettings: {
                    name: 'indicatorSettings',
                    description: 'Custom settings for indicators',
                    type: 'object',
                    required: false,
                    properties: {
                        rsiPeriod: {
                            name: 'rsiPeriod',
                            description: 'RSI calculation period',
                            type: 'number',
                            required: false,
                            default: 14,
                            minValue: 2,
                            maxValue: 50
                        },
                        macdFast: {
                            name: 'macdFast',
                            description: 'MACD fast period',
                            type: 'number',
                            required: false,
                            default: 12,
                            minValue: 2,
                            maxValue: 50
                        },
                        macdSlow: {
                            name: 'macdSlow',
                            description: 'MACD slow period',
                            type: 'number',
                            required: false,
                            default: 26,
                            minValue: 2,
                            maxValue: 50
                        },
                        macdSignal: {
                            name: 'macdSignal',
                            description: 'MACD signal period',
                            type: 'number',
                            required: false,
                            default: 9,
                            minValue: 2,
                            maxValue: 50
                        },
                        maPeriod: {
                            name: 'maPeriod',
                            description: 'Moving Average period',
                            type: 'number',
                            required: false,
                            default: 20,
                            minValue: 2,
                            maxValue: 200
                        },
                        bbPeriod: {
                            name: 'bbPeriod',
                            description: 'Bollinger Bands period',
                            type: 'number',
                            required: false,
                            default: 20,
                            minValue: 2,
                            maxValue: 100
                        },
                        bbDeviation: {
                            name: 'bbDeviation',
                            description: 'Bollinger Bands standard deviation',
                            type: 'number',
                            required: false,
                            default: 2,
                            minValue: 1,
                            maxValue: 5
                        }
                    }
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
        const { symbol, timeframe, period, indicators } = validatedParams;
        
        // Get indicator settings
        const indicatorSettings = validatedParams.indicatorSettings || {};
        
        // Build prompt
        let prompt = `Perform technical analysis on ${symbol} using ${timeframe} candles for the last ${period} periods.`;
        
        // Add indicators to analyze
        if (indicators && indicators.length > 0) {
            prompt += ` Calculate the following indicators: ${indicators.join(', ')}.`;
        }
        
        // Add custom settings if specified
        const customSettings = [];
        if (indicatorSettings.rsiPeriod && indicators.includes('RSI')) {
            customSettings.push(`RSI period: ${indicatorSettings.rsiPeriod}`);
        }
        if ((indicatorSettings.macdFast || indicatorSettings.macdSlow || indicatorSettings.macdSignal) && indicators.includes('MACD')) {
            customSettings.push(`MACD settings: Fast=${indicatorSettings.macdFast}, Slow=${indicatorSettings.macdSlow}, Signal=${indicatorSettings.macdSignal}`);
        }
        if (indicatorSettings.maPeriod && indicators.includes('MA')) {
            customSettings.push(`MA period: ${indicatorSettings.maPeriod}`);
        }
        if ((indicatorSettings.bbPeriod || indicatorSettings.bbDeviation) && indicators.includes('BB')) {
            customSettings.push(`Bollinger Bands settings: Period=${indicatorSettings.bbPeriod}, Deviation=${indicatorSettings.bbDeviation}`);
        }
        
        if (customSettings.length > 0) {
            prompt += ` Use the following custom settings: ${customSettings.join('; ')}.`;
        }
        
        // Add visualization request if needed
        if (validatedParams.includeVisualization) {
            prompt += ' Generate a chart visualization with the indicators.';
        }
        
        // Add analysis instructions
        prompt += ' Identify key price levels, trend patterns, support and resistance zones, and potential trade setups. Provide a summary of the current market condition and outlook.';
        
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
        const { symbol, timeframe, period, indicators, includeVisualization } = validatedParams;
        const indicatorSettings = validatedParams.indicatorSettings || {};
        
        // Define workflow steps
        const steps: WorkflowStep[] = [
            {
                id: 'fetch_historical_data',
                name: 'Fetch Historical Data',
                description: `Fetch ${period} ${timeframe} candles for ${symbol}`,
                tool: 'mcp_search',
                parameters: {
                    symbol,
                    timeframe,
                    limit: period
                }
            }
        ];
        
        // Add steps for each indicator
        if (indicators && indicators.includes('RSI')) {
            steps.push({
                id: 'calculate_rsi',
                name: 'Calculate RSI',
                description: `Calculate RSI with period ${indicatorSettings.rsiPeriod || 14}`,
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'technical_indicators',
                    indicator: 'RSI',
                    period: indicatorSettings.rsiPeriod || 14
                },
                dependsOn: ['fetch_historical_data']
            });
        }
        
        if (indicators && indicators.includes('MACD')) {
            steps.push({
                id: 'calculate_macd',
                name: 'Calculate MACD',
                description: `Calculate MACD with fast=${indicatorSettings.macdFast || 12}, slow=${indicatorSettings.macdSlow || 26}, signal=${indicatorSettings.macdSignal || 9}`,
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'technical_indicators',
                    indicator: 'MACD',
                    fastPeriod: indicatorSettings.macdFast || 12,
                    slowPeriod: indicatorSettings.macdSlow || 26,
                    signalPeriod: indicatorSettings.macdSignal || 9
                },
                dependsOn: ['fetch_historical_data']
            });
        }
        
        if (indicators && indicators.includes('MA')) {
            steps.push({
                id: 'calculate_ma',
                name: 'Calculate Moving Average',
                description: `Calculate Moving Average with period ${indicatorSettings.maPeriod || 20}`,
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'technical_indicators',
                    indicator: 'MA',
                    period: indicatorSettings.maPeriod || 20
                },
                dependsOn: ['fetch_historical_data']
            });
        }
        
        if (indicators && indicators.includes('BB')) {
            steps.push({
                id: 'calculate_bollinger_bands',
                name: 'Calculate Bollinger Bands',
                description: `Calculate Bollinger Bands with period=${indicatorSettings.bbPeriod || 20}, deviation=${indicatorSettings.bbDeviation || 2}`,
                tool: 'dataCruncher',
                parameters: {
                    analysisType: 'technical_indicators',
                    indicator: 'BB',
                    period: indicatorSettings.bbPeriod || 20,
                    deviation: indicatorSettings.bbDeviation || 2
                },
                dependsOn: ['fetch_historical_data']
            });
        }
        
        // Create dependencies for the analysis step
        const analysisDependencies = steps.map(step => step.id).filter(id => id !== 'fetch_historical_data');
        analysisDependencies.push('fetch_historical_data');
        
        // Add analysis step
        steps.push({
            id: 'analyze_indicators',
            name: 'Analyze Technical Indicators',
            description: 'Analyze calculated indicators to identify patterns and trends',
            tool: 'eliza_query',
            parameters: {
                topic: 'technical_analysis',
                prompt: this.generatePrompt(validatedParams)
            },
            dependsOn: analysisDependencies
        });
        
        // Add visualization step if requested
        if (includeVisualization) {
            steps.push({
                id: 'generate_visualization',
                name: 'Generate Chart Visualization',
                description: 'Create a chart with price and indicators',
                tool: 'chart_generator',
                parameters: {
                    symbol,
                    indicators: indicators || [],
                    period,
                    timeframe
                },
                dependsOn: [...analysisDependencies, 'analyze_indicators']
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
        const historicalData = stepResults.fetch_historical_data;
        const analysisResults = stepResults.analyze_indicators;
        
        // Structure indicators data
        const indicatorData: Record<string, any> = {};
        
        if (stepResults.calculate_rsi) {
            indicatorData.rsi = stepResults.calculate_rsi.results;
        }
        
        if (stepResults.calculate_macd) {
            indicatorData.macd = stepResults.calculate_macd.results;
        }
        
        if (stepResults.calculate_ma) {
            indicatorData.ma = stepResults.calculate_ma.results;
        }
        
        if (stepResults.calculate_bollinger_bands) {
            indicatorData.bollingerBands = stepResults.calculate_bollinger_bands.results;
        }
        
        // Include visualization URL if generated
        const visualization = stepResults.generate_visualization ? 
            stepResults.generate_visualization.chartUrl : undefined;
        
        // Construct final result
        return {
            symbol: historicalData?.symbol,
            timeframe: historicalData?.timeframe,
            period: historicalData?.data?.length,
            lastUpdated: new Date().toISOString(),
            price: {
                current: historicalData?.data?.[historicalData.data.length - 1]?.close,
                open: historicalData?.data?.[historicalData.data.length - 1]?.open,
                high: historicalData?.data?.[historicalData.data.length - 1]?.high,
                low: historicalData?.data?.[historicalData.data.length - 1]?.low,
                volume: historicalData?.data?.[historicalData.data.length - 1]?.volume
            },
            indicators: indicatorData,
            analysis: {
                summary: analysisResults?.summary,
                marketCondition: analysisResults?.marketCondition,
                trend: analysisResults?.trend,
                supportLevels: analysisResults?.supportLevels,
                resistanceLevels: analysisResults?.resistanceLevels,
                patterns: analysisResults?.patterns,
                signals: analysisResults?.signals,
                recommendations: analysisResults?.recommendations
            },
            visualizationUrl: visualization
        };
    }
} 