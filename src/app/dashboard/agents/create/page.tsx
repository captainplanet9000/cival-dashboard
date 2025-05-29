// src/app/dashboard/agents/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // For redirecting after success
import { AgentCreationForm } from '@/components/agent/AgentCreationForm';
import { 
  getStrategies, 
  getUserWallets, 
  type TradingStrategy, 
  type Wallet,
  type TradingAgentWithWallet
} from '@/lib/clients/apiClient';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function CreateAgentPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [userWallets, setUserWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedStrategies, fetchedWallets] = await Promise.all([
          getStrategies(),
          getUserWallets(),
        ]);
        setStrategies(fetchedStrategies);
        setUserWallets(fetchedWallets);
      } catch (err: any) {
        console.error("Failed to load initial data for agent creation:", err);
        setError(err.message || 'An unexpected error occurred while loading data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleSuccess = (createdAgent: TradingAgentWithWallet) => {
    // Redirect to the main agents dashboard or a specific agent's page
    router.push('/dashboard/agents'); 
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Create New Trading Agent</h1>
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Check if essential data is available after loading and no error
  if (userWallets.length === 0) {
     return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Create New Trading Agent</h1>
        <Alert variant="warning">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Cannot Create Agent</AlertTitle>
            <AlertDescription>
                You need at least one funding wallet to create a new agent. Please create a wallet in the Vault section first.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (strategies.length === 0) {
     return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Create New Trading Agent</h1>
        <Alert variant="warning">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Cannot Create Agent</AlertTitle>
            <AlertDescription>
                No trading strategies are available. Please ensure strategies are configured by an administrator.
            </AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Trading Agent</h1>
        <AgentCreationForm 
          strategies={strategies} 
          userWallets={userWallets}
          onSuccess={handleSuccess} 
        />
      </div>
    </div>
  );
}
