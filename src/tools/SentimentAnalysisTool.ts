import { 
    AgentTool, 
    ToolDefinition, 
    ToolParameterDefinition 
} from "@/types/agentTypes";

/**
 * Defines the structure for the sentiment analysis tool's parameters.
 */
const sentimentAnalysisParameters: { [key: string]: ToolParameterDefinition } = {
    text: {
        type: 'string',
        description: 'The text to analyze for sentiment',
        required: false
    },
    texts: {
        type: 'array',
        description: 'Array of texts to analyze in batch mode',
        required: false,
        items: {
            type: 'string',
            description: 'Text item for batch analysis'
        }
    },
    source: {
        type: 'string',
        description: 'Source of the text (e.g., "news", "social", "report")',
        required: false
    },
    language: {
        type: 'string',
        description: 'Language of the text (default: "en")',
        required: false
    },
    modelProvider: {
        type: 'string',
        description: 'AI model provider to use for analysis (default: "internal")',
        required: false
    }
};

/**
 * Defines the sentiment analysis tool.
 */
const sentimentAnalysisToolDefinition: ToolDefinition = {
    name: "sentimentAnalyzer",
    description: "Analyzes text to determine sentiment, emotion, and key themes",
    parameters: sentimentAnalysisParameters
};

/**
 * Interface for sentiment analysis result
 */
export interface SentimentResult {
    score: number;            // -1.0 to 1.0 score (negative to positive)
    label: string;            // 'negative', 'neutral', 'positive'
    confidence: number;       // 0.0 to 1.0 confidence in the assessment
    emotions?: {              // Optional detailed emotion analysis
        joy?: number;
        sadness?: number;
        fear?: number;
        disgust?: number;
        anger?: number;
        surprise?: number;
        trust?: number;
    };
    keywords?: string[];      // Optional list of key sentiment-driving words
    themes?: string[];        // Optional list of detected themes
    language?: string;        // Detected language
}

/**
 * A tool implementation for performing sentiment analysis on text.
 */
export class SentimentAnalysisTool implements AgentTool {
    definition: ToolDefinition = sentimentAnalysisToolDefinition;

    /**
     * Executes sentiment analysis on the provided text.
     * @param args Tool parameters including text to analyze
     * @returns Analysis results with sentiment scores and insights
     */
    async execute(args: { 
        text?: string; 
        texts?: string[]; 
        source?: string;
        language?: string;
        modelProvider?: string;
    }): Promise<SentimentResult | SentimentResult[]> {
        // Validate input - we need either text or texts
        if (!args.text && (!args.texts || args.texts.length === 0)) {
            throw new Error("Either 'text' or 'texts' parameter is required for sentiment analysis");
        }

        // If we have multiple texts, use batch mode
        if (args.texts && args.texts.length > 0) {
            return this.analyzeBatch(args.texts, args.source, args.language, args.modelProvider);
        }

        // Single text analysis
        return this.analyzeText(args.text || "", args.source, args.language, args.modelProvider);
    }

    /**
     * Analyzes a single text for sentiment.
     * @param text The text to analyze
     * @param source Optional source of the text
     * @param language Optional language code
     * @param modelProvider Optional model provider override
     * @returns Sentiment analysis result
     */
    private async analyzeText(
        text: string, 
        source?: string, 
        language?: string,
        modelProvider?: string
    ): Promise<SentimentResult> {
        console.log(`[SentimentAnalyzer] Analyzing text from source: ${source || 'unknown'}`);
        
        // TEMPORARY IMPLEMENTATION - PLACEHOLDER FOR REAL SENTIMENT API
        // In a production environment, this would call a sentiment analysis API
        // or use a machine learning model
        
        // Simulate analysis with a basic algorithm
        const result = this.simulateSentimentAnalysis(text);
        
        // Add source context if available
        if (source) {
            // Adjust scores based on source context
            // For example, social media might have different sentiment distribution
            // than formal financial reports
            if (source === 'social') {
                result.confidence -= 0.1; // Lower confidence for social media
            } else if (source === 'news') {
                result.confidence += 0.05; // Slightly higher confidence for news
            }
        }
        
        console.log(`[SentimentAnalyzer] Analysis complete. Score: ${result.score}, Label: ${result.label}`);
        return result;
    }

    /**
     * Analyzes multiple texts in batch mode.
     * @param texts Array of texts to analyze
     * @param source Optional source of the texts
     * @param language Optional language code
     * @param modelProvider Optional model provider override
     * @returns Array of sentiment analysis results
     */
    private async analyzeBatch(
        texts: string[],
        source?: string,
        language?: string,
        modelProvider?: string
    ): Promise<SentimentResult[]> {
        console.log(`[SentimentAnalyzer] Batch analyzing ${texts.length} texts from source: ${source || 'unknown'}`);
        
        // Process each text and return results
        const results = texts.map(text => this.simulateSentimentAnalysis(text));
        
        console.log(`[SentimentAnalyzer] Batch analysis complete for ${texts.length} texts`);
        return results;
    }

    /**
     * Simulates sentiment analysis with a basic algorithm.
     * This is a placeholder for a real sentiment analysis API or model.
     * @param text The text to analyze
     * @returns Simulated sentiment analysis result
     */
    private simulateSentimentAnalysis(text: string): SentimentResult {
        // Simple word-based sentiment detection
        const positiveWords = [
            'bullish', 'gain', 'profit', 'up', 'rise', 'rising', 'grew', 'growth',
            'positive', 'optimistic', 'opportunity', 'advantages', 'succeed', 'success',
            'good', 'great', 'excellent', 'boost', 'improving', 'improved', 'recovery',
            'strong', 'strength', 'rally', 'outperform', 'beat', 'exceeded', 'momentum'
        ];
        
        const negativeWords = [
            'bearish', 'loss', 'down', 'fall', 'falling', 'dropped', 'decline',
            'negative', 'pessimistic', 'risk', 'disadvantages', 'fail', 'failure',
            'bad', 'poor', 'terrible', 'weak', 'weakness', 'crash', 'underperform',
            'miss', 'missed', 'warning', 'danger', 'problem', 'trouble', 'crisis'
        ];
        
        // Normalize text for analysis
        const normalizedText = text.toLowerCase();
        
        // Count positive and negative words
        let positiveCount = 0;
        let negativeCount = 0;
        let foundKeywords: string[] = [];
        
        positiveWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = normalizedText.match(regex);
            if (matches) {
                positiveCount += matches.length;
                foundKeywords.push(word);
            }
        });
        
        negativeWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = normalizedText.match(regex);
            if (matches) {
                negativeCount += matches.length;
                foundKeywords.push(word);
            }
        });
        
        // Calculate sentiment score (-1.0 to 1.0)
        let score = 0;
        const totalSentimentWords = positiveCount + negativeCount;
        
        if (totalSentimentWords > 0) {
            score = (positiveCount - negativeCount) / totalSentimentWords;
        }
        
        // Determine confidence based on number of sentiment words found
        // More sentiment words = higher confidence, up to a maximum
        const wordCount = text.split(/\s+/).length;
        const sentimentDensity = totalSentimentWords / wordCount;
        let confidence = Math.min(0.7, 0.3 + sentimentDensity * 2);
        
        // If very few sentiment words, lower confidence
        if (totalSentimentWords < 3) {
            confidence = Math.max(0.3, confidence - 0.2);
        }
        
        // Determine sentiment label
        let label = 'neutral';
        if (score >= 0.2) label = 'positive';
        if (score >= 0.6) label = 'very positive';
        if (score <= -0.2) label = 'negative';
        if (score <= -0.6) label = 'very negative';
        
        // Detect themes based on keyword frequencies
        // In a real implementation, this would use more sophisticated
        // topic modeling or theme detection
        const themes = this.detectThemes(text);
        
        return {
            score,
            label,
            confidence,
            keywords: foundKeywords.slice(0, 10), // Limit to top 10 keywords
            themes,
            language: 'en', // Default to English
            emotions: {
                joy: Math.max(0, Math.min(1, (score > 0) ? score * 0.8 : 0)),
                sadness: Math.max(0, Math.min(1, (score < 0) ? -score * 0.7 : 0)),
                fear: Math.max(0, Math.min(1, (score < -0.3) ? -score * 0.5 : 0)),
                trust: Math.max(0, Math.min(1, (score > 0.3) ? score * 0.6 : 0))
            }
        };
    }

    /**
     * Detects themes in text. This is a placeholder for more sophisticated analysis.
     * @param text The text to analyze
     * @returns Array of detected themes
     */
    private detectThemes(text: string): string[] {
        const themes: string[] = [];
        const normalizedText = text.toLowerCase();
        
        // Simple keyword-based theme detection
        const themeKeywords = {
            'price movement': ['price', 'value', 'worth', 'cost', 'dollar', 'market price'],
            'market trends': ['trend', 'market', 'pattern', 'direction', 'cycle'],
            'financial performance': ['revenue', 'earnings', 'profit', 'loss', 'margin', 'financial'],
            'regulation': ['regulation', 'compliance', 'legal', 'law', 'government', 'policy'],
            'adoption': ['adoption', 'use case', 'mainstream', 'acceptance', 'integration'],
            'technology': ['technology', 'blockchain', 'protocol', 'algorithm', 'software'],
            'competition': ['competitor', 'competition', 'rival', 'alternative', 'versus'],
            'partnership': ['partner', 'collaboration', 'alliance', 'joint', 'agreement']
        };
        
        // Check for theme keywords in text
        Object.entries(themeKeywords).forEach(([theme, keywords]) => {
            for (const keyword of keywords) {
                if (normalizedText.includes(keyword)) {
                    themes.push(theme);
                    break; // Found one keyword for this theme, no need to check more
                }
            }
        });
        
        return themes;
    }
} 