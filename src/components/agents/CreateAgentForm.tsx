import React, { useState, useEffect } from 'react';
import { CreateAgentParams } from '@/services/farm/farm-service'; // Adjust path
// Import actual UI components (assuming shadcn/ui structure)
import { 
    Dialog, 
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
// Remove placeholder imports/components

// Define Props interface
interface CreateAgentFormProps {
  farmId: number | string;
  onAgentCreated: () => void; // Callback to refresh agent list
  isOpen: boolean; // Controlled by parent
  onClose: () => void; // Callback to signal closing
}

// Define available agent types
const AGENT_TYPES = ['ANALYST', 'TRADER', 'MONITOR'];

export const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ 
    farmId, 
    onAgentCreated, 
    isOpen, 
    onClose 
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  // State for specific config fields
  const [traderRisk, setTraderRisk] = useState(0.01);
  const [traderMaxTrades, setTraderMaxTrades] = useState(1);
  const [analystInterval, setAnalystInterval] = useState(60);
  // Add state for strategies, sources etc. if using complex inputs later
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      if (!isOpen) {
          resetForm();
      } else {
          setError(null); 
      }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setType('');
    setTraderRisk(0.01);
    setTraderMaxTrades(1);
    setAnalystInterval(60);
    setError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!type) {
        setError('Please select an agent type.');
        return;
    }
    setIsSubmitting(true);
    setError(null);

    // Construct configuration object based on type
    let configuration = {};
    switch (type.toUpperCase()) {
        case 'TRADER':
            configuration = { 
                allowedStrategies: [], 
                riskPerTrade: traderRisk, 
                maxConcurrentTrades: traderMaxTrades 
            };
            break;
        case 'ANALYST':
            configuration = { 
                dataSources: [], 
                analysisIntervalMinutes: analystInterval 
            };
            break;
        case 'MONITOR':
             configuration = { 
                 alertThresholds: {}, 
                 notificationChannels: [] 
             };
            break;
     }

    const agentData: Omit<CreateAgentParams, 'farm_id'> = { 
        name, 
        type, 
        configuration 
    }; 

    try {
      // Complete the fetch call
      const response = await fetch(`/api/farms/${farmId}/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData),
       });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create agent' })); // Handle non-JSON error responses
        throw new Error(errorData.error || `Failed to create agent (${response.status})`);
      }

      // Success
      resetForm();
      onClose();
      onAgentCreated(); // Trigger list refresh

    } catch (err: any) {
       setError(err.message);
       console.error("Create agent error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add type to event parameter
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
  }
  
  // Keep type for Select component interaction (shadcn specific)
  const handleSelectChange = (value: string) => { 
      setType(value); 
      // Clear specific fields when type changes? Optional.
  };

  // Add type to event parameter
  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTraderRisk(parseFloat(e.target.value) / 100);
  }
  // Add type to event parameter
  const handleMaxTradesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       setTraderMaxTrades(parseInt(e.target.value, 10) || 1); // Ensure it's at least 1
  }
  // Add type to event parameter
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       setAnalystInterval(parseInt(e.target.value, 10) || 1); // Ensure it's at least 1
  }

  const handleCancel = () => {
      resetForm();
      onClose();
  }

  // Use onClose prop instead of internal state setter
  const handleOpenChange = (open: boolean) => {
     if (!open) {
        handleCancel();
     }
  }

  // --- Render specific config fields based on type --- 
  const renderConfigFields = () => {
     switch (type?.toUpperCase()) { // Add safe navigation for type
        case 'TRADER':
            return (
                <>
                    <div className="mb-4"> {/* Use Tailwind classes */} 
                        <Label htmlFor="traderRisk">Risk Per Trade (%)</Label>
                        <Input 
                            id="traderRisk"
                            type="number"
                            value={traderRisk * 100} 
                            onChange={handleRiskChange} // Use handler
                            step="0.1"
                            min="0"
                            max="100"
                            disabled={isSubmitting}
                        />
                    </div>
                     <div className="mb-4">
                        <Label htmlFor="traderMaxTrades">Max Concurrent Trades</Label>
                        <Input 
                            id="traderMaxTrades"
                            type="number"
                            value={traderMaxTrades}
                            onChange={handleMaxTradesChange} // Use handler
                            step="1"
                            min="1"
                            disabled={isSubmitting}
                        />
                    </div>
                    {/* TODO: Add input for allowedStrategies (e.g., multi-select, tags input) */}
                </>
            );
        case 'ANALYST':
             return (
                <>
                     <div className="mb-4">
                        <Label htmlFor="analystInterval">Analysis Interval (Minutes)</Label>
                        <Input 
                            id="analystInterval"
                            type="number"
                            value={analystInterval}
                            onChange={handleIntervalChange} // Use handler
                            step="1"
                            min="1"
                            disabled={isSubmitting}
                        />
                    </div>
                    {/* TODO: Add input for dataSources (e.g., multi-select, tags input) */}
                </>
            );
         case 'MONITOR':
             return (
                <>
                   <p className="text-sm text-muted-foreground mb-4"> {/* Use Tailwind */} 
                      Basic Monitor configuration can be edited after creation.
                   </p>
                   {/* TODO: Add inputs for simple thresholds or channels if desired */}
                </>
            );
        default:
            return null;
     }
  }
  // --- End Render Config --- 

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="sm:max-w-[425px]">
        <div className="mb-4 border-b pb-2"> {/* Example header styling */} 
          <h4 className="font-semibold text-lg">Create New Agent for Farm {farmId}</h4> 
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4"> 
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="agentName" className="text-right">Agent Name</Label>
             <Input
               id="agentName"
               value={name}
               onChange={handleNameChange} // Use handler
               required
               disabled={isSubmitting}
               className="col-span-3"
             />
           </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="agentType" className="text-right">Agent Type</Label>
             {/* Remove disabled prop from Select - control via Trigger */} 
             <Select value={type} onValueChange={handleSelectChange}> 
               <SelectTrigger className="col-span-3">
                 <SelectValue placeholder="Select a type..." />
               </SelectTrigger>
               <SelectContent>
                 {AGENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
               </SelectContent>
             </Select>
           </div>
          
          {renderConfigFields()} 

          {error && <p className="text-sm font-medium text-destructive">Error: {error}</p>}

           {/* Use standard div for Footer */} 
          <div className="flex justify-end space-x-2 pt-4 border-t mt-4"> 
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !name || !type}>
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 