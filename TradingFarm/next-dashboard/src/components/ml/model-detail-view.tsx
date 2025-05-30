/**
 * Model Detail View Component
 */
import { useState } from "react";
import { ModelDefinition, ModelMetrics } from "@/services/ml/model-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Brain, 
  BarChart4, 
  LineChart, 
  Activity, 
  CheckCircle,
  AlertCircle,
  Archive,
  Play,
  Trash2,
  FileEdit,
  RefreshCw,
  Loader2
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useMlModels } from "@/hooks/use-ml-models";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import ModelTrainingForm from "./model-training-form";
import ModelPredictionForm from "./model-prediction-form";

interface ModelDetailViewProps {
  model: ModelDefinition;
  onBack: () => void;
  onRefresh: () => void;
}

export default function ModelDetailView({ 
  model, 
  onBack,
  onRefresh
}: ModelDetailViewProps) {
  const { deleteModel, updateModel } = useMlModels();
  const { toast } = useToast();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Helper function to render model type icon
  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'classification':
        return <BarChart4 className="text-blue-500" size={20} />;
      case 'regression':
        return <LineChart className="text-green-500" size={20} />;
      case 'time-series':
        return <Activity className="text-purple-500" size={20} />;
      case 'reinforcement':
        return <Brain className="text-amber-500" size={20} />;
      default:
        return <Brain className="text-gray-500" size={20} />;
    }
  };

  // Helper function to render model status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle size={12} />
            Ready
          </Badge>
        );
      case 'training':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <Activity size={12} />
            Training
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <AlertCircle size={12} />
            Error
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
            <Archive size={12} />
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const success = await deleteModel(model.id);
      
      if (success) {
        toast({
          title: "Model Deleted",
          description: "The model has been successfully deleted.",
        });
        
        // Navigate back to the model list
        onBack();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the model. Please try again.",
          variant: "destructive",
        });
        
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatMetricValue = (value: any): string => {
    if (typeof value === 'number') {
      // Format percentages
      if (value >= 0 && value <= 1 && ['accuracy', 'precision', 'recall', 'f1Score', 'auc'].includes(value)) {
        return `${(value * 100).toFixed(2)}%`;
      }
      
      // Format decimal values
      if (Math.abs(value) < 0.01) {
        return value.toExponential(2);
      }
      
      return value.toFixed(4);
    }
    
    return String(value);
  };

  const renderMetrics = (metrics: ModelMetrics) => {
    const metricItems = Object.entries(metrics).map(([key, value]) => {
      // Skip null or undefined values
      if (value === null || value === undefined) return null;
      
      // Format the key for display
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
        .replace(/_/g, ' ')  // Replace underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return (
        <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="text-sm text-muted-foreground">{formattedKey}:</span>
          <span className="text-sm font-medium">{formatMetricValue(value)}</span>
        </div>
      );
    });
    
    return (
      <div className="space-y-1">
        {metricItems.filter(Boolean)}
      </div>
    );
  };

  const hasMetrics = model.metrics && Object.keys(model.metrics).length > 0;
  const canTrain = model.status !== 'training';
  const canPredict = model.status === 'ready';
  const hasFeatureImportance = model.metadata?.feature_importance && Object.keys(model.metadata.feature_importance).length > 0;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Models
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      
      {/* Model header card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {getModelTypeIcon(model.type)}
                <CardTitle className="text-2xl">{model.name}</CardTitle>
                {getStatusBadge(model.status)}
              </div>
              <CardDescription className="mt-1">
                {model.description || "No description provided"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Model Details</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{model.type}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Framework:</span>
                  <span className="font-medium">{model.framework}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-medium">{model.version}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {format(new Date(model.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(model.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Parameters</h3>
              {model.parameters && Object.keys(model.parameters).length > 0 ? (
                <div className="text-sm space-y-2">
                  {Object.entries(model.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/_/g, ' ')
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}:
                      </span>
                      <span className="font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No parameters defined</p>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Performance Metrics</h3>
              {hasMetrics ? (
                renderMetrics(model.metrics as ModelMetrics)
              ) : (
                <p className="text-sm text-muted-foreground">
                  No metrics available. Train the model to generate metrics.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Model actions/data tabs */}
      <Tabs defaultValue={canTrain ? "train" : "predict"}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="train">Train</TabsTrigger>
          <TabsTrigger value="predict" disabled={!canPredict}>Predict</TabsTrigger>
          <TabsTrigger value="visualize" disabled={!hasMetrics}>Visualize</TabsTrigger>
        </TabsList>
        
        {/* Training tab */}
        <TabsContent value="train">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Train Model</CardTitle>
              <CardDescription>
                Configure training parameters and dataset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelTrainingForm 
                model={model}
                onTrainingStarted={handleRefresh}
                disabled={!canTrain}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Prediction tab */}
        <TabsContent value="predict">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Make Predictions</CardTitle>
              <CardDescription>
                Use this model to generate predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModelPredictionForm 
                model={model}
                disabled={!canPredict}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Visualization tab */}
        <TabsContent value="visualize">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Model Visualization</CardTitle>
              <CardDescription>
                Visualize model performance and feature importance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasFeatureImportance ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Feature Importance</h3>
                  <div className="space-y-2">
                    {Object.entries(model.metadata.feature_importance as Record<string, number>)
                      .sort((a, b) => b[1] - a[1])
                      .map(([feature, importance]) => (
                        <div key={feature} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{feature}</span>
                            <span className="font-medium">{(importance * 100).toFixed(2)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${importance * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Feature importance data is not available.
                    <br />
                    Train the model first to visualize its performance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the model "{model.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
