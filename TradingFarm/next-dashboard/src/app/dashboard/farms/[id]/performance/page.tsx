'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { farmService } from '@/services/farm-service';
import { vaultService } from '@/services/vault-service';
import { FarmPerformanceDashboard } from '@/components/dashboards/farm-performance-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { DEMO_MODE } from '@/utils/demo-data';

// Sample data for demo mode
const generateDemoPerformanceData = (days = 30) => {
  const dates = [];
  const values = [];
  const today = new Date();
  let lastValue = 10000;

  for (let i = days; i >= 0; i--) {
    const date = subDays(today, i);
    dates.push(format(date, 'yyyy-MM-dd'));
    
    // Generate somewhat realistic price movement
    const changePercent = (Math.random() * 2 - 0.5) / 100; // -0.5% to 1.5% daily change
    lastValue = lastValue * (1 + changePercent);
    values.push(lastValue);
  }

  return { dates, values };
};

// Sample transaction data for demo
const generateDemoTransactions = (count = 20) => {
  const transactionTypes = ['DEPOSIT', 'WITHDRAWAL', 'TRADE', 'FEE', 'INTEREST'];
  const statusTypes = ['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED'];
  const today = new Date();
  
  return Array(count).fill(0).map((_, index) => {
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const isNegative = type === 'WITHDRAWAL' || type === 'FEE' || (type === 'TRADE' && Math.random() > 0.6);
    const amount = isNegative 
      ? -(Math.random() * 1000 + 100).toFixed(2) 
      : (Math.random() * 2000 + 100).toFixed(2);
    
    return {
      id: `tx-${index}`,
      transaction_date: format(subDays(today, Math.floor(Math.random() * 30)), "yyyy-MM-dd'T'HH:mm:ss"),
      type,
      amount: parseFloat(amount),
      balance_after: 10000 + parseFloat(amount),
      description: `${type.toLowerCase()} transaction #${index + 1}`,
      status: statusTypes[Math.floor(Math.random() * statusTypes.length)],
      vault_account_id: 'vault-1',
      vault_account_name: 'Main Trading Account',
      farm_id: 'farm-1',
      created_at: format(subDays(today, Math.floor(Math.random() * 30)), "yyyy-MM-dd'T'HH:mm:ss"),
      updated_at: format(today, "yyyy-MM-dd'T'HH:mm:ss"),
    };
  });
};

// Sample asset allocation for demo
const generateDemoAssetAllocation = () => {
  return [
    { name: 'Bitcoin (BTC)', value: 4500 },
    { name: 'Ethereum (ETH)', value: 3200 },
    { name: 'USD Stablecoins', value: 2800 },
    { name: 'Solana (SOL)', value: 1200 },
    { name: 'Polygon (MATIC)', value: 800 },
    { name: 'Avalanche (AVAX)', value: 600 },
    { name: 'Other Tokens', value: 900 },
  ];
};

export default function FarmPerformancePage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [farm, setFarm] = useState(null);
  const [farms, setFarms] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [assetAllocation, setAssetAllocation] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  useEffect(() => {
    fetchFarmData();
  }, [id]);

  const fetchFarmData = async () => {
    setIsLoading(true);
    
    try {
      if (DEMO_MODE) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Generate demo data
        const farmData = {
          id: id,
          name: `Trading Farm ${id}`,
          description: 'A demo trading farm with simulated performance data.',
          roi: 0.078, // 7.8%
          winRate: 0.65, // 65%
          sharpeRatio: 1.8,
          maxDrawdown: -0.12, // -12%
          volatility: 0.22, // 22%
          profitFactor: 1.45,
          trades: 145,
          balance: 14000,
          startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
          performance_data: generateDemoPerformanceData(),
        };
        
        setFarm(farmData);
        setFarms([
          { ...farmData, color: '#3b82f6' },
          { 
            id: 'farm-2',
            name: 'Stock Trading',
            roi: 0.052,
            winRate: 0.58,
            sharpeRatio: 1.2,
            maxDrawdown: -0.08,
            volatility: 0.15,
            profitFactor: 1.3,
            trades: 98,
            balance: 22000,
            startDate: format(subDays(new Date(), 120), 'yyyy-MM-dd'),
            color: '#10b981'
          },
          {
            id: 'farm-3',
            name: 'Forex Trading',
            roi: 0.035,
            winRate: 0.71,
            sharpeRatio: 1.5,
            maxDrawdown: -0.05,
            volatility: 0.12,
            profitFactor: 1.6,
            trades: 203,
            balance: 18500,
            startDate: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
            color: '#8b5cf6'
          }
        ]);
        setTransactions(generateDemoTransactions());
        setAssetAllocation(generateDemoAssetAllocation());
        setIsLoading(false);
        return;
      }
      
      // Fetch real data
      const farmResponse = await farmService.getFarmById(id.toString());
      
      if (farmResponse.error) {
        toast({
          title: 'Error loading farm data',
          description: farmResponse.error,
          variant: 'destructive',
        });
        return;
      }
      
      if (farmResponse.data) {
        setFarm(farmResponse.data);
        
        // Fetch performance data
        // This would be a real endpoint in production
        const performanceResponse = await farmService.getFarmPerformance(id.toString(), {
          start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
          end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
        });
        
        if (performanceResponse.data) {
          const enhancedFarmData = {
            ...farmResponse.data,
            performance_data: performanceResponse.data,
          };
          setFarm(enhancedFarmData);
        }
        
        // Fetch comparison farms
        const farmsResponse = await farmService.getFarms();
        if (farmsResponse.data) {
          setFarms(farmsResponse.data.map((farm, index) => ({
            ...farm,
            color: COLORS[index % COLORS.length],
          })));
        }
        
        // Fetch transactions
        const transactionsResponse = await vaultService.getTransactionsByFarmId(id.toString(), {
          start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
          end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
        });
        
        if (transactionsResponse.data) {
          setTransactions(transactionsResponse.data);
        }
        
        // Fetch asset allocation
        const allocationResponse = await vaultService.getAssetAllocationByFarmId(id.toString());
        if (allocationResponse.data) {
          setAssetAllocation(allocationResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching farm data:', error);
      toast({
        title: 'Failed to load farm data',
        description: 'An unexpected error occurred. Using demo data instead.',
        variant: 'destructive',
      });
      
      // Fallback to demo data
      const farmData = {
        id: id,
        name: `Trading Farm ${id}`,
        description: 'A demo trading farm with simulated performance data.',
        roi: 0.078,
        winRate: 0.65,
        sharpeRatio: 1.8,
        maxDrawdown: -0.12,
        volatility: 0.22,
        profitFactor: 1.45,
        trades: 145,
        balance: 14000,
        startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
        performance_data: generateDemoPerformanceData(),
      };
      
      setFarm(farmData);
      setFarms([farmData]);
      setTransactions(generateDemoTransactions());
      setAssetAllocation(generateDemoAssetAllocation());
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    
    // Reload data with new date range
    fetchFarmData();
  };

  const handleRefreshData = () => {
    fetchFarmData();
    toast({
      title: 'Refreshing data',
      description: 'Fetching the latest performance data for this farm.',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/farms/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Farm
            </Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/farms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Farms
            </Link>
          </Button>
        </div>
        <div className="p-12 text-center">
          <h2 className="text-2xl font-semibold mb-2">Farm Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The farm you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/dashboard/farms">
              View All Farms
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/farms/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Farm
          </Link>
        </Button>
        <Button size="sm" onClick={handleRefreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>
      
      <FarmPerformanceDashboard
        farms={farms}
        selectedFarmId={farm.id}
        transactions={transactions}
        assetAllocation={assetAllocation}
        isLoading={isLoading}
        onDateRangeChange={handleDateRangeChange}
        onFarmChange={(farmId) => router.push(`/dashboard/farms/${farmId}/performance`)}
        onRefreshData={handleRefreshData}
      />
    </div>
  );
}

// Standard color palette for consistency
const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
];
