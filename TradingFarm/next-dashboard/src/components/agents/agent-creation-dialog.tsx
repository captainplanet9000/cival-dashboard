'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { AgentCreationForm } from './agent-creation-form';
import { PlusCircle } from 'lucide-react';

interface AgentCreationDialogProps {
  onSuccess?: (agent: any) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function AgentCreationDialog({ 
  onSuccess, 
  trigger,
  className 
}: AgentCreationDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSuccess = (agent: any) => {
    setOpen(false);
    if (onSuccess) {
      onSuccess(agent);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={className}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trading Agent</DialogTitle>
          <DialogDescription>
            Configure a new agent to automate your trading strategies.
          </DialogDescription>
        </DialogHeader>
        
        <AgentCreationForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
