/**
 * OpenAI Embeddings integration
 * 
 * This module provides functionality for generating embeddings using OpenAI's models
 */

// OpenAI API Key should be set in environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';
const EMBEDDING_DIMENSION = 1536; // Dimension of text-embedding-ada-002 model

interface EmbeddingResponse {
  data: {
    embedding: number[];
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIEmbeddings {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey = OPENAI_API_KEY, model = OPENAI_EMBEDDING_MODEL) {
    this.apiKey = apiKey || '';
    this.model = model;
    
    if (!this.apiKey) {
      console.warn('OpenAI API Key not set. Embeddings will not work.');
    }
  }
  
  /**
   * Generate an embedding vector for the given text
   * 
   * @param text Text to generate embedding for
   * @returns Float32Array containing the embedding vector
   */
  async generateEmbedding(text: string): Promise<Float32Array> {
    if (!this.apiKey) {
      // Return a zero vector if API key is not set
      return new Float32Array(EMBEDDING_DIMENSION);
    }
    
    try {
      // Call OpenAI API to generate embeddings
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          input: this.prepareText(text),
          model: this.model
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      const result = await response.json() as EmbeddingResponse;
      
      // Convert the embedding array to Float32Array for more efficient storage
      return new Float32Array(result.data[0].embedding);
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a zero vector in case of error
      return new Float32Array(EMBEDDING_DIMENSION);
    }
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   * 
   * @param texts Array of texts to generate embeddings for
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
    if (!this.apiKey || texts.length === 0) {
      return texts.map(() => new Float32Array(EMBEDDING_DIMENSION));
    }
    
    // Process in batches of 20 to avoid rate limits
    const batchSize = 20;
    const results: Float32Array[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }
  
  /**
   * Prepare text for embedding
   * 
   * @param text Text to prepare
   * @returns Prepared text
   */
  private prepareText(text: string): string {
    // Truncate to fit within token limits
    const maxTokens = 8191;
    const approxTokens = text.length / 4; // Rough estimation: ~4 chars per token
    
    if (approxTokens > maxTokens) {
      text = text.substring(0, maxTokens * 4);
    }
    
    return text
      .replace(/\n+/g, ' ')  // Replace multiple newlines with a single space
      .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
      .trim();               // Trim whitespace
  }
  
  /**
   * Calculate cosine similarity between two embedding vectors
   * 
   * @param embedding1 First embedding
   * @param embedding2 Second embedding
   * @returns Similarity score between 0 and 1
   */
  static calculateSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }
} 