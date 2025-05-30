"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateAgentForm } from '@/components/agents/create-agent-form';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateAgentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  
  const handleFormSubmit = async (formData: any) => {
    try {
      setSubmitting(true);
      
      // In a real app, we would submit to API
      // const response = await fetch('/api/agents', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Agent Created',
        description: `Successfully created agent: ${formData.name}`,
      });
      
      // Redirect to agents list
      router.push('/agents');
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to create agent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Create New Agent</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Trading Agent</h1>
        <Button asChild variant="outline">
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Link>
        </Button>
      </div>
      
      <p className="text-muted-foreground">
        Configure your new AI trading agent with exchange connectivity, strategy parameters, and risk management settings.
      </p>
      
      <div className="bg-card rounded-lg border p-6">
        <CreateAgentForm onSubmit={handleFormSubmit} isSubmitting={submitting} />
      </div>
    </div>
  );
}
