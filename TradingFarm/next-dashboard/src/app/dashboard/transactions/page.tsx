"use client";

import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowUpDown, 
  Download, 
  Filter, 
  Search,
  DollarSign,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createBrowserClient } from "@/utils/supabase/client";

// Transaction type definition
type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'rebate';
  amount: number;
  currency: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  source?: string;
  destination?: string;
  description?: string;
  reference_id?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Mock data for development
  const mockTransactions: Transaction[] = [
    {
      id: "tx1",
      type: "deposit",
      amount: 1000.00,
      currency: "USDT",
      timestamp: "2025-04-20T15:30:45Z",
      status: "completed",
      destination: "Binance",
      description: "Monthly portfolio funding",
      reference_id: "dep_123456"
    },
    {
      id: "tx2",
      type: "withdrawal",
      amount: 250.50,
      currency: "USDT",
      timestamp: "2025-04-18T09:15:22Z",
      status: "completed",
      source: "Binance",
      description: "Profit taking",
      reference_id: "with_789012"
    },
    {
      id: "tx3",
      type: "transfer",
      amount: 500.00,
      currency: "USDT",
      timestamp: "2025-04-15T11:45:30Z",
      status: "completed",
      source: "Binance",
      destination: "Bybit",
      description: "Rebalancing funds",
      reference_id: "trf_345678"
    },
    {
      id: "tx4",
      type: "fee",
      amount: 1.25,
      currency: "USDT",
      timestamp: "2025-04-14T22:10:15Z",
      status: "completed",
      source: "Binance",
      description: "Trading fee",
      reference_id: "fee_901234"
    },
    {
      id: "tx5",
      type: "rebate",
      amount: 0.50,
      currency: "USDT",
      timestamp: "2025-04-12T08:05:40Z",
      status: "completed",
      destination: "Binance",
      description: "Fee rebate",
      reference_id: "reb_567890"
    },
    {
      id: "tx6",
      type: "deposit",
      amount: 2000.00,
      currency: "USDC",
      timestamp: "2025-04-10T14:20:10Z",
      status: "completed",
      destination: "Bybit",
      description: "Additional investment",
      reference_id: "dep_234567"
    },
    {
      id: "tx7",
      type: "withdrawal",
      amount: 100.00,
      currency: "USDC",
      timestamp: "2025-04-05T16:35:25Z",
      status: "failed",
      source: "Bybit",
      description: "Withdrawal failed - insufficient funds",
      reference_id: "with_890123"
    },
    {
      id: "tx8",
      type: "transfer",
      amount: 300.00,
      currency: "USDT",
      timestamp: "2025-04-02T10:50:55Z",
      status: "pending",
      source: "FTX",
      destination: "Binance",
      description: "Platform migration",
      reference_id: "trf_456789"
    }
  ];

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // In production, replace with actual API call:
        // const supabase = createBrowserClient();
        // const { data, error } = await supabase
        //   .from('transactions')
        //   .select('*')
        //   .order('timestamp', { ascending: false });
        
        // if (error) throw error;
        // setTransactions(data || []);
        
        // For now, use mock data
        setTimeout(() => {
          setTransactions(mockTransactions);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter and search transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch = searchTerm === "" || 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.currency.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Pagination
  const indexOfLastItem = page * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Get status badge variant
  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return { variant: "outline" as const, className: "bg-green-100 text-green-800 hover:bg-green-100", label: "Completed" };
      case 'pending':
        return { variant: "outline" as const, className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", label: "Pending" };
      case 'failed':
        return { variant: "destructive" as const, label: "Failed" };
      default:
        return { variant: "secondary" as const, label: status };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Transactions</CardTitle>
          <CardDescription>
            View and manage all your transactions across platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex items-center">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="transfer">Transfers</SelectItem>
                  <SelectItem value="fee">Fees</SelectItem>
                  <SelectItem value="rebate">Rebates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {loading ? (
            <div className="py-10 text-center">Loading transactions...</div>
          ) : currentItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No transactions found matching your criteria
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Source/Destination</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.timestamp)}</TableCell>
                        <TableCell className="capitalize">{tx.type}</TableCell>
                        <TableCell className={`font-medium ${tx.type === 'withdrawal' || tx.type === 'fee' ? 'text-red-500' : tx.type === 'deposit' || tx.type === 'rebate' ? 'text-green-500' : ''}`}>
                          {tx.type === 'withdrawal' || tx.type === 'fee' ? '-' : tx.type === 'deposit' || tx.type === 'rebate' ? '+' : ''}
                          {tx.amount.toFixed(2)} {tx.currency}
                        </TableCell>
                        <TableCell>
                          {tx.type === 'transfer' ? (
                            <div className="flex items-center">
                              <span>{tx.source}</span>
                              <ArrowRight className="mx-2 h-4 w-4" />
                              <span>{tx.destination}</span>
                            </div>
                          ) : tx.type === 'withdrawal' ? (
                            <span>From {tx.source}</span>
                          ) : (
                            <span>To {tx.destination}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.reference_id}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadge(tx.status).variant}
                            className={getStatusBadge(tx.status).className}
                          >
                            {getStatusBadge(tx.status).label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
