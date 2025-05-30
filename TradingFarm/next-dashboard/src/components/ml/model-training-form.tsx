/**
 * Model Training Form Component
 */
import { useState, useEffect } from "react";
import { ModelDefinition } from "@/services/ml/model-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useMlModels } from "@/hooks/use-ml-models";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Dataset {
  id: number;
  name: string;
  description: string;
  format: string;
  rowCount: number;
  columnCount: number;
  schema: Record<string, any>;
}

interface ModelTrainingFormProps {
  model: ModelDefinition;
  onTrainingStarted: () => void;
  disabled?: boolean;
}

export default function ModelTrainingForm({ 
  model, 
  onTrainingStarted, 
  disabled = false 
}: ModelTrainingFormProps) {
  const { trainModel } = useMlModels();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  
  // Form state
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.7);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [targetFeature, setTargetFeature] = useState<string>("");
  const [validationMethod, setValidationMethod] = useState<'cross-validation' | 'train-test-split' | 'time-series-split'>(
    model.type === 'time-series' ? 'time-series-split' : 'train-test-split'
  );
  const [epochs, setEpochs] = useState(100);
  const [batchSize, setBatchSize] = useState(32);
  const [timeColumn, setTimeColumn] = useState<string>("");
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // Hyperparameters based on model type
  const [learningRate, setLearningRate] = useState(0.001);
  const [dropout, setDropout] = useState(0.2);
  const [hiddenLayers, setHiddenLayers] = useState(2);
  const [nodesPerLayer, setNodesPerLayer] = useState(64);
  
  // Fetch available datasets
  useEffect(() => {
    async function fetchDatasets() {
      try {
        setDatasetsLoading(true);
        
        // In a real application, call the API to get available datasets
        // For now, mock some datasets based on model type
        const mockedDatasets: Dataset[] = [
          {
            id: 1,
            name: "BTCUSDT Daily Price Data",
            description: "Bitcoin historical prices and indicators",
            format: "time-series",
            rowCount: 1024,
            columnCount: 15,
            schema: {
              timestamp: "datetime",
              open: "float",
              high: "float",
              low: "float",
              close: "float",
              volume: "float",
              rsi_14: "float",
              macd_12_26_9: "float",
              signal_9: "float",
              bb_upper_20_2: "float",
              bb_middle_20_2: "float",
              bb_lower_20_2: "float",
              returns_1d: "float",
              volatility_14d: "float",
              label: "category"
            }
          },
          {
            id: 2,
            name: "ETHUSDT Hourly Data",
            description: "Ethereum hourly OHLCV and technical indicators",
            format: "time-series",
            rowCount: 8760,
            columnCount: 12,
            schema: {
              timestamp: "datetime",
              open: "float",
              high: "float",
              low: "float",
              close: "float",
              volume: "float",
              rsi_14: "float",
              macd_12_26_9: "float",
              signal_9: "float",
              ema_9: "float",
              ema_21: "float",
              label: "category"
            }
          },
          {
            id: 3,
            name: "Stocks Fundamental Data",
            description: "Fundamental data for S&P 500 companies",
            format: "tabular",
            rowCount: 500,
            columnCount: 20,
            schema: {
              ticker: "string",
              sector: "category",
              pe_ratio: "float",
              pb_ratio: "float",
              dividend_yield: "float",
              market_cap: "float",
              revenue_growth: "float",
              profit_margin: "float",
              debt_to_equity: "float",
              roi: "float",
              target: "float"
            }
          }
        ];
        
        setDatasets(mockedDatasets);
      } catch (error) {
        console.error("Error fetching datasets:", error);
        toast({
          title: "Error",
          description: "Failed to fetch available datasets",
          variant: "destructive",
        });
      } finally {
        setDatasetsLoading(false);
      }
    }
    
    fetchDatasets();
  }, [toast]);
  
  // Update selected dataset when id changes
  useEffect(() => {
    if (selectedDatasetId) {
      const dataset = datasets.find(d => d.id === selectedDatasetId);
      setSelectedDataset(dataset || null);
      
      // Reset features when dataset changes
      if (dataset) {
        const features = Object.keys(dataset.schema).filter(f => f !== 'label');
        setSelectedFeatures(features);
        
        // Try to guess the target feature
        if (model.type === 'classification') {
          setTargetFeature('label');
        } else if (model.type === 'regression' || model.type === 'time-series') {
          setTargetFeature('close');
        }
        
        // Try to guess the time column for time series
        if (dataset.schema.timestamp) {
          setTimeColumn('timestamp');
        } else if (dataset.schema.date) {
          setTimeColumn('date');
        }
      }
    }
  }, [selectedDatasetId, datasets, model.type]);
  
  const handleSubmit = async () => {
    if (!selectedDatasetId) {
      toast({
        title: "Validation Error",
        description: "Please select a dataset",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedFeatures.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one feature",
        variant: "destructive",
      });
      return;
    }
    
    if (!targetFeature) {
      toast({
        title: "Validation Error",
        description: "Please select a target feature",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Build training configuration
      const hyperparameters: Record<string, any> = {
        learning_rate: learningRate,
        dropout_rate: dropout,
      };
      
      // Add model-specific hyperparameters
      if (advancedMode) {
        hyperparameters.hidden_layers = hiddenLayers;
        hyperparameters.nodes_per_layer = nodesPerLayer;
        
        if (model.type === 'time-series') {
          hyperparameters.sequence_length = model.parameters?.sequence_length || 30;
          hyperparameters.prediction_horizon = model.parameters?.prediction_horizon || 5;
        }
      }
      
      const trainingConfig = {
        datasetId: selectedDatasetId,
        hyperparameters,
        splitRatio,
        features: selectedFeatures,
        target: targetFeature,
        validationMethod,
        epochs,
        batchSize,
        saveCheckpoints: true,
      };
      
      // Add time column for time series models
      if (model.type === 'time-series' && timeColumn) {
        Object.assign(trainingConfig, { timeColumn });
      }
      
      const success = await trainModel(model.id, trainingConfig);
      
      if (success) {
        toast({
          title: "Training Started",
          description: "The model training has been started successfully.",
        });
        
        // Notify parent component
        onTrainingStarted();
      } else {
        toast({
          title: "Error",
          description: "Failed to start model training. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting training:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (datasetsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (datasets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No datasets available for training. Please create a dataset first.
        </p>
        <Button>Create Dataset</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="dataset">Select Dataset</Label>
        <Select 
          value={selectedDatasetId?.toString() || ""} 
          onValueChange={(value) => setSelectedDatasetId(Number(value))}
          disabled={disabled || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map(dataset => (
              <SelectItem key={dataset.id} value={dataset.id.toString()}>
                {dataset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedDataset && (
          <p className="text-sm text-muted-foreground">
            {selectedDataset.description} • {selectedDataset.rowCount.toLocaleString()} rows • {selectedDataset.columnCount} columns
          </p>
        )}
      </div>
      
      {selectedDataset && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="features">Features & Target</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="advanced-mode"
                  checked={advancedMode}
                  onCheckedChange={setAdvancedMode}
                  disabled={disabled || loading}
                />
                <Label htmlFor="advanced-mode">Advanced Mode</Label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Feature</Label>
                <Select 
                  value={targetFeature} 
                  onValueChange={setTargetFeature}
                  disabled={disabled || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(selectedDataset.schema).map(feature => (
                      <SelectItem key={feature} value={feature}>
                        {feature}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {model.type === 'time-series' && (
                <div className="space-y-2">
                  <Label>Time Column</Label>
                  <Select 
                    value={timeColumn} 
                    onValueChange={setTimeColumn}
                    disabled={disabled || loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time column" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(selectedDataset.schema).map(feature => (
                        <SelectItem key={feature} value={feature}>
                          {feature}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Input Features</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.keys(selectedDataset.schema)
                  .filter(feature => feature !== targetFeature)
                  .map(feature => (
                    <div key={feature} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`feature-${feature}`}
                        checked={selectedFeatures.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFeatures([...selectedFeatures, feature]);
                          } else {
                            setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                          }
                        }}
                        disabled={disabled || loading || feature === timeColumn}
                        className="rounded"
                      />
                      <Label 
                        htmlFor={`feature-${feature}`}
                        className={`text-sm ${feature === timeColumn ? "text-muted-foreground" : ""}`}
                      >
                        {feature}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Label>Training Configuration</Label>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Train/Test Split Ratio: {(splitRatio * 100).toFixed(0)}%</Label>
                  <span className="text-sm text-muted-foreground">
                    {(splitRatio * 100).toFixed(0)}% train, {((1 - splitRatio) * 100).toFixed(0)}% test
                  </span>
                </div>
                <Slider 
                  value={[splitRatio * 100]} 
                  min={50} 
                  max={90} 
                  step={5}
                  onValueChange={(values) => setSplitRatio(values[0] / 100)}
                  disabled={disabled || loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Validation Method</Label>
                <RadioGroup 
                  value={validationMethod}
                  onValueChange={(value) => setValidationMethod(value as any)}
                  disabled={disabled || loading}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="train-test-split" id="train-test-split" />
                    <Label htmlFor="train-test-split">Simple Train/Test Split</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cross-validation" id="cross-validation" />
                    <Label htmlFor="cross-validation">K-Fold Cross-Validation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="time-series-split" id="time-series-split" />
                    <Label htmlFor="time-series-split">Time Series Split</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {advancedMode && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium">Advanced Parameters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Epochs: {epochs}</Label>
                    <Slider 
                      value={[epochs]} 
                      min={10} 
                      max={500} 
                      step={10}
                      onValueChange={(values) => setEpochs(values[0])}
                      disabled={disabled || loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Batch Size: {batchSize}</Label>
                    <Slider 
                      value={[batchSize]} 
                      min={8} 
                      max={128} 
                      step={8}
                      onValueChange={(values) => setBatchSize(values[0])}
                      disabled={disabled || loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Learning Rate: {learningRate}</Label>
                    <Slider 
                      value={[Math.log10(learningRate) * 1000]} 
                      min={-5000} 
                      max={-2000} 
                      step={100}
                      onValueChange={(values) => setLearningRate(Math.pow(10, values[0] / 1000))}
                      disabled={disabled || loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Dropout Rate: {dropout.toFixed(2)}</Label>
                    <Slider 
                      value={[dropout * 100]} 
                      min={0} 
                      max={50} 
                      step={5}
                      onValueChange={(values) => setDropout(values[0] / 100)}
                      disabled={disabled || loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Hidden Layers: {hiddenLayers}</Label>
                    <Slider 
                      value={[hiddenLayers]} 
                      min={1} 
                      max={5} 
                      step={1}
                      onValueChange={(values) => setHiddenLayers(values[0])}
                      disabled={disabled || loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nodes Per Layer: {nodesPerLayer}</Label>
                    <Slider 
                      value={[nodesPerLayer]} 
                      min={16} 
                      max={256} 
                      step={16}
                      onValueChange={(values) => setNodesPerLayer(values[0])}
                      disabled={disabled || loading}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={disabled || loading || !selectedDatasetId || selectedFeatures.length === 0 || !targetFeature}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Training...
                </>
              ) : (
                "Start Training"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
