// src/app/dashboard/agents/[agentId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAgentDetails,
  getAgentTrades,
  getAgentPerformanceLogs,
  type TradingAgentWithDetails,
  type AgentTrade,
  type AgentPerformanceLog,
  type PaginatedResponse,
} from '@/lib/clients/apiClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ArrowLeft, Edit3, ExternalLink } from "lucide-react";

// Helper for displaying JSON (can be more sophisticated)
function JsonDisplay({ data }: { data: any }) {
  return (
    <pre className="bg-muted p-2 rounded-md text-sm overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [agentDetails, setAgentDetails] = useState<TradingAgentWithDetails | null>(null);
  const [recentTrades, setRecentTrades] = useState<PaginatedResponse<AgentTrade> | null>(null);
  const [recentLogs, setRecentLogs] = useState<PaginatedResponse<AgentPerformanceLog> | null>(null);
  
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  
  const [errorAgent, setErrorAgent] = useState<string | null>(null);
  const [errorTrades, setErrorTrades] = useState<string | null>(null);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  // State for Agent Wallet Transactions
  const [agentWalletTransactionsData, setAgentWalletTransactionsData] = useState<PaginatedResponse<WalletTransaction> | null>(null);
  const [isAgentWalletTransactionsLoading, setIsAgentWalletTransactionsLoading] = useState(true);
  const [agentWalletTransactionsError, setAgentWalletTransactionsError] = useState<string | null>(null);
  
  // useSearchParams will be used by WalletTransactionList for its pagination
  // The page can also read them if needed for initial fetch.
  const searchParams = useSearchParams();
  const agentWalletTransactionsPage = parseInt(searchParams.get('awt_page') || '1', 10);
  const agentWalletTransactionsLimit = parseInt(searchParams.get('awt_limit') || '10', 10);


  useEffect(() => {
    if (!agentId) return;

    async function fetchAgentData() {
      setIsLoadingAgent(true);
      setErrorAgent(null);
      try {
        const details = await getAgentDetails(agentId);
        setAgentDetails(details);
      } catch (err: any) {
        console.error("Failed to fetch agent details:", err);
        setErrorAgent(err.message || 'Error fetching agent details.');
      } finally {
        setIsLoadingAgent(false);
      }
    }

    async function fetchRecentTrades() {
      setIsLoadingTrades(true);
      setErrorTrades(null);
      try {
        const trades = await getAgentTrades(agentId, 1, 5); // Fetch 5 recent trades
        setRecentTrades(trades);
      } catch (err: any) {
        console.error("Failed to fetch recent trades:", err);
        setErrorTrades(err.message || 'Error fetching trades.');
      } finally {
        setIsLoadingTrades(false);
      }
    }

    async function fetchRecentPerformanceLogs() {
      setIsLoadingLogs(true);
      setErrorLogs(null);
      try {
        const logs = await getAgentPerformanceLogs(agentId, 1, 5); // Fetch 5 recent logs
        setRecentLogs(logs);
      } catch (err: any) {
        console.error("Failed to fetch recent performance logs:", err);
        setErrorLogs(err.message || 'Error fetching logs.');
      } finally {
        setIsLoadingLogs(false);
      }
    }
    
    fetchAgentData();
    fetchRecentTrades();
    fetchRecentPerformanceLogs();
    // Agent wallet transactions will be fetched in a separate useEffect that depends on agentDetails

  }, [agentId]); // Initial data fetch for agent, recent trades, recent logs

  useEffect(() => {
    if (agentDetails?.wallets?.wallet_id) {
      async function fetchAgentWalletTransactions() {
        setIsAgentWalletTransactionsLoading(true);
        setAgentWalletTransactionsError(null);
        try {
          const transactions = await getWalletTransactions(
            agentDetails.wallets.wallet_id, 
            agentWalletTransactionsPage, 
            agentWalletTransactionsLimit
          );
          setAgentWalletTransactionsData(transactions);
        } catch (err: any) {
          console.error("Failed to fetch agent wallet transactions:", err);
          setAgentWalletTransactionsError(err.message || 'Error fetching agent wallet transactions.');
        } finally {
          setIsAgentWalletTransactionsLoading(false);
        }
      }
      fetchAgentWalletTransactions();
    }
  }, [agentDetails, agentId, agentWalletTransactionsPage, agentWalletTransactionsLimit]); // Rerun if wallet/page changes


  // Overall loading state can be simplified or made more granular
  // const isLoading = isLoadingAgent || isLoadingTrades || isLoadingLogs || isAgentWalletTransactionsLoading;
  // For this example, main loading is for agent details. Sections handle their own.

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents List
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/agents/${agentId}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Agent
            </Link>
        </Button>
      </div>

      {/* Agent Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Agent Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAgent && <AgentOverviewSkeleton />}
          {errorAgent && <ErrorAlert title="Agent Details Error" message={errorAgent} />}
          {agentDetails && !isLoadingAgent && !errorAgent && (
            <div className="space-y-3">
              <p><strong>Name:</strong> {agentDetails.name}</p>
              <p><strong>Status:</strong> <Badge variant={agentDetails.status === 'active' ? 'default' : 'secondary'} className={agentDetails.status === 'active' ? 'bg-green-500 text-white' : ''}>{agentDetails.status}</Badge></p>
              <p><strong>Strategy:</strong> {agentDetails.trading_strategies?.name || 'N/A'}</p>
              <div>
                <strong>Configuration:</strong>
                <JsonDisplay data={agentDetails.configuration_parameters} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Card */}
      <Card>
        <CardHeader><CardTitle>Wallet Details</CardTitle></CardHeader>
        <CardContent>
          {isLoadingAgent && <WalletInfoSkeleton />} 
          {errorAgent && <ErrorAlert title="Wallet Details Error" message={errorAgent} />} {/* Reuses agent error */}
          {agentDetails?.wallets && !isLoadingAgent && !errorAgent && (
            <div className="space-y-1">
              <p><strong>Wallet ID:</strong> {agentDetails.wallets.wallet_id}</p>
              <p><strong>Currency:</strong> {agentDetails.wallets.currency}</p>
              <p><strong>Balance:</strong> {Number(agentDetails.wallets.balance).toFixed(2)}</p>
            </div>
          )}
           {!agentDetails?.wallets && !isLoadingAgent && !errorAgent && <p>No wallet associated with this agent.</p>}
        </CardContent>
      </Card>

      {/* Recent Trades Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Trades (Last 5)</CardTitle>
            <Link href={`/dashboard/agents/${agentId}/trades`} passHref legacyBehavior>
                 <Button variant="outline" size="sm" asChild>
                    <a>View All Trades <ExternalLink className="ml-2 h-4 w-4"/></a>
                </Button>
            </Link>
        </CardHeader>
        <CardContent>
          {isLoadingTrades && <TableSkeleton numRows={5} numCols={7} />}
          {errorTrades && <ErrorAlert title="Recent Trades Error" message={errorTrades} />}
          {recentTrades?.data && recentTrades.data.length > 0 && !isLoadingTrades && !errorTrades && (
            <TradesTable trades={recentTrades.data} />
          )}
          {recentTrades?.data?.length === 0 && !isLoadingTrades && !errorTrades && <p>No recent trades found.</p>}
        </CardContent>
      </Card>

      {/* Recent Performance Logs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Performance Logs (Last 5)</CardTitle>
             <Link href={`/dashboard/agents/${agentId}/performance`} passHref legacyBehavior>
                 <Button variant="outline" size="sm" asChild>
                    <a>View All Logs <ExternalLink className="ml-2 h-4 w-4"/></a>
                </Button>
            </Link>
        </CardHeader>
        <CardContent>
          {isLoadingLogs && <TableSkeleton numRows={5} numCols={4} />}
          {errorLogs && <ErrorAlert title="Performance Logs Error" message={errorLogs} />}
          {recentLogs?.data && recentLogs.data.length > 0 && !isLoadingLogs && !errorLogs && (
            <PerformanceLogsTable logs={recentLogs.data} />
          )}
          {recentLogs?.data?.length === 0 && !isLoadingLogs && !errorLogs && <p>No recent performance logs found.</p>}
        </CardContent>
      </Card>

      {/* Agent Wallet Transactions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Wallet Transactions</CardTitle>
          {agentDetails?.wallets && (
            <CardDescription>
              Transaction history for wallet: {agentDetails.wallets.wallet_id.substring(0,8)}... ({agentDetails.wallets.currency})
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingAgent && <Skeleton className="h-10 w-1/2 mb-4" /> /* Loading wallet ID */}
          {!isLoadingAgent && agentDetails?.wallets && (
            isAgentWalletTransactionsLoading ? (
              <TableSkeleton numRows={agentWalletTransactionsLimit} numCols={5} />
            ) : agentWalletTransactionsError ? (
              <ErrorAlert title="Agent Wallet Transactions Error" message={agentWalletTransactionsError} />
            ) : agentWalletTransactionsData && agentWalletTransactionsData.data.length > 0 ? (
              <WalletTransactionList
                transactions={agentWalletTransactionsData.data}
                page={agentWalletTransactionsData.page}
                limit={agentWalletTransactionsData.limit}
                total_count={agentWalletTransactionsData.total_count}
                walletId={agentDetails.wallets.wallet_id}
                walletCurrency={agentDetails.wallets.currency}
                pageQueryParamName="awt_page" // Pass custom query param name
                limitQueryParamName="awt_limit" // Pass custom query param name
              />
            ) : (
              <p>No transactions found for this agent's wallet.</p>
            )
          )}
          {!isLoadingAgent && !agentDetails?.wallets && !errorAgent && (
            <p>Agent does not have an associated wallet or wallet details could not be loaded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Skeletons & Helper Components
function AgentOverviewSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-5 w-1/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function WalletInfoSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}

function TableSkeleton({numRows, numCols}: {numRows: number, numCols: number}) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-10 w-full" /> {/* Header */}
            {Array.from({length: numRows}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
    )
}

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <Terminal className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function TradesTable({ trades }: { trades: AgentTrade[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Entry Price</TableHead>
          <TableHead className="text-right">Exit Price</TableHead>
          <TableHead className="text-right">PnL</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.trade_id}>
            <TableCell>{new Date(trade.entry_ts).toLocaleString()}</TableCell>
            <TableCell>{trade.symbol}</TableCell>
            <TableCell className="capitalize">{trade.direction}</TableCell>
            <TableCell className="text-right">{Number(trade.quantity).toFixed(2)}</TableCell>
            <TableCell className="text-right">{Number(trade.entry_price).toFixed(2)}</TableCell>
            <TableCell className="text-right">{trade.exit_price ? Number(trade.exit_price).toFixed(2) : 'N/A'}</TableCell>
            <TableCell className="text-right">{trade.pnl ? Number(trade.pnl).toFixed(2) : 'N/A'}</TableCell>
            <TableCell><Badge variant={trade.status === 'closed' ? 'default' : 'secondary'}>{trade.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PerformanceLogsTable({ logs }: { logs: AgentPerformanceLog[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Metric Name</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.log_id}>
            <TableCell>{new Date(log.ts).toLocaleString()}</TableCell>
            <TableCell>{log.metric_name}</TableCell>
            <TableCell>{log.metric_value}</TableCell>
            <TableCell>{log.notes}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
