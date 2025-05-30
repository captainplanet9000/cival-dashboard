"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreateAgentForm } from '@/components/agents/create-agent-form';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { AIAgentV2 } from '@/context/ai-agent-v2-context';

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [agent, setAgent] = useState<AIAgentV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const agentId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  useEffect(() => {
    if (agentId) {
      fetchAgentData();
    }
  }, [agentId]);
  
  const fetchAgentData = async () => {
    try {
      setLoading(true);
      // In a real app, we would fetch from API
      // const response = await fetch(`/api/agents/${agentId}`);
      // const data = await response.json();
      
      // For demo purposes, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sample agent data
      const sampleAgent: AIAgentV2 = {
        id: agentId,
        name: "Trend Navigator",
        status: "active",
        specialization: ["trend_following"],
        wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
        farm_id: "farm-001",
        settings: {
          automation_level: "full",
          risk_level: 3,
          max_drawdown: 15,
          timeframes: ["15m", "1h", "4h"],
          indicators: ["RSI", "MACD", "Moving Averages"],
          trade_size: 250,
          trades_per_day: 5,
          position_size_percent: 10,
          max_open_positions: 3,
          strategyType: "trend_following"
        },
        instructions: [
          "Focus on strong trends only",
          "Exit positions when RSI indicates overbought/oversold"
        ],
        exchange: {
          name: "Binance",
          apiKey: "***********",
          apiSecret: "***********",
          apiPassphrase: "",
          apiEndpoint: ""
        }
      };
      
      setAgent(sampleAgent);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agent:', error);
      setError('Failed to load agent data. Please try again.');
      setLoading(false);
    }
  };
  
  const handleFormSubmit = async (formData: any) => {
    try {
      setSubmitting(true);
      
      // In a real app, we would submit to API
      // const response = await fetch(`/api/agents/${agentId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Agent Updated',
        description: `Successfully updated agent: ${formData.name}`,
      });
      
      // Redirect to agent details
      router.push(`/agents/${agentId}`);
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (error) {
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
            <BreadcrumbItem>
              <BreadcrumbLink href={`/agents/${agentId}`}>Agent Details</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Error</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button asChild>
          <Link href={`/agents/${agentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agent
          </Link>
        </Button>
      </div>
    );
  }
  
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
          <BreadcrumbItem>
            <BreadcrumbLink href={`/agents/${agentId}`}>Agent Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Edit Agent</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {loading ? <Skeleton className="h-9 w-48" /> : `Edit Agent: ${agent?.name}`}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/agents/${agentId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Link>
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">
            Update your AI trading agent's configuration, including exchange connectivity, strategy parameters, and risk management settings.
          </p>
          
          <div className="bg-card rounded-lg border p-6">
            <CreateAgentForm 
              onSubmit={handleFormSubmit} 
              isSubmitting={submitting}
              initialValues={agent}
              isEditing={true}
            />
          </div>
        </>
      )}
    </div>
  );
}
