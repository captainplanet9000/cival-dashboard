// src/app/dashboard/vault/wallets/[walletId]/transactions/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { WalletTransactionList } from '@/components/vault/WalletTransactionList';
import { 
  getWalletDetails, 
  getWalletTransactions, 
  type Wallet, 
  type WalletTransaction,
  type PaginatedResponse
} from '@/lib/clients/apiClient';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function WalletTransactionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const walletId = params.walletId as string; // Assuming walletId is always present

  const [walletDetails, setWalletDetails] = useState<Wallet | null>(null);
  const [transactionsData, setTransactionsData] = useState<PaginatedResponse<WalletTransaction> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = useMemo(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  }, [searchParams]);

  const currentLimit = useMemo(() => {
    const limit = searchParams.get('limit');
    return limit ? parseInt(limit, 10) : 20;
  }, [searchParams]);

  useEffect(() => {
    if (!walletId) return;

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch wallet details and transactions in parallel
        const [details, transactionsResp] = await Promise.all([
          getWalletDetails(walletId),
          getWalletTransactions(walletId, currentPage, currentLimit)
        ]);
        setWalletDetails(details);
        setTransactionsData(transactionsResp);
      } catch (err: any) {
        console.error("Failed to fetch wallet data:", err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [walletId, currentPage, currentLimit]);

  // const handlePageChange = (newPage: number) => {
    // Pagination is handled by WalletTransactionList, which updates URL params.
    // This component's useEffect will then re-fetch data based on new currentPage/currentLimit.
    // So, no explicit page change handler needed here if WalletTransactionList manages URL.
  // };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Skeleton className="h-8 w-1/2 mb-2" /> {/* Title Skeleton */}
        <Skeleton className="h-6 w-1/4 mb-6" /> {/* Subtitle Skeleton */}
        <Skeleton className="h-12 w-full mb-4" /> {/* Table Header Skeleton */}
        {Array.from({ length: currentLimit }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full mb-2" /> 
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!walletDetails || !transactionsData) {
    // This case should ideally be covered by error or loading state
    return <div className="container mx-auto p-4">No data available.</div>;
  }
  
  const walletCurrency = walletDetails.currency || 'N/A';

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
            <Link href="/dashboard/vault">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vault Overview
            </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          Wallet Transactions: <span className="text-primary">{walletId.substring(0,8)}...</span>
        </h1>
        <div className="text-lg text-muted-foreground mt-2">
          Current Balance: 
          <span className="font-semibold ml-2">
            {typeof walletDetails.balance === 'string' ? parseFloat(walletDetails.balance).toFixed(2) : Number(walletDetails.balance).toFixed(2)}
          </span>
          <span className="text-sm ml-1">{walletCurrency}</span>
        </div>
      </div>

      <WalletTransactionList
        transactions={transactionsData.data}
        page={transactionsData.page} // Pass current page from fetched data
        limit={transactionsData.limit} // Pass current limit from fetched data
        total_count={transactionsData.total_count}
        walletId={walletId}
        walletCurrency={walletCurrency}
      />
      
      {/* Pagination controls are now within WalletTransactionList */}
    </div>
  );
}
