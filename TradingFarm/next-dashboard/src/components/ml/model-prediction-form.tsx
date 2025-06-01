/**
 * Model Prediction Form Component
 */
import { useState, useEffect } from "react";
import { ModelDefinition, PredictionInput } from "@/services/ml/model-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileUpIcon, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModelPredictionFormProps {
  model: ModelDefinition;
  disabled?: boolean;
}

export default function ModelPredictionForm({ 
  model, 
  disabled = false 
}: ModelPredictionFormProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [symbolOptions, setSymbolOptions] = useState<string[]>([
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'BNBUSDT', 
    'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT'
  ]);
  const [timeframeOptions, setTimeframeOptions] = useState<string[]>([
    '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
  ]);
  
  // Form state
  const [predictionType, setPredictionType] = useState<string>("symbol");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("");
  const [limit, setLimit] = useState<number>(10);
  const [customData, setCustomData] = useState<string>("");
  const [includeHistory, setIncludeHistory] = useState<boolean>(true);
  const [storeResults, setStoreResults] = useState<boolean>(true);
  const [lookbackPeriod, setLookbackPeriod] = useState<number>(30);
  
  // Prediction results
  const [predictions, setPredictions] = useState<any>(null);
  
  // Set default values based on model type
  useEffect(() => {
    if (model.type === 'time-series' || model.parameters?.task === 'signal_generation') {
      setPredictionType("symbol");
      setSelectedSymbol("BTCUSDT");
      setSelectedTimeframe("1h");
    } else {
      setPredictionType("custom");
    }
  }, [model]);
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setCustomData("");
      
      // Validate inputs
      if (predictionType === "symbol" && (!selectedSymbol || !selectedTimeframe)) {
        toast({
          title: "Validation Error",
          description: "Please select both symbol and timeframe",
          variant: "destructive",
        });
        return;
      }
      
      if (predictionType === "custom" && !customData.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter custom data for prediction",
          variant: "destructive",
        });
        return;
      }
      
      // Prepare input data
      let inputData: PredictionInput;
      let data = [];
      
      if (predictionType === "symbol") {
        // In a real app, we would fetch the latest market data here
        // For this example, we'll simulate the data
        
        // Generate simulated market data
        for (let i = 0; i < lookbackPeriod; i++) {
          const basePrice = selectedSymbol === 'BTCUSDT' ? 35000 : 
                           selectedSymbol === 'ETHUSDT' ? 2000 : 
                           selectedSymbol === 'SOLUSDT' ? 100 : 50;
          
          const timestamp = new Date();
          timestamp.setHours(timestamp.getHours() - (lookbackPeriod - i));
          
          const randomFactor = 0.98 + Math.random() * 0.04; // Random value between 0.98 and 1.02
          const open = basePrice * randomFactor;
          const high = open * (1 + Math.random() * 0.02);
          const low = open * (1 - Math.random() * 0.02);
          const close = low + Math.random() * (high - low);
          const volume = Math.random() * 1000000;
          
          // Technical indicators (simplified)
          const rsi = 30 + Math.random() * 40;
          const macd = -2 + Math.random() * 4;
          const signal = -2 + Math.random() * 4;
          
          data.push({
            timestamp: timestamp.toISOString(),
            symbol: selectedSymbol,
            open,
            high,
            low,
            close,
            volume,
            rsi,
            macd,
            signal
          });
        }
      } else {
        // Parse custom data
        try {
          data = JSON.parse(customData);
          if (!Array.isArray(data)) {
            data = [data];
          }
        } catch (error) {
          toast({
            title: "Invalid JSON",
            description: "Please provide valid JSON data",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      inputData = {
        modelId: model.id,
        data,
        options: {
          storePredictions: storeResults,
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          includeHistory
        }
      };
      
      // Make prediction API call
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make prediction');
      }
      
      const result = await response.json();
      setPredictions(result);
      
      toast({
        title: "Prediction Complete",
        description: "The model has generated predictions successfully",
      });
    } catch (error) {
      console.error("Error making prediction:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const downloadPredictions = () => {
    if (!predictions) return;
    
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(predictions, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `prediction_${model.id}_${new Date().toISOString()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error("Error downloading predictions:", error);
      toast({
        title: "Error",
        description: "Failed to download predictions",
        variant: "destructive",
      });
    }
  };
  
  // Render functions for different prediction results
  const renderClassificationPredictions = () => {
    if (!predictions?.predictions || !predictions?.probabilities) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Classification Results</h3>
          <Badge>{predictions.metadata.confidenceScore ? 
            `${(predictions.metadata.confidenceScore * 100).toFixed(2)}% confidence` : 
            'Prediction complete'}</Badge>
        </div>
        
        <div className="space-y-2">
          {predictions.predictions.map((prediction: string, i: number) => {
            const probabilities = predictions.probabilities[i];
            const maxKey = Object.keys(probabilities).reduce((a, b) => probabilities[a] > probabilities[b] ? a : b);
            const maxProb = probabilities[maxKey];
            
            return (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="py-2 px-4 bg-muted/50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">{`Prediction ${i + 1}`}</CardTitle>
                    <Badge 
                      variant={prediction === 'buy' ? 'default' : 
                              prediction === 'sell' ? 'destructive' : 'outline'}
                      className="uppercase"
                    >
                      {prediction}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-3 px-4">
                  <div className="space-y-1">
                    {Object.entries(probabilities).map(([cls, prob]) => (
                      <div key={cls} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize">{cls}</span>
                          <span className="font-medium">{(Number(prob) * 100).toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              cls === 'buy' ? 'bg-green-500' : 
                              cls === 'sell' ? 'bg-red-500' : 
                              cls === 'hold' ? 'bg-blue-500' : 'bg-primary'
                            }`}
                            style={{ width: `${Number(prob) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };
  
  const renderRegressionPredictions = () => {
    if (!predictions?.predictions) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Regression Results</h3>
          <Badge>Prediction complete</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Index</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground tracking-wider">Predicted Value</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-muted">
              {predictions.predictions.map((prediction: number, i: number) => (
                <tr key={i}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{i + 1}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{prediction.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const renderPredictionMetadata = () => {
    if (!predictions?.metadata) return null;
    
    return (
      <div className="space-y-2 mt-4 pt-4 border-t">
        <h3 className="text-sm font-medium">Prediction Metadata</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Model Name:</span>
            <span className="font-medium">{predictions.metadata.modelName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Model Version:</span>
            <span className="font-medium">{predictions.metadata.modelVersion}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Execution Time:</span>
            <span className="font-medium">{predictions.metadata.executionTimeMs}ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Timestamp:</span>
            <span className="font-medium">{new Date(predictions.metadata.timestamp).toLocaleString()}</span>
          </div>
          {predictions.metadata.confidenceScore && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-medium">{(predictions.metadata.confidenceScore * 100).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue={predictionType} onValueChange={setPredictionType}>
        <TabsList className="mb-4">
          <TabsTrigger value="symbol">Symbol Data</TabsTrigger>
          <TabsTrigger value="custom">Custom Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="symbol" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Select 
                value={selectedSymbol} 
                onValueChange={setSelectedSymbol}
                disabled={disabled || loading}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select a symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbolOptions.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={selectedTimeframe} 
                onValueChange={setSelectedTimeframe}
                disabled={disabled || loading}
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select a timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map(tf => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lookback">Lookback Period</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="lookback"
                  type="number"
                  value={lookbackPeriod}
                  onChange={(e) => setLookbackPeriod(parseInt(e.target.value) || 30)}
                  min={1}
                  max={100}
                  disabled={disabled || loading}
                />
                <Select 
                  value={lookbackPeriod.toString()} 
                  onValueChange={(v) => setLookbackPeriod(parseInt(v))}
                  disabled={disabled || loading}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 periods</SelectItem>
                    <SelectItem value="30">30 periods</SelectItem>
                    <SelectItem value="50">50 periods</SelectItem>
                    <SelectItem value="100">100 periods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit">Prediction Limit</Label>
              <Input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
                min={1}
                max={50}
                disabled={disabled || loading}
              />
            </div>
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-history"
                  checked={includeHistory}
                  onCheckedChange={setIncludeHistory}
                  disabled={disabled || loading}
                />
                <Label htmlFor="include-history">Include history in results</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="store-results"
                  checked={storeResults}
                  onCheckedChange={setStoreResults}
                  disabled={disabled || loading}
                />
                <Label htmlFor="store-results">Store prediction results</Label>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-data">Custom Data (JSON format)</Label>
            <Textarea
              id="custom-data"
              placeholder={`[
  {
    "feature1": 100,
    "feature2": 200,
    ...
  },
  ...
]`}
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              rows={10}
              disabled={disabled || loading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Provide data as a JSON array. Each object in the array should have the same structure with feature names matching those the model was trained on.
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="store-results-custom"
              checked={storeResults}
              onCheckedChange={setStoreResults}
              disabled={disabled || loading}
            />
            <Label htmlFor="store-results-custom">Store prediction results</Label>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => {
                // Sample data for model type
                let sample = [];
                
                if (model.type === 'classification') {
                  sample = Array(3).fill(0).map((_, i) => ({
                    open: 35000 + Math.random() * 1000,
                    high: 36000 + Math.random() * 1000,
                    low: 34000 + Math.random() * 1000,
                    close: 35500 + Math.random() * 1000,
                    volume: 1000000 + Math.random() * 5000000,
                    rsi: 50 + Math.random() * 20 - 10,
                    macd: Math.random() * 2 - 1,
                    signal: Math.random() * 2 - 1,
                  }));
                } else if (model.type === 'regression') {
                  sample = Array(3).fill(0).map((_, i) => ({
                    feature1: Math.random() * 100,
                    feature2: Math.random() * 200,
                    feature3: Math.random() * 300,
                    feature4: Math.random() * 400,
                  }));
                }
                
                setCustomData(JSON.stringify(sample, null, 2));
              }}
            >
              Load Sample Data
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="pt-4 flex justify-between">
        <Button
          onClick={handleSubmit}
          disabled={disabled || loading || 
            (predictionType === 'symbol' && (!selectedSymbol || !selectedTimeframe)) || 
            (predictionType === 'custom' && !customData.trim())}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Making Prediction...
            </>
          ) : (
            "Make Prediction"
          )}
        </Button>
        
        {predictions && (
          <Button
            variant="outline"
            onClick={downloadPredictions}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Download Results
          </Button>
        )}
      </div>
      
      {/* Results section */}
      {predictions && (
        <div className="mt-8 space-y-6 border-t pt-6">
          <h2 className="text-xl font-semibold">Prediction Results</h2>
          
          {model.type === 'classification' && renderClassificationPredictions()}
          {(model.type === 'regression' || model.type === 'time-series') && renderRegressionPredictions()}
          {renderPredictionMetadata()}
        </div>
      )}
    </div>
  );
}
