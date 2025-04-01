"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Link from "next/link";
import { 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Calendar, 
  Download, 
  FileText, 
  RefreshCw,
  Search,
  Check,
  Clock,
  X,
  AlertCircle
} from "lucide-react";

// Define transaction types
type TransactionType = 
  | "deposit" 
  | "withdrawal" 
  | "transfer" 
  | "fee" 
  | "interest" 
  | "trade_profit" 
  | "trade_loss";

type TransactionStatus = 
  | "completed" 
  | "pending" 
  | "failed" 
  | "cancelled";

interface Transaction {
  id: number;
  farm_id: number;
  wallet_id?: number;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  created_at: string;
  updated_at: string;
  reference_id?: string;
  external_id?: string;
  exchange?: string;
  recipient?: string;
  sender?: string;
  metadata?: Record<string, any>;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<{ id: number; name: string }[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    farmId: "all",
    dateRange: "30d",
    search: "",
    minAmount: "",
    maxAmount: "",
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Load farms and transactions
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch farms
        const { data: farmsData, error: farmsError } = await supabase
          .from("farms")
          .select("id, name");

        if (farmsError) throw farmsError;
        setFarms(farmsData || []);

        // Fetch all transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });

        if (transactionsError) {
          // If there's an error with the transactions table, use sample data
          console.error("Error fetching transactions:", transactionsError);
          setTransactions(getSampleTransactions());
        } else {
          setTransactions(transactionsData || getSampleTransactions());
        }
      } catch (error) {
        console.error("Error in loadData:", error);
        setTransactions(getSampleTransactions());
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter transactions whenever filters or transactions change
  useEffect(() => {
    filterTransactions();
  }, [filters, transactions]);

  // Apply filters to transactions
  const filterTransactions = () => {
    let result = [...transactions];

    // Filter by type
    if (filters.type !== "all") {
      result = result.filter((tx) => tx.type === filters.type);
    }

    // Filter by status
    if (filters.status !== "all") {
      result = result.filter((tx) => tx.status === filters.status);
    }

    // Filter by farm
    if (filters.farmId !== "all") {
      result = result.filter((tx) => tx.farm_id === parseInt(filters.farmId));
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const now = new Date();
      let daysAgo = 0;

      switch (filters.dateRange) {
        case "7d":
          daysAgo = 7;
          break;
        case "30d":
          daysAgo = 30;
          break;
        case "90d":
          daysAgo = 90;
          break;
        case "1y":
          daysAgo = 365;
          break;
      }

      if (daysAgo > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - daysAgo);
        result = result.filter(
          (tx) => new Date(tx.created_at) >= cutoffDate
        );
      }
    }

    // Filter by search term (match against description, reference_id, sender, recipient)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(searchTerm) ||
          tx.reference_id?.toLowerCase().includes(searchTerm) ||
          tx.external_id?.toLowerCase().includes(searchTerm) ||
          tx.sender?.toLowerCase().includes(searchTerm) ||
          tx.recipient?.toLowerCase().includes(searchTerm) ||
          tx.currency.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by amount range
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        result = result.filter((tx) => tx.amount >= minAmount);
      }
    }

    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        result = result.filter((tx) => tx.amount <= maxAmount);
      }
    }

    setFilteredTransactions(result);
  };

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      type: "all",
      status: "all",
      farmId: "all",
      dateRange: "30d",
      search: "",
      minAmount: "",
      maxAmount: "",
    });
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    try {
      setIsExporting(true);
      
      // Get the data to be exported (filtered transactions)
      const data = filteredTransactions;
      
      // Create CSV header row
      const headers = [
        "ID",
        "Type",
        "Amount",
        "Currency",
        "Status",
        "Description",
        "Date",
        "Reference",
        "Exchange",
        "Farm",
      ].join(",");
      
      // Create CSV rows for each transaction
      const csvRows = data.map(tx => {
        const farmName = farms.find(f => f.id === tx.farm_id)?.name || `Farm ${tx.farm_id}`;
        const date = new Date(tx.created_at).toLocaleString();
        const row = [
          tx.id,
          tx.type,
          tx.amount,
          tx.currency,
          tx.status,
          `"${tx.description || ''}"`, // Quote description to handle commas
          date,
          tx.reference_id || '',
          tx.exchange || '',
          farmName
        ].join(",");
        return row;
      });
      
      // Combine headers and rows into CSV content
      const csvContent = [headers, ...csvRows].join("\n");
      
      // Create a blob with the CSV content
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create a download link and trigger the download
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `${filteredTransactions.length} transactions exported to CSV`,
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error exporting the transactions",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate transaction status badge
  const TransactionStatusBadge = ({ status }: { status: TransactionStatus }) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Check className="w-3 h-3 mr-1" /> Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <X className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Generate transaction type badge
  const TransactionTypeBadge = ({ type, amount }: { type: TransactionType; amount: number }) => {
    switch (type) {
      case "deposit":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <ArrowDown className="w-3 h-3 mr-1" /> Deposit
          </Badge>
        );
      case "withdrawal":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <ArrowUp className="w-3 h-3 mr-1" /> Withdrawal
          </Badge>
        );
      case "transfer":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            Transfer
          </Badge>
        );
      case "fee":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Fee
          </Badge>
        );
      case "interest":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Interest
          </Badge>
        );
      case "trade_profit":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Trade Profit
          </Badge>
        );
      case "trade_loss":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Trade Loss
          </Badge>
        );
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage your financial transactions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={isExporting || filteredTransactions.length === 0}
          >
            {isExporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
          <Link href="/dashboard/banking">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              View Balances
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Transaction Filters
          </CardTitle>
          <CardDescription>
            Filter transactions by type, status, date, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Transaction Type
              </label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="transfer">Transfers</SelectItem>
                  <SelectItem value="fee">Fees</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="trade_profit">Trade Profits</SelectItem>
                  <SelectItem value="trade_loss">Trade Losses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Farm
              </label>
              <Select
                value={filters.farmId}
                onValueChange={(value) => handleFilterChange("farmId", value)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farms</SelectItem>
                  {farms.map((farm) => (
                    <SelectItem key={farm.id} value={farm.id.toString()}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Date Range
              </label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleFilterChange("dateRange", value)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by description, reference..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <div className="w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Min Amount
              </label>
              <Input
                type="number"
                placeholder="Min"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange("minAmount", e.target.value)}
              />
            </div>

            <div className="w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Max Amount
              </label>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
              />
            </div>

            <div className="flex-1 flex items-end">
              <Button 
                variant="outline" 
                className="ml-auto"
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Farm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {tx.description || "-"}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={tx.type} amount={tx.amount} />
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${
                      tx.type === "deposit" || tx.type === "interest" || tx.type === "trade_profit"
                        ? "text-green-600"
                        : tx.type === "withdrawal" || tx.type === "fee" || tx.type === "trade_loss"
                        ? "text-red-600"
                        : ""
                    }`}>
                      {tx.type === "deposit" || tx.type === "interest" || tx.type === "trade_profit"
                        ? "+" 
                        : tx.type === "withdrawal" || tx.type === "fee" || tx.type === "trade_loss"
                        ? "-" 
                        : ""}
                      {tx.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{tx.currency}</TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.reference_id || "-"}
                    </TableCell>
                    <TableCell>
                      {farms.find((f) => f.id === tx.farm_id)?.name || `Farm ${tx.farm_id}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-3">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or search terms
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={resetFilters}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Generate sample transactions for development
function getSampleTransactions(): Transaction[] {
  const currencies = ["USDT", "USDC", "BTC", "ETH", "USD"];
  const exchanges = ["Binance", "Coinbase", "Kraken", "FTX"];
  const now = new Date();
  
  const descriptions = [
    "Monthly interest payment",
    "Withdrawal to bank account",
    "Deposit from exchange",
    "Transfer between farms",
    "Trading fee",
    "Profit from arbitrage",
    "Loss from market making",
    "Interest from staking",
    "Withdrawal to external wallet",
    "Deposit from fiat conversion"
  ];
  
  const transactions: Transaction[] = [];
  
  // Generate 50 random transactions over the past 120 days
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 120);
    const txDate = new Date(now);
    txDate.setDate(now.getDate() - daysAgo);
    
    // Determine transaction type
    const typeIdx = Math.floor(Math.random() * 7);
    const types: TransactionType[] = [
      "deposit", 
      "withdrawal", 
      "transfer", 
      "fee", 
      "interest", 
      "trade_profit", 
      "trade_loss"
    ];
    const type = types[typeIdx];
    
    // Determine amount based on type
    let amount: number;
    switch (type) {
      case "deposit":
      case "withdrawal":
        amount = +(Math.random() * 10000).toFixed(2);
        break;
      case "transfer":
        amount = +(Math.random() * 5000).toFixed(2);
        break;
      case "fee":
        amount = +(Math.random() * 100).toFixed(2);
        break;
      case "interest":
        amount = +(Math.random() * 500).toFixed(2);
        break;
      case "trade_profit":
        amount = +(Math.random() * 2000).toFixed(2);
        break;
      case "trade_loss":
        amount = +(Math.random() * 1500).toFixed(2);
        break;
      default:
        amount = +(Math.random() * 1000).toFixed(2);
    }
    
    // Random status based on transaction date
    // Newer transactions are more likely to be pending
    let status: TransactionStatus;
    if (daysAgo < 1 && Math.random() < 0.7) {
      status = "pending";
    } else if (Math.random() < 0.05) {
      status = "failed";
    } else if (Math.random() < 0.03) {
      status = "cancelled";
    } else {
      status = "completed";
    }
    
    const farmId = Math.floor(Math.random() * 3) + 1;
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    transactions.push({
      id: i + 1,
      farm_id: farmId,
      wallet_id: Math.floor(Math.random() * 5) + 1,
      type,
      amount,
      currency,
      status,
      description,
      created_at: txDate.toISOString(),
      updated_at: txDate.toISOString(),
      reference_id: `TX${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      external_id: Math.random() < 0.5 ? `EXT${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : undefined,
      exchange: Math.random() < 0.7 ? exchanges[Math.floor(Math.random() * exchanges.length)] : undefined,
      recipient: type === "transfer" ? `Farm ${Math.floor(Math.random() * 5) + 1}` : undefined,
      sender: type === "transfer" ? `Farm ${Math.floor(Math.random() * 5) + 1}` : undefined,
      metadata: {
        note: Math.random() < 0.3 ? "User initiated transaction" : undefined,
        fee: Math.random() < 0.5 ? +(Math.random() * 10).toFixed(2) : undefined,
      }
    });
  }
  
  // Sort by date (newest first)
  return transactions.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
