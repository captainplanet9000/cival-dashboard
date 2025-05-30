/**
 * Machine Learning Model Service
 * Provides an interface for working with ML models for trading strategy optimization
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// ML Model Types
export interface ModelDefinition {
  id: number;
  name: string;
  description: string;
  type: 'classification' | 'regression' | 'time-series' | 'reinforcement' | 'custom';
  framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'custom';
  version: string;
  status: 'training' | 'ready' | 'error' | 'archived';
  metrics: Record<string, any>;
  parameters: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface TrainingConfig {
  datasetId: number;
  hyperparameters: Record<string, any>;
  splitRatio: number;
  features: string[];
  target: string;
  timeColumn?: string; 
  validationMethod: 'cross-validation' | 'train-test-split' | 'time-series-split';
  epochs?: number;
  batchSize?: number;
  callbackUrl?: string;
  saveCheckpoints: boolean;
}

export interface PredictionInput {
  modelId: number;
  data: Array<Record<string, any>>;
  options?: Record<string, any>;
}

export interface PredictionResult {
  predictions: Array<any>;
  probabilities?: Array<Record<string, number>>;
  metadata: {
    modelId: number;
    modelName: string;
    modelVersion: string;
    timestamp: string;
    executionTimeMs: number;
    confidenceScore?: number;
  };
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  auc?: number;
  sharpeRatio?: number;
  sortinoPatio?: number;
  profitFactor?: number;
  maxDrawdown?: number;
  customMetrics?: Record<string, number>;
}

export interface DatasetDefinition {
  id: number;
  name: string;
  description: string;
  source: 'exchange' | 'api' | 'csv' | 'custom';
  format: 'time-series' | 'tabular' | 'text' | 'image';
  size: number;
  rowCount: number;
  columnCount: number;
  schema: Record<string, any>;
  sampleData: Array<Record<string, any>>;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

/**
 * Model Service for managing ML models
 */
export class ModelService {
  /**
   * Get all ML models for the current user
   */
  static async getAllModels(): Promise<ModelDefinition[]> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as ModelDefinition[];
    } catch (error) {
      console.error('Error fetching ML models:', error);
      return [];
    }
  }
  
  /**
   * Get a specific ML model by ID
   */
  static async getModelById(modelId: number): Promise<ModelDefinition | null> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .eq('id', modelId)
        .single();
      
      if (error) throw error;
      
      return data as ModelDefinition;
    } catch (error) {
      console.error('Error fetching ML model:', error);
      return null;
    }
  }
  
  /**
   * Create a new ML model
   */
  static async createModel(
    name: string,
    description: string,
    type: ModelDefinition['type'], 
    framework: ModelDefinition['framework'],
    parameters: Record<string, any> = {}
  ): Promise<ModelDefinition | null> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .insert({
          name,
          description,
          type,
          framework,
          version: '1.0.0',
          status: 'training',
          metrics: {},
          parameters,
          metadata: {}
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data as ModelDefinition;
    } catch (error) {
      console.error('Error creating ML model:', error);
      return null;
    }
  }
  
  /**
   * Update an existing ML model
   */
  static async updateModel(
    modelId: number,
    updates: Partial<Omit<ModelDefinition, 'id' | 'created_at' | 'updated_at' | 'owner_id'>>
  ): Promise<ModelDefinition | null> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('ml_models')
        .update(updates)
        .eq('id', modelId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data as ModelDefinition;
    } catch (error) {
      console.error('Error updating ML model:', error);
      return null;
    }
  }
  
  /**
   * Delete an ML model
   */
  static async deleteModel(modelId: number): Promise<boolean> {
    const supabase = createBrowserClient();
    
    try {
      const { error } = await supabase
        .from('ml_models')
        .delete()
        .eq('id', modelId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting ML model:', error);
      return false;
    }
  }
  
  /**
   * Train a model with the given configuration
   */
  static async trainModel(
    modelId: number,
    config: TrainingConfig
  ): Promise<boolean> {
    // In a real implementation, this would connect to a ML training service
    // For now, we'll simulate by updating the model status
    try {
      // Submit training job to API
      const response = await fetch('/api/ml/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          config
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start model training');
      }
      
      // Update model status
      await this.updateModel(modelId, { status: 'training' });
      
      return true;
    } catch (error) {
      console.error('Error training ML model:', error);
      
      // Update model status to error
      await this.updateModel(modelId, { 
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      return false;
    }
  }
  
  /**
   * Make predictions using a trained model
   */
  static async predict(input: PredictionInput): Promise<PredictionResult | null> {
    try {
      // Make prediction request to API
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        throw new Error('Prediction failed');
      }
      
      const result = await response.json();
      return result as PredictionResult;
    } catch (error) {
      console.error('Error making prediction:', error);
      return null;
    }
  }
  
  /**
   * Get model metrics
   */
  static async getModelMetrics(modelId: number): Promise<ModelMetrics | null> {
    try {
      const model = await this.getModelById(modelId);
      
      if (!model) {
        throw new Error('Model not found');
      }
      
      return model.metrics as ModelMetrics;
    } catch (error) {
      console.error('Error getting model metrics:', error);
      return null;
    }
  }
  
  /**
   * Get all datasets for the current user
   */
  static async getAllDatasets(): Promise<DatasetDefinition[]> {
    const supabase = createBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('ml_datasets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as DatasetDefinition[];
    } catch (error) {
      console.error('Error fetching datasets:', error);
      return [];
    }
  }
  
  /**
   * Create a new dataset from market data
   */
  static async createDatasetFromMarketData(
    name: string,
    description: string,
    symbol: string,
    timeframe: string,
    startDate: string,
    endDate: string,
    features: string[]
  ): Promise<DatasetDefinition | null> {
    try {
      // Submit dataset creation job to API
      const response = await fetch('/api/ml/datasets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          source: 'exchange',
          format: 'time-series',
          symbol,
          timeframe,
          startDate,
          endDate,
          features
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create dataset');
      }
      
      const result = await response.json();
      return result.dataset as DatasetDefinition;
    } catch (error) {
      console.error('Error creating dataset:', error);
      return null;
    }
  }
  
  /**
   * Generate trading signals using a trained model
   */
  static async generateSignals(
    modelId: number,
    symbol: string,
    timeframe: string,
    limit: number = 10
  ): Promise<Array<{
    timestamp: string;
    signal: 'buy' | 'sell' | 'hold';
    probability: number;
    price: number;
  }> | null> {
    try {
      // Get model to check if it's ready
      const model = await this.getModelById(modelId);
      
      if (!model || model.status !== 'ready') {
        throw new Error('Model is not ready for prediction');
      }
      
      // Request signals from API
      const response = await fetch('/api/ml/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          symbol,
          timeframe,
          limit
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate signals');
      }
      
      const result = await response.json();
      return result.signals;
    } catch (error) {
      console.error('Error generating signals:', error);
      return null;
    }
  }
  
  /**
   * Get feature importance for a trained model
   */
  static async getFeatureImportance(modelId: number): Promise<Record<string, number> | null> {
    try {
      // Request feature importance from API
      const response = await fetch(`/api/ml/models/${modelId}/feature-importance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get feature importance');
      }
      
      const result = await response.json();
      return result.featureImportance;
    } catch (error) {
      console.error('Error getting feature importance:', error);
      return null;
    }
  }
  
  /**
   * Optimize a trading strategy using reinforcement learning
   */
  static async optimizeStrategy(
    strategyId: number,
    hyperparameters: Record<string, any>,
    optimizationMetric: 'sharpe_ratio' | 'profit_factor' | 'max_drawdown' | 'total_return'
  ): Promise<{
    optimizedParameters: Record<string, any>;
    metrics: Record<string, number>;
    improvement: number;
  } | null> {
    try {
      // Request strategy optimization from API
      const response = await fetch('/api/ml/optimize-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategyId,
          hyperparameters,
          optimizationMetric
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to optimize strategy');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error optimizing strategy:', error);
      return null;
    }
  }
}
