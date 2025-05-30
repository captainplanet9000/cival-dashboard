/**
 * API route for making predictions with ML models
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
    const { modelId, data, options = {} } = body;
    
    // Validate required fields
    if (!modelId || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check model ownership and status
    const { data: model, error: modelError } = await supabase
      .from('ml_models')
      .select('*')
      .eq('id', modelId)
      .eq('owner_id', user.id)
      .single();
      
    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found or not authorized' }, { status: 404 });
    }
    
    if (model.status !== 'ready') {
      return NextResponse.json({ error: 'Model is not ready for prediction' }, { status: 400 });
    }
    
    // In a real implementation, we would call a ML service to make predictions
    // For now, simulate predictions based on model type
    const predictions = simulatePredictions(model, data, options);
    
    // Store prediction results in the database
    if (options.storePredictions !== false) {
      const symbol = options.symbol || 'UNKNOWN';
      const timeframe = options.timeframe || '1d';
      
      try {
        await supabase
          .from('ml_predictions')
          .insert({
            model_id: modelId,
            symbol,
            timeframe,
            prediction_type: getPredictionType(model),
            prediction_data: {
              input_sample: data.length > 10 ? data.slice(0, 10) : data,
              results: predictions,
              timestamp: new Date().toISOString()
            },
            confidence: predictions.metadata?.confidenceScore || null,
            metadata: {
              execution_time_ms: predictions.metadata?.executionTimeMs,
              options
            }
          });
      } catch (insertError) {
        console.error('Error storing prediction results:', insertError);
        // Continue even if storing fails
      }
    }
    
    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Error in ML predict API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Determine prediction type from model
function getPredictionType(model: any): string {
  if (model.parameters?.task === 'price_prediction') {
    return 'price';
  } else if (model.parameters?.task === 'volatility_prediction') {
    return 'volatility';
  } else if (model.type === 'classification' && model.parameters?.classes?.includes('buy')) {
    return 'signal';
  } else {
    return 'custom';
  }
}

// Simulate predictions based on model type
function simulatePredictions(model: any, data: any[], options: any) {
  const startTime = Date.now();
  
  // For time series models, generate trading signals
  if (model.type === 'time-series' || 
      (model.type === 'classification' && model.parameters?.task === 'signal_generation')) {
    
    const signals = ['buy', 'sell', 'hold'];
    const predictions = data.map((_, i) => {
      // More likely to predict hold
      const rand = Math.random();
      let signal;
      
      if (rand < 0.2) {
        signal = 'buy';
      } else if (rand < 0.35) {
        signal = 'sell';
      } else {
        signal = 'hold';
      }
      
      return signal;
    });
    
    // Generate probabilities
    const probabilities = data.map((_, i) => {
      const buyProb = Math.random() * 0.4;
      const sellProb = Math.random() * 0.4;
      const holdProb = 1 - buyProb - sellProb;
      
      return {
        buy: parseFloat(buyProb.toFixed(4)),
        sell: parseFloat(sellProb.toFixed(4)), 
        hold: parseFloat(holdProb.toFixed(4))
      };
    });
    
    // Calculate confidence as average of highest probability
    const avgConfidence = probabilities.reduce(
      (sum, prob) => sum + Math.max(prob.buy, prob.sell, prob.hold), 
      0
    ) / probabilities.length;
    
    return {
      predictions,
      probabilities,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        modelVersion: model.version,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        confidenceScore: parseFloat(avgConfidence.toFixed(4))
      }
    };
  }
  
  // For regression models, predict numerical values
  else if (model.type === 'regression') {
    const predictions = data.map((_, i) => {
      // Generate a random prediction near the "baseline"
      const baseline = options.baseline || 100;
      const variance = options.variance || baseline * 0.05;
      return parseFloat((baseline + (Math.random() * 2 - 1) * variance).toFixed(4));
    });
    
    return {
      predictions,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        modelVersion: model.version,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }
    };
  }
  
  // For classification models, predict classes
  else if (model.type === 'classification') {
    const classes = model.parameters?.classes || ['class_a', 'class_b', 'class_c'];
    
    const predictions = data.map((_, i) => {
      return classes[Math.floor(Math.random() * classes.length)];
    });
    
    // Generate probabilities
    const probabilities = data.map((_, i) => {
      const probs: Record<string, number> = {};
      let remaining = 1.0;
      
      // Generate random probabilities for each class
      classes.forEach((cls: string, j: number) => {
        if (j === classes.length - 1) {
          probs[cls] = parseFloat(remaining.toFixed(4));
        } else {
          const p = Math.random() * remaining;
          probs[cls] = parseFloat(p.toFixed(4));
          remaining -= p;
        }
      });
      
      return probs;
    });
    
    // Calculate confidence as average of highest probability
    const avgConfidence = probabilities.reduce(
      (sum, prob) => sum + Math.max(...Object.values(prob)), 
      0
    ) / probabilities.length;
    
    return {
      predictions,
      probabilities,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        modelVersion: model.version,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        confidenceScore: parseFloat(avgConfidence.toFixed(4))
      }
    };
  }
  
  // Default for custom models
  else {
    const predictions = data.map((_, i) => {
      return Math.random();
    });
    
    return {
      predictions,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        modelVersion: model.version,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }
    };
  }
}
