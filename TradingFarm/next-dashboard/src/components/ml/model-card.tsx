/**
 * ML Model Card Component
 */
import { ModelDefinition } from "@/services/ml/model-service";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  BarChart4, 
  LineChart, 
  Activity, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Archive,
  ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ModelCardProps {
  model: ModelDefinition;
  onClick: () => void;
}

// Helper function to render model type icon
const getModelTypeIcon = (type: string) => {
  switch (type) {
    case 'classification':
      return <BarChart4 className="text-blue-500" size={18} />;
    case 'regression':
      return <LineChart className="text-green-500" size={18} />;
    case 'time-series':
      return <Activity className="text-purple-500" size={18} />;
    case 'reinforcement':
      return <Brain className="text-amber-500" size={18} />;
    default:
      return <Brain className="text-gray-500" size={18} />;
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

export default function ModelCard({ model, onClick }: ModelCardProps) {
  // Format the updated time
  const updatedTime = formatDistanceToNow(new Date(model.updated_at), { addSuffix: true });
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            {getModelTypeIcon(model.type)}
            {model.name}
          </CardTitle>
          {getStatusBadge(model.status)}
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {model.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-4 pt-0">
        <div className="text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Framework:</span>
            <span className="font-medium">{model.framework}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Version:</span>
            <span className="font-medium">{model.version}</span>
          </div>
          
          {model.status === 'ready' && model.metrics && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Metrics:</span>
              <span className="font-medium">
                {model.metrics.accuracy ? 
                  `Accuracy: ${(model.metrics.accuracy * 100).toFixed(2)}%` : 
                  (model.metrics.rmse ? 
                    `RMSE: ${model.metrics.rmse.toFixed(4)}` : 
                    'Available')}
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Updated:</span>
            <span className="font-medium flex items-center gap-1">
              <Clock size={14} />
              {updatedTime}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="secondary" 
          className="w-full flex items-center justify-center gap-2"
          onClick={onClick}
        >
          View Details
          <ArrowRight size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
