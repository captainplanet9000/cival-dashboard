'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmPerformanceChart } from '@/components/charts/farm-performance-chart';
import { FarmPerformancePreview } from '@/components/farms/farm-performance-preview';
import { AssetAllocationChart } from '@/components/charts/asset-allocation-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { farmService } from '@/services/farm-service';
import { vaultService } from '@/services/vault-service';
import { BarChart, PlusCircle, ArrowRight } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { DEMO_MODE } from '@/utils/demo-data';

// Generate sample performance data
const generateSamplePerformanceData = (days = 30) => {
  const dates = [];
  const values = [];
  const today = new Date();
  let value = 10000;
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(today, i);
    dates.push(format(date, 'yyyy-MM-dd'));
    
    // Generate somewhat realistic price movement
    const changePercent = (Math.random() * 3 - 1) / 100; // -1% to 2% daily change
    value = value * (1 + changePercent);
    values.push(value);
  }
  
  return { dates, values };
};

// Sample asset allocation for demo
const generateSampleAssetAllocation = () => {
  return [
    { name: 'Bitcoin (BTC)', value: 4500 },
    { name: 'Ethereum (ETH)', value: 3200 },
    { name: 'USD Stablecoins', value: 2800 },
    { name: 'Solana (SOL)', value: 1200 },
    { name: 'Other Tokens', value: 1300 },
  ];
};

export function FarmPerformanceSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [farms, setFarms] = useState([]);
  const [assetAllocation, setAssetAllocation] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [performanceData, setPerformanceData] = useState({ dates: [], values: [] });
  
  useEffect(() => {
    fetchFarmsData();
  }, []);
  
  const fetchFarmsData = async () => {
    setIsLoading(true);
    
    try {
      if (DEMO_MODE) {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const demoFarms = [
          {
            id: 'farm-1',
            name: 'Crypto Trading',
            description: 'Cryptocurrency trading farm with multi-market strategies.',
            roi: 0.078,
            winRate: 0.65,
            balance: 14000,
            performance_data: generateSamplePerformanceData(),
          },
          {
            id: 'farm-2',
            name: 'Stock Trading',
            description: 'Stock market trading farm with focus on US equities.',
            roi: 0.052,
            winRate: 0.58,
            balance: 22000,
            performance_data: generateSamplePerformanceData(),
          },
          {
            id: 'farm-3',
            name: 'Forex Trading',
            description: 'Currency trading farm specialized in major and minor pairs.',
            roi: 0.035,
            winRate: 0.71,
            balance: 18500,
            performance_data: generateSamplePerformanceData(),
          }
        ];
        
        setFarms(demoFarms);
        setSelectedFarmId(demoFarms[0].id);
        setPerformanceData(demoFarms[0].performance_data);
        setAssetAllocation(generateSampleAssetAllocation());
        setIsLoading(false);
        return;
      }
      
      // Fetch real data
      const farmsResponse = await farmService.getFarms();
      
      if (farmsResponse.error) {
        console.error('Error fetching farms:', farmsResponse.error);
        // Fallback to demo data
        const demoFarms = [/* same as above */];
        setFarms(demoFarms);
        setSelectedFarmId(demoFarms[0].id);
        setPerformanceData(demoFarms[0].performance_data);
        setAssetAllocation(generateSampleAssetAllocation());
      } else if (farmsResponse.data && farmsResponse.data.length > 0) {
        setFarms(farmsResponse.data);
        setSelectedFarmId(farmsResponse.data[0].id);
        
        // Fetch performance data for first farm
        const farmId = farmsResponse.data[0].id;
        const performanceResponse = await farmService.getFarmPerformance(farmId, {
          start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
          end_date: format(new Date(), 'yyyy-MM-dd'),
        });
        
        if (performanceResponse.data) {
          setPerformanceData(performanceResponse.data);
        } else {
          setPerformanceData(generateSamplePerformanceData());
        }
        
        // Fetch asset allocation
        const allocationResponse = await vaultService.getAssetAllocationByFarmId(farmId);
        if (allocationResponse.data) {
          setAssetAllocation(allocationResponse.data);
        } else {
          setAssetAllocation(generateSampleAssetAllocation());
        }
      } else {
        // No farms found, use demo data
        const demoFarms = [/* same as above */];
        setFarms(demoFarms);
        setSelectedFarmId(demoFarms[0].id);
        setPerformanceData(demoFarms[0].performance_data);
        setAssetAllocation(generateSampleAssetAllocation());
      }
    } catch (error) {
      console.error('Error in farm performance section:', error);
      // Fallback to demo data
      const demoFarms = [/* same as above */];
      setFarms(demoFarms);
      setSelectedFarmId(demoFarms[0].id);
      setPerformanceData(demoFarms[0].performance_data);
      setAssetAllocation(generateSampleAssetAllocation());
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFarmSelect = (farmId) => {
    setSelectedFarmId(farmId);
    const farm = farms.find(f => f.id === farmId);
    if (farm && farm.performance_data) {
      setPerformanceData(farm.performance_data);
    } else {
      setPerformanceData(generateSamplePerformanceData());
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (farms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Farm Performance</CardTitle>
          <CardDescription>
            You don't have any trading farms yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <p className="text-muted-foreground mb-4 text-center">
            Create your first trading farm to track performance metrics and manage your strategies.
          </p>
          <Button asChild>
            <Link href="/dashboard/farms">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create a Farm
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Farm Performance</CardTitle>
            <CardDescription>
              Track and analyze your trading farm performance
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={selectedFarmId ? `/dashboard/farms/${selectedFarmId}/performance` : '/dashboard/farms'}>
              <BarChart className="h-4 w-4 mr-2" />
              Detailed Analytics
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Performance Overview</TabsTrigger>
            <TabsTrigger value="farms">Farm Comparison</TabsTrigger>
            <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="h-[300px]">
              {selectedFarmId && (
                <FarmPerformanceChart
                  data={performanceData}
                  dateRange={{
                    start: subDays(new Date(), 30),
                    end: new Date(),
                  }}
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="farms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farms.slice(0, 3).map((farm) => (
                <FarmPerformancePreview
                  key={farm.id}
                  farm={farm}
                  showDetails={false}
                />
              ))}
              
              {farms.length > 3 && (
                <Button variant="ghost" className="w-full h-full flex flex-col items-center justify-center p-8" asChild>
                  <Link href="/dashboard/farms">
                    <div className="text-center">
                      <p className="mb-2">View All Farms</p>
                      <ArrowRight className="h-6 w-6 mx-auto" />
                    </div>
                  </Link>
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="allocation" className="space-y-4">
            <div className="h-[300px]">
              <AssetAllocationChart
                data={assetAllocation}
                title="Current Asset Allocation"
                description="Distribution of assets across markets"
                showPercentages={true}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
