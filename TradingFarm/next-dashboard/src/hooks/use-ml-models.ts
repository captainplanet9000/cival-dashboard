/**
 * Hook for managing ML models
 */
import { useEffect, useState } from 'react';
import { ModelDefinition, ModelService } from '@/services/ml/model-service';

export function useMlModels() {
  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Option 1: Use the service directly
      const fetchedModels = await ModelService.getAllModels();
      setModels(fetchedModels);
      
      // Option 2: Use the API endpoint
      // const response = await fetch('/api/ml/models');
      // if (!response.ok) {
      //   throw new Error('Failed to fetch models');
      // }
      // const data = await response.json();
      // setModels(data.models);
    } catch (err) {
      console.error('Error fetching ML models:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const createModel = async (
    name: string,
    description: string,
    type: ModelDefinition['type'],
    framework: ModelDefinition['framework'],
    parameters: Record<string, any> = {}
  ): Promise<ModelDefinition | null> => {
    try {
      setError(null);
      
      // Option 1: Use the service directly
      const model = await ModelService.createModel(
        name,
        description,
        type,
        framework,
        parameters
      );
      
      if (model) {
        setModels(prevModels => [...prevModels, model]);
      }
      
      return model;
      
      // Option 2: Use the API endpoint
      // const response = await fetch('/api/ml/models', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     name,
      //     description,
      //     type,
      //     framework,
      //     parameters,
      //   }),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to create model');
      // }
      // 
      // const data = await response.json();
      // setModels(prevModels => [...prevModels, data.model]);
      // return data.model;
    } catch (err) {
      console.error('Error creating ML model:', err);
      setError(err instanceof Error ? err.message : 'Failed to create model');
      return null;
    }
  };

  const updateModel = async (
    modelId: number,
    updates: Partial<Omit<ModelDefinition, 'id' | 'created_at' | 'updated_at' | 'owner_id'>>
  ): Promise<ModelDefinition | null> => {
    try {
      setError(null);
      
      // Option 1: Use the service directly
      const model = await ModelService.updateModel(modelId, updates);
      
      if (model) {
        setModels(prevModels => 
          prevModels.map(m => m.id === modelId ? model : m)
        );
      }
      
      return model;
      
      // Option 2: Use the API endpoint
      // const response = await fetch(`/api/ml/models/${modelId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(updates),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to update model');
      // }
      // 
      // const data = await response.json();
      // setModels(prevModels => 
      //   prevModels.map(m => m.id === modelId ? data.model : m)
      // );
      // return data.model;
    } catch (err) {
      console.error('Error updating ML model:', err);
      setError(err instanceof Error ? err.message : 'Failed to update model');
      return null;
    }
  };

  const deleteModel = async (modelId: number): Promise<boolean> => {
    try {
      setError(null);
      
      // Option 1: Use the service directly
      const success = await ModelService.deleteModel(modelId);
      
      if (success) {
        setModels(prevModels => prevModels.filter(m => m.id !== modelId));
      }
      
      return success;
      
      // Option 2: Use the API endpoint
      // const response = await fetch(`/api/ml/models/${modelId}`, {
      //   method: 'DELETE',
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to delete model');
      // }
      // 
      // setModels(prevModels => prevModels.filter(m => m.id !== modelId));
      // return true;
    } catch (err) {
      console.error('Error deleting ML model:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete model');
      return false;
    }
  };

  const trainModel = async (
    modelId: number,
    config: {
      datasetId: number;
      hyperparameters?: Record<string, any>;
      splitRatio?: number;
      features?: string[];
      target?: string;
      timeColumn?: string;
      validationMethod?: 'cross-validation' | 'train-test-split' | 'time-series-split';
      epochs?: number;
      batchSize?: number;
    }
  ): Promise<boolean> => {
    try {
      setError(null);
      
      // Option 1: Use the service directly
      const success = await ModelService.trainModel(modelId, config);
      
      if (success) {
        // Update model status to training
        setModels(prevModels => 
          prevModels.map(m => m.id === modelId ? { ...m, status: 'training' } : m)
        );
      }
      
      return success;
      
      // Option 2: Use the API endpoint
      // const response = await fetch('/api/ml/train', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     modelId,
      //     config,
      //   }),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to train model');
      // }
      // 
      // // Update model status to training
      // setModels(prevModels => 
      //   prevModels.map(m => m.id === modelId ? { ...m, status: 'training' } : m)
      // );
      // 
      // return true;
    } catch (err) {
      console.error('Error training ML model:', err);
      setError(err instanceof Error ? err.message : 'Failed to train model');
      return false;
    }
  };

  return {
    models,
    loading,
    error,
    refreshModels: fetchModels,
    createModel,
    updateModel,
    deleteModel,
    trainModel,
  };
}
