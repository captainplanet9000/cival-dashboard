'use client';

import React from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { AgentCreationForm } from './agent-creation-form';
import { PlusCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface AgentCreationDialogProps {
  onSuccess?: (agent: any) => void;
  buttonText?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function AgentCreationDialog({
  onSuccess,
  buttonText = "Create Agent",
  title = "Create New Agent",
  description = "Configure your new trading agent to automate your trading strategies.",
  className 
}: AgentCreationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const handleCreateSuccess = (agent: any) => {
    toast({
      title: "Agent Created",
      description: `${agent.name} has been created successfully.`,
    });

    setOpen(false);
    // Wait a moment for the dialog to close before refreshing
    setTimeout(() => {
      if (onSuccess) {
        onSuccess(agent);
      } else {
        // Refresh the page to show the new agent
        router.refresh();
      }
    }, 500);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <AgentCreationForm 
          onSuccess={handleCreateSuccess}
          onCancel={handleClose}
        />
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
