'use client';

import React, { useEffect, useState } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { AgentCreationForm } from './agent-creation-form';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/utils/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [open, setOpen] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check authentication status when dialog opens
  useEffect(() => {
    if (open) {
      checkAuthStatus();
    }
  }, [open]);

  // Function to check if user is authenticated
  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Authentication error:', error.message);
        setAuthError(true);
      } else if (!data.user) {
        console.warn('No authenticated user found');
        setAuthError(true);
      } else {
        setAuthError(false);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setAuthError(true);
    } finally {
      setIsLoading(false);
    }
  };

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
    setAuthError(false);
  };

  // Sign in function
  const handleDemoSignIn = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Use mock credentials or dev-only credentials
      await supabase.auth.signInWithPassword({
        email: 'demo@tradingfarm.ai',
        password: 'demo-password-123'
      });
      
      // Check auth status again after sign in attempt
      checkAuthStatus();
      
      toast({
        title: "Demo Login",
        description: "Signed in with demo credentials.",
      });
    } catch (err) {
      console.error('Error signing in:', err);
      toast({
        title: "Error",
        description: "Could not sign in with demo credentials. Using mock data mode.",
        variant: "destructive"
      });
    }
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
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : authError ? (
          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Authentication error: This appears to be an unauthorized session. 
                For development purposes, you can use the demo login below.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Button onClick={handleDemoSignIn}>Continue with Demo Login</Button>
            </div>
          </div>
        ) : (
          <AgentCreationForm 
            onSuccess={handleCreateSuccess}
            onCancel={handleClose}
          />
        )}
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </DialogPrimitive.Root>
  );
}
