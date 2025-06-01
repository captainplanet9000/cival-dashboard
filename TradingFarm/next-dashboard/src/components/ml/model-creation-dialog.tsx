/**
 * Model Creation Dialog Component
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ModelDefinition } from "@/services/ml/model-service";
import { useMlModels } from "@/hooks/use-ml-models";
import { useToast } from "@/components/ui/use-toast";

interface ModelCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelCreated: (model: ModelDefinition) => void;
  initialType: string | null;
}

export default function ModelCreationDialog({
  open,
  onOpenChange,
  onModelCreated,
  initialType
}: ModelCreationDialogProps) {
  const { createModel } = useMlModels();
  const { toast } = useToast();
  
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [type, setType] = useState<ModelDefinition['type']>(
    initialType as ModelDefinition['type'] || 'classification'
  );
  const [framework, setFramework] = useState<ModelDefinition['framework']>('tensorflow');
  const [loading, setLoading] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset form when dialog is opened
  const onOpenChangeWrapper = (open: boolean) => {
    if (!open) {
      // Reset form after closing animation
      setTimeout(() => {
        setName("");
        setDescription("");
        setType(initialType as ModelDefinition['type'] || 'classification');
        setFramework('tensorflow');
        setFormErrors({});
      }, 300);
    }
    
    onOpenChange(open);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = "Name is required";
    } else if (name.length < 3) {
      errors.name = "Name must be at least 3 characters";
    }
    
    if (!description.trim()) {
      errors.description = "Description is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Get parameters based on model type
      const parameters: Record<string, any> = {};
      
      if (type === 'classification') {
        parameters.classes = ['buy', 'sell', 'hold'];
        parameters.task = 'signal_generation';
      } else if (type === 'regression') {
        parameters.task = 'price_prediction';
      } else if (type === 'time-series') {
        parameters.task = 'price_prediction';
        parameters.sequence_length = 30;
        parameters.prediction_horizon = 5;
      } else if (type === 'reinforcement') {
        parameters.task = 'portfolio_optimization';
        parameters.reward_function = 'sharpe_ratio';
      }
      
      const model = await createModel(name, description, type, framework, parameters);
      
      if (model) {
        toast({
          title: "Model Created",
          description: "Your ML model has been created successfully.",
        });
        
        onModelCreated(model);
        onOpenChangeWrapper(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to create model. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating model:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapper}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New ML Model</DialogTitle>
          <DialogDescription>
            Set up a new machine learning model for training and prediction
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Model Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name"
              className={formErrors.name ? "border-red-500" : ""}
            />
            {formErrors.name && (
              <p className="text-sm text-red-500">{formErrors.name}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and expected use of this model"
              className={formErrors.description ? "border-red-500" : ""}
            />
            {formErrors.description && (
              <p className="text-sm text-red-500">{formErrors.description}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="type">Model Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as ModelDefinition['type'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classification">Classification</SelectItem>
                <SelectItem value="regression">Regression</SelectItem>
                <SelectItem value="time-series">Time Series</SelectItem>
                <SelectItem value="reinforcement">Reinforcement Learning</SelectItem>
              </SelectContent>
            </Select>
            
            <p className="text-sm text-muted-foreground mt-1">
              {type === 'classification' && "For classifying data into categories like buy/sell signals"}
              {type === 'regression' && "For predicting continuous values like prices"}
              {type === 'time-series' && "For forecasting future values based on historical sequences"}
              {type === 'reinforcement' && "For learning optimal actions through environment interaction"}
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="framework">Framework</Label>
            <Select
              value={framework}
              onValueChange={(value) => setFramework(value as ModelDefinition['framework'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tensorflow">TensorFlow</SelectItem>
                <SelectItem value="pytorch">PyTorch</SelectItem>
                <SelectItem value="scikit-learn">Scikit-Learn</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChangeWrapper(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Model"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
