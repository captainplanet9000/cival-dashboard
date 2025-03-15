import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { Shield, AlertOctagon } from "lucide-react";
import { RiskParameter } from './types';
import { Label } from '../ui/label';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface RiskManagementProps {
  parameters: RiskParameter[];
  onParameterChange: (parameterId: string, value: number | string | boolean) => void;
}

const RiskManagement: React.FC<RiskManagementProps> = ({ 
  parameters, 
  onParameterChange 
}) => {
  const formatValue = (param: RiskParameter) => {
    if (param.type === 'percentage') {
      return `${param.value}%`;
    } else if (param.type === 'currency') {
      return `$${param.value}`;
    } else {
      return param.value.toString();
    }
  };

  const renderControl = (param: RiskParameter) => {
    switch (param.type) {
      case 'number':
      case 'percentage':
      case 'currency':
        return (
          <div className="space-y-2 w-full">
            <div className="flex justify-between">
              <Label htmlFor={param.id} className="text-sm font-medium">
                {param.name}
              </Label>
              <span className="text-sm text-muted-foreground">
                {formatValue(param)}
                {param.unit ? ` ${param.unit}` : ''}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <Slider
                id={param.id}
                min={param.min ?? 0}
                max={param.max ?? 100}
                step={param.step ?? 1}
                value={[param.value as number]}
                onValueChange={(value) => onParameterChange(param.id, value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={param.value as number}
                onChange={(e) => onParameterChange(param.id, parseFloat(e.target.value))}
                min={param.min}
                max={param.max}
                step={param.step}
                className="w-20"
              />
            </div>
            <p className="text-xs text-muted-foreground">{param.description}</p>
          </div>
        );
      
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={param.id} className="text-sm font-medium">
                {param.name}
              </Label>
              <p className="text-xs text-muted-foreground">{param.description}</p>
            </div>
            <Switch
              id={param.id}
              checked={param.value as boolean}
              onCheckedChange={(checked) => onParameterChange(param.id, checked)}
            />
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={param.id} className="text-sm font-medium">
              {param.name}
            </Label>
            <Select
              value={param.value as string}
              onValueChange={(value) => onParameterChange(param.id, value)}
            >
              <SelectTrigger id={param.id}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{param.description}</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Group parameters by type for better organization
  const sliderParams = parameters.filter(p => ['number', 'percentage', 'currency'].includes(p.type));
  const toggleParams = parameters.filter(p => p.type === 'toggle');
  const selectParams = parameters.filter(p => p.type === 'select');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Shield className="h-5 w-5 mr-2 text-primary" />
          Risk Management
        </CardTitle>
        <CardDescription>
          Configure risk parameters for all trading operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <TooltipProvider>
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
              <div className="flex items-start gap-3">
                <AlertOctagon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Risk Manager Active</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Changes to these parameters will affect all active and future trading strategies.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {sliderParams.map(param => (
                <Tooltip key={param.id}>
                  <TooltipTrigger asChild>
                    <div>
                      {renderControl(param)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Default: {formatValue(param)}</p>
                    <p>Range: {param.min} - {param.max}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              {toggleParams.map(param => (
                <div key={param.id}>
                  {renderControl(param)}
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              {selectParams.map(param => (
                <div key={param.id}>
                  {renderControl(param)}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskManagement;
