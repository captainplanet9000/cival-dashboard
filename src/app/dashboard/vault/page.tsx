// src/app/dashboard/vault/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { UserWalletList } from '@/components/vault/UserWalletList'; // Assuming this path
import { getUserWallets, type Wallet } from '@/lib/clients/apiClient'; // Assuming this path
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui path
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error state
import { Terminal } from "lucide-react"; // For alert icon

export default function VaultPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWallets() {
      try {
        setIsLoading(true);
        setError(null);
        const userWallets = await getUserWallets();
        setWallets(userWallets);
      } catch (err: any) {
        console.error("Failed to fetch wallets:", err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchWallets();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Vault</h1>
        <Button 
          onClick={() => {
            // TODO: Implement navigation or modal for wallet creation
            alert('Create New Wallet functionality to be implemented.');
          }}
        >
          Create New Wallet
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Wallets</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <UserWalletList wallets={wallets} />
      )}
    </div>
  );
}

// Simple skeleton component for wallet cards
function CardSkeleton() {
  return (
    <div className="flex flex-col space-y-3 p-4 border rounded-lg">
      <Skeleton className="h-[20px] w-[150px] rounded-xl" />
      <Skeleton className="h-[16px] w-[100px] rounded-xl" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-[28px] w-[200px]" />
        <Skeleton className="h-[14px] w-[180px]" />
      </div>
      <div className="pt-4">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}