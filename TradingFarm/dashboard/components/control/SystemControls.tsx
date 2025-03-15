import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Switch } from "../ui/switch";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { 
  Activity, 
  AlertTriangle, 
  Brain, 
  HardDrive, 
  Lock, 
  ShieldAlert, 
  ShieldCheck, 
  Zap
} from "lucide-react";
import { SystemControl, SystemControlStatus } from './types';

interface SystemControlsProps {
  controls: SystemControl[];
  onToggle: (controlId: string, enabled: boolean) => void;
  elizaOSEnabled: boolean;
}

const SystemControls: React.FC<SystemControlsProps> = ({ 
  controls, 
  onToggle,
  elizaOSEnabled
}) => {
  // Helper function to render the appropriate icon
  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'brain':
        return <Brain className="h-5 w-5" />;
      case 'shield-check':
        return <ShieldCheck className="h-5 w-5" />;
      case 'shield-alert':
        return <ShieldAlert className="h-5 w-5" />;
      case 'lock':
        return <Lock className="h-5 w-5" />;
      case 'hard-drive':
        return <HardDrive className="h-5 w-5" />;
      case 'alert-triangle':
        return <AlertTriangle className="h-5 w-5" />;
      case 'zap':
        return <Zap className="h-5 w-5" />;
      case 'activity':
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  // Helper function to get status color class
  const getStatusColorClass = (status: SystemControlStatus) => {
    switch (status) {
      case SystemControlStatus.ENABLED:
        return 'text-green-500';
      case SystemControlStatus.DISABLED:
        return 'text-gray-400';
      case SystemControlStatus.PENDING:
        return 'text-amber-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Zap className="h-5 w-5 mr-2 text-primary" />
          System Controls
        </CardTitle>
        <CardDescription>
          Toggle critical system functions and integrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {controls.map(control => {
            const isEnabled = control.status === SystemControlStatus.ENABLED;
            const isPending = control.status === SystemControlStatus.PENDING;
            const isDisabled = control.requiresElizaOS && !elizaOSEnabled;
            
            return (
              <TooltipProvider key={control.id}>
                <Tooltip>
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/40 border-border'
                  }`}>
                    <div className="flex items-center">
                      <div className={`mr-3 ${getStatusColorClass(control.status)}`}>
                        {renderIcon(control.icon)}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">{control.name}</span>
                          {isPending && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Initializing...
                            </span>
                          )}
                          {isDisabled && (
                            <TooltipTrigger asChild>
                              <div className="ml-2 cursor-help">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </div>
                            </TooltipTrigger>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{control.description}</p>
                      </div>
                    </div>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => onToggle(control.id, checked)}
                          disabled={isDisabled || isPending}
                        />
                      </div>
                    </TooltipTrigger>
                  </div>
                  <TooltipContent>
                    {isDisabled 
                      ? `Requires ElizaOS to be enabled first` 
                      : isPending 
                        ? 'System is initializing this feature...'
                        : isEnabled 
                          ? `${control.name} is active` 
                          : `${control.name} is inactive`
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemControls;
