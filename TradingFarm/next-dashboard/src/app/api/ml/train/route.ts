/**
 * API route for training ML models
 */
import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { modelId, config } = body;
    
    // Validate required fields
    if (!modelId || !config || !config.datasetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check model ownership
    const { data: model, error: modelError } = await supabase
      .from('ml_models')
      .select('id, type, framework')
      .eq('id', modelId)
      .eq('owner_id', user.id)
      .single();
      
    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found or not authorized' }, { status: 404 });
    }
    
    // Check dataset ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('ml_datasets')
      .select('id, format')
      .eq('id', config.datasetId)
      .eq('owner_id', user.id)
      .single();
      
    if (datasetError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found or not authorized' }, { status: 404 });
    }
    
    // Create training job
    const { data: job, error: jobError } = await supabase
      .from('ml_training_jobs')
      .insert({
        model_id: modelId,
        dataset_id: config.datasetId,
        status: 'pending',
        config: config
      })
      .select()
      .single();
      
    if (jobError) {
      console.error('Error creating training job:', jobError);
      return NextResponse.json({ error: 'Failed to create training job' }, { status: 500 });
    }
    
    // Update model status
    const { error: updateError } = await supabase
      .from('ml_models')
      .update({ status: 'training' })
      .eq('id', modelId);
      
    if (updateError) {
      console.error('Error updating model status:', updateError);
    }
    
    // In a real-world implementation, we would trigger an async training process
    // For now, we'll simulate the process by updating the status after a delay
    simulateTraining(supabase, job.id, modelId, config);
    
    return NextResponse.json({ 
      job: job,
      message: 'Training job created and will be processed in the background' 
    });
  } catch (error) {
    console.error('Error in ML train API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Simulate the training process
async function simulateTraining(supabase: any, jobId: number, modelId: number, config: any) {
  try {
    // Update job to running
    await supabase
      .from('ml_training_jobs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
        logs: ['Training started']
      })
      .eq('id', jobId);
    
    // Simulate training time (5-10 seconds)
    const trainingTime = 5000 + Math.random() * 5000;
    await new Promise(resolve => setTimeout(resolve, trainingTime));
    
    // Generate some fake metrics based on model type
    const metrics: any = {
      training_time_seconds: Math.round(trainingTime / 1000)
    };
    
    // Get model type
    const { data: model } = await supabase
      .from('ml_models')
      .select('type')
      .eq('id', modelId)
      .single();
    
    if (model.type === 'classification') {
      metrics.accuracy = 0.75 + Math.random() * 0.2;
      metrics.precision = 0.7 + Math.random() * 0.25;
      metrics.recall = 0.7 + Math.random() * 0.25;
      metrics.f1_score = 0.7 + Math.random() * 0.25;
    } else if (model.type === 'regression') {
      metrics.mse = Math.random() * 0.1;
      metrics.rmse = Math.sqrt(metrics.mse);
      metrics.mae = Math.random() * 0.08;
      metrics.r2 = 0.7 + Math.random() * 0.25;
    } else if (model.type === 'time-series') {
      metrics.mse = Math.random() * 0.1;
      metrics.rmse = Math.sqrt(metrics.mse);
      metrics.mae = Math.random() * 0.08;
      metrics.sharpe_ratio = 1.5 + Math.random() * 1.5;
      metrics.profit_factor = 1.2 + Math.random() * 1.5;
      metrics.max_drawdown = Math.random() * 0.2;
    }
    
    // Generate fake feature importance
    const numFeatures = config.features?.length || 5;
    const featureImportance: Record<string, number> = {};
    
    if (config.features) {
      for (const feature of config.features) {
        featureImportance[feature] = Math.random();
      }
      
      // Normalize to sum to 1
      const totalImportance = Object.values(featureImportance).reduce((a, b) => a + b, 0);
      for (const feature in featureImportance) {
        featureImportance[feature] /= totalImportance;
      }
    }
    
    // Update job to completed
    await supabase
      .from('ml_training_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        metrics: metrics,
        logs: ['Training started', 'Data preprocessing completed', 'Model training completed', 'Evaluation completed']
      })
      .eq('id', jobId);
    
    // Update model
    await supabase
      .from('ml_models')
      .update({
        status: 'ready',
        metrics: metrics,
        metadata: {
          ...model.metadata,
          feature_importance: featureImportance,
          training_completed_at: new Date().toISOString()
        }
      })
      .eq('id', modelId);
    
    // Create model evaluation record
    await supabase
      .from('ml_model_evaluations')
      .insert({
        model_id: modelId,
        dataset_id: config.datasetId,
        metrics: metrics,
        feature_importance: featureImportance
      });
    
    console.log(`Simulated training completed for model ${modelId}`);
  } catch (error) {
    console.error('Error in simulated training:', error);
    
    // Update job and model to error state
    try {
      await supabase
        .from('ml_training_jobs')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          logs: ['Training started', 'Error occurred during training']
        })
        .eq('id', jobId);
      
      await supabase
        .from('ml_models')
        .update({
          status: 'error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            error_time: new Date().toISOString()
          }
        })
        .eq('id', modelId);
    } catch (updateError) {
      console.error('Error updating failed training status:', updateError);
    }
  }
}
