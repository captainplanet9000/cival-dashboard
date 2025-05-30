-- Migration for AI Trading and Advanced Analytics Features

-- Create table for AI prediction models
CREATE TABLE public.ai_prediction_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  training_status TEXT NOT NULL DEFAULT 'pending',
  last_trained_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security for prediction models
ALTER TABLE public.ai_prediction_models ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prediction models
CREATE POLICY "Users can view all AI prediction models"
  ON public.ai_prediction_models
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own AI prediction models"
  ON public.ai_prediction_models
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own AI prediction models"
  ON public.ai_prediction_models
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own AI prediction models"
  ON public.ai_prediction_models
  FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger for updated_at on prediction models
CREATE TRIGGER handle_updated_at_ai_prediction_models
  BEFORE UPDATE ON public.ai_prediction_models
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for market predictions
CREATE TABLE public.market_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES public.ai_prediction_models(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  prediction_value NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL,
  features_used JSONB,
  prediction_time TIMESTAMP WITH TIME ZONE NOT NULL,
  target_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_value NUMERIC,
  accuracy NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for market predictions
ALTER TABLE public.market_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for market predictions
CREATE POLICY "Users can view all market predictions"
  ON public.market_predictions
  FOR SELECT
  USING (true);

-- Create table for sentiment analysis
CREATE TABLE public.market_sentiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  source TEXT NOT NULL,
  sentiment_score NUMERIC NOT NULL,
  sentiment_magnitude NUMERIC NOT NULL,
  article_count INTEGER,
  social_mentions INTEGER,
  time_period TEXT NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for sentiment analysis
ALTER TABLE public.market_sentiment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sentiment analysis
CREATE POLICY "Users can view all market sentiment data"
  ON public.market_sentiment
  FOR SELECT
  USING (true);

-- Create table for AI trading signals
CREATE TABLE public.ai_trading_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES public.ai_prediction_models(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  strength NUMERIC NOT NULL,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  risk_reward_ratio NUMERIC,
  confidence_score NUMERIC NOT NULL,
  features JSONB,
  chart_pattern TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for AI trading signals
ALTER TABLE public.ai_trading_signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for AI trading signals
CREATE POLICY "Users can view all AI trading signals"
  ON public.ai_trading_signals
  FOR SELECT
  USING (true);

-- Trigger for updated_at on AI trading signals
CREATE TRIGGER handle_updated_at_ai_trading_signals
  BEFORE UPDATE ON public.ai_trading_signals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for advanced analytics settings
CREATE TABLE public.advanced_analytics_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics_displayed JSONB NOT NULL DEFAULT '[]',
  default_timeframe TEXT NOT NULL DEFAULT 'day',
  chart_preferences JSONB NOT NULL DEFAULT '{}',
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable Row Level Security for advanced analytics settings
ALTER TABLE public.advanced_analytics_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for advanced analytics settings
CREATE POLICY "Users can view their own analytics settings"
  ON public.advanced_analytics_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics settings"
  ON public.advanced_analytics_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics settings"
  ON public.advanced_analytics_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on advanced analytics settings
CREATE TRIGGER handle_updated_at_advanced_analytics_settings
  BEFORE UPDATE ON public.advanced_analytics_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create function to calculate prediction accuracy
CREATE OR REPLACE FUNCTION public.calculate_prediction_accuracy()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Calculate accuracy as a percentage
  IF NEW.actual_value IS NOT NULL AND NEW.prediction_value IS NOT NULL THEN
    -- For directional predictions (up/down)
    IF NEW.prediction_type = 'direction' THEN
      IF (NEW.prediction_value > 0 AND NEW.actual_value > 0) OR
         (NEW.prediction_value < 0 AND NEW.actual_value < 0) THEN
        NEW.accuracy := 100.0; -- Correct direction
      ELSE
        NEW.accuracy := 0.0; -- Incorrect direction
      END IF;
    -- For price predictions, calculate percentage accuracy
    ELSIF NEW.prediction_type = 'price' THEN
      -- Calculate error percentage
      NEW.accuracy := 100.0 - (ABS(NEW.actual_value - NEW.prediction_value) / NEW.actual_value) * 100.0;
      -- Cap accuracy at 100%
      NEW.accuracy := LEAST(NEW.accuracy, 100.0);
      -- Floor accuracy at 0%
      NEW.accuracy := GREATEST(NEW.accuracy, 0.0);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update prediction accuracy when actual value is added
CREATE TRIGGER update_prediction_accuracy_trigger
  BEFORE UPDATE ON public.market_predictions
  FOR EACH ROW
  WHEN (OLD.actual_value IS NULL AND NEW.actual_value IS NOT NULL)
  EXECUTE PROCEDURE public.calculate_prediction_accuracy();

-- Create function to get recent market prediction accuracy
CREATE OR REPLACE FUNCTION public.get_model_accuracy(
  p_model_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  prediction_type TEXT,
  average_accuracy NUMERIC,
  prediction_count INTEGER
)
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.prediction_type,
    AVG(mp.accuracy) AS average_accuracy,
    COUNT(mp.id) AS prediction_count
  FROM 
    public.market_predictions mp
  WHERE 
    mp.model_id = p_model_id
    AND mp.actual_value IS NOT NULL
    AND mp.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY 
    mp.prediction_type;
END;
$$ LANGUAGE plpgsql;
