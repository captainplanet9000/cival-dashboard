'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

interface AgentModeSwitchProps {
  agentId: string;
  agentName: string;
  currentMode: 'live' | 'dry-run';
  onModeChange?: (newMode: 'live' | 'dry-run') => void;
}

export default function AgentModeSwitch({
  agentId,
  agentName,
  currentMode,
  onModeChange
}: AgentModeSwitchProps) {
  const [isLive, setIsLive] = useState(currentMode === 'live');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Handle toggle
  const handleToggle = (checked: boolean) => {
    // If toggling to live mode, show confirmation dialog
    if (checked && currentMode !== 'live') {
      setShowConfirmDialog(true);
    } 
    // If toggling to dry-run mode, no confirmation needed
    else if (!checked && currentMode !== 'dry-run') {
      updateAgentMode('dry-run');
    }
  };
  
  // Update agent execution mode
  const updateAgentMode = async (mode: 'live' | 'dry-run') => {
    try {
      setIsLoading(true);
      
      const supabase = createBrowserClient();
      
      // Update agent in database
      const { error } = await supabase
        .from('agents')
        .update({ execution_mode: mode })
        .eq('id', agentId);
      
      if (error) throw error;
      
      // Update local state
      setIsLive(mode === 'live');
      
      // Call callback if provided
      if (onModeChange) {
        onModeChange(mode);
      }
      
      // Show success message
      toast({
        title: 'Mode Updated',
        description: `Agent is now in ${mode === 'live' ? 'LIVE' : 'DRY-RUN'} mode`,
        variant: mode === 'live' ? 'destructive' : 'default'
      });
      
      // Close dialog if open
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to update agent mode:', error);
      toast({
        title: 'Update Failed',
        description: `Error: ${(error as Error).message}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      {/* Mode Toggle Switch */}
      <div className="flex items-center space-x-2">
        <Switch 
          checked={isLive} 
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
        <Label htmlFor="mode-switch" className={isLive ? 'text-red-500 font-bold' : ''}>
          {isLive ? 'LIVE TRADING' : 'Dry-Run Mode'}
        </Label>
      </div>
      
      {/* Confirmation Dialog for LIVE mode */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              <AlertTriangle className="mr-2 h-5 w-5" /> 
              Enable Live Trading?
            </DialogTitle>
            <DialogDescription>
              You are about to enable LIVE trading for <strong>{agentName}</strong>. This will use real funds and execute actual trades.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 p-4 border border-red-200 rounded-md my-4">
            <p className="text-red-600 font-medium">Please confirm you understand:</p>
            <ul className="list-disc pl-5 text-sm text-red-600 mt-2 space-y-1">
              <li>Live trading uses real funds</li>
              <li>Orders will be executed on the actual exchange</li>
              <li>You are responsible for any financial losses</li>
              <li>Market conditions may change rapidly</li>
            </ul>
          </div>
          
          <DialogFooter className="flex space-x-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => updateAgentMode('live')}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Yes, Enable Live Trading'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
