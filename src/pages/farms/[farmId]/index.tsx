import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AgentList } from '@/components/AgentList';
import { VaultBalances } from '@/components/VaultBalances';
import { GoalManager } from '@/components/GoalManager';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { api, handleApiError } from '@/lib/api';
import { Farm } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Settings, BarChart3, Wallet, Robot, Target } from 'lucide-react';

export default function FarmDetail() {
  const router = useRouter();
  const { farmId } = router.query;
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const fetchFarmData = async () => {
      if (!farmId || typeof farmId !== 'string') return;
      
      try {
        setLoading(true);
        const farmData = await api.farms.getById(farmId);
        setFarm(farmData);
        setError(null);
      } catch (error) {
        handleApiError(error, setError);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFarmData();
  }, [farmId]);
  
  const handleSettingsClick = () => {
    if (farmId) {
      router.push(`/farms/${farmId}/settings`);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-8 mr-2" />
          <Skeleton className="h-8 w-40" />
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Skeleton className="h-12 w-full mb-6" />
        
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
          <p className="font-medium">Error loading farm</p>
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  if (!farm) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mb-4">
          <p className="font-medium">Farm not found</p>
          <p>The requested farm could not be found.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-2">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button and breadcrumb */}
      <div className="flex items-center mb-6">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 transition-colors">
          <div className="flex items-center">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </div>
        </Link>
      </div>
      
      {/* Farm header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{farm.name}</h1>
          {farm.description && (
            <p className="text-gray-500 mt-1">{farm.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleSettingsClick}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
      
      {/* Farm status card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-medium ${farm.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                {farm.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{new Date(farm.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">{new Date(farm.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 md:w-auto w-full">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center">
            <Robot className="h-4 w-4 mr-2" />
            <span>Agents</span>
          </TabsTrigger>
          <TabsTrigger value="vault" className="flex items-center">
            <Wallet className="h-4 w-4 mr-2" />
            <span>Vault</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            <span>Goals</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <AnalyticsDashboard farmId={farm.id} />
        </TabsContent>
        
        <TabsContent value="agents" className="space-y-6">
          <AgentList farmId={farm.id} />
        </TabsContent>
        
        <TabsContent value="vault" className="space-y-6">
          <VaultBalances farmId={farm.id} />
        </TabsContent>
        
        <TabsContent value="goals" className="space-y-6">
          <GoalManager farmId={farm.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 