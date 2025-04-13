"use client";

import { useState, useEffect } from "react";
import { Shell } from "@/components/shell";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { walletService, WalletTransaction, FarmFundingAllocation } from "@/services/wallet-service";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowUpIcon, Coins, FileIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { truncateAddress } from "@/lib/utils";

export default function WalletPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [allocations, setAllocations] = useState<FarmFundingAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch transaction history
        const txHistory = await walletService.getTransactionHistory();
        setTransactions(txHistory);
        
        // Fetch funding allocations
        const fundingAllocations = await walletService.getFarmFundingAllocations();
        setAllocations(fundingAllocations);
      } catch (err: any) {
        console.error("Error fetching wallet data:", err);
        setError(err.message || "Failed to load wallet data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [user]);
  
  // Transaction table columns
  const transactionColumns: ColumnDef<WalletTransaction>[] = [
    {
      accessorKey: "transaction_date",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("transaction_date") as string);
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "transaction_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("transaction_type") as string;
        return (
          <div className="flex items-center">
            {type === "send" ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ArrowUpIcon className="h-3 w-3" />
                Send
              </Badge>
            ) : type === "receive" ? (
              <Badge variant="success" className="flex items-center gap-1">
                <ArrowDownIcon className="h-3 w-3" />
                Receive
              </Badge>
            ) : type === "allocation" ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                Allocation
              </Badge>
            ) : (
              <Badge variant="outline">{type}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount") as string);
        const currency = row.original.currency;
        return (
          <div className={`font-mono font-medium ${amount < 0 ? "text-destructive" : "text-green-600"}`}>
            {amount > 0 ? "+" : ""}{amount} {currency}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center">
            {status === "completed" ? (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                <CheckCircleIcon className="h-3 w-3" />
                Completed
              </Badge>
            ) : status === "pending" ? (
              <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-600">
                <ClockIcon className="h-3 w-3" />
                Pending
              </Badge>
            ) : status === "failed" ? (
              <Badge variant="outline" className="flex items-center gap-1 text-destructive border-destructive">
                <XCircleIcon className="h-3 w-3" />
                Failed
              </Badge>
            ) : (
              <Badge variant="outline">{status}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "to_address",
      header: "Recipient",
      cell: ({ row }) => {
        const address = row.getValue("to_address") as string;
        return address ? <div className="font-mono text-xs">{truncateAddress(address)}</div> : "-";
      },
    },
    {
      accessorKey: "tx_hash",
      header: "Transaction Hash",
      cell: ({ row }) => {
        const hash = row.getValue("tx_hash") as string;
        return hash ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="font-mono text-xs p-0 h-auto"
            onClick={() => window.open(`https://etherscan.io/tx/${hash}`, '_blank')}
          >
            {truncateAddress(hash)}
            <FileIcon className="ml-1 h-3 w-3" />
          </Button>
        ) : "-";
      },
    },
  ];
  
  // Allocation table columns
  const allocationColumns: ColumnDef<FarmFundingAllocation>[] = [
    {
      accessorKey: "farm_name",
      header: "Farm",
      cell: ({ row }) => {
        return <div className="font-medium">{row.getValue("farm_name")}</div>;
      },
    },
    {
      accessorKey: "allocation_date",
      header: "Allocation Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("allocation_date") as string);
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount") as string);
        const currency = row.original.currency;
        return (
          <div className="font-mono font-medium">
            {amount} {currency}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center">
            {status === "active" ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" />
                Active
              </Badge>
            ) : status === "pending" ? (
              <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-600">
                <ClockIcon className="h-3 w-3" />
                Pending
              </Badge>
            ) : status === "completed" ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" />
                Completed
              </Badge>
            ) : status === "cancelled" ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircleIcon className="h-3 w-3" />
                Cancelled
              </Badge>
            ) : (
              <Badge variant="outline">{status}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "tx_hash",
      header: "Transaction",
      cell: ({ row }) => {
        const hash = row.getValue("tx_hash") as string;
        return hash ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="font-mono text-xs p-0 h-auto"
            onClick={() => window.open(`https://etherscan.io/tx/${hash}`, '_blank')}
          >
            {truncateAddress(hash)}
            <FileIcon className="ml-1 h-3 w-3" />
          </Button>
        ) : "-";
      },
    },
  ];

  return (
    <Shell>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <WalletConnect 
              onConnect={(wallet) => {
                // Refresh data when wallet is connected
                setIsLoading(true);
                Promise.all([
                  walletService.getTransactionHistory(),
                  walletService.getFarmFundingAllocations()
                ]).then(([txs, allocs]) => {
                  setTransactions(txs);
                  setAllocations(allocs);
                }).catch(err => {
                  console.error("Error refreshing data:", err);
                  setError("Failed to refresh wallet data");
                }).finally(() => {
                  setIsLoading(false);
                });
              }}
            />
          </div>
          
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="transactions" className="flex-1">Transaction History</TabsTrigger>
                <TabsTrigger value="allocations" className="flex-1">Farm Allocations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      Transaction History
                    </CardTitle>
                    <CardDescription>
                      View your recent wallet transactions and their statuses
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {error ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : isLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Loading transactions...</p>
                        </div>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Coins className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-1">No transactions found</h3>
                        <p className="text-sm">Your transaction history will appear here once you start using your wallet.</p>
                      </div>
                    ) : (
                      <DataTable 
                        columns={transactionColumns} 
                        data={transactions} 
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="allocations" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      Farm Funding Allocations
                    </CardTitle>
                    <CardDescription>
                      View and manage your farm funding allocations
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {error ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : isLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <p className="mt-2 text-sm text-muted-foreground">Loading allocations...</p>
                        </div>
                      </div>
                    ) : allocations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Coins className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-1">No allocations found</h3>
                        <p className="text-sm">You haven't allocated any funds to farms yet.</p>
                      </div>
                    ) : (
                      <DataTable 
                        columns={allocationColumns} 
                        data={allocations} 
                      />
                    )}
                  </CardContent>
                  
                  <CardFooter>
                    <Button className="ml-auto" onClick={() => window.location.href = "/dashboard/funding"}>
                      Manage Farm Funding
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Shell>
  );
} 