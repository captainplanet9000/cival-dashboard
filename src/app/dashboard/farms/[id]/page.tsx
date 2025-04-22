"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { Farm } from '@/types'; // Assuming Farm type exists
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // For future tab implementation
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentList } from '@/components/agent/AgentList'; // Use named import

// Placeholder components for future tabs
const FarmOverviewTab = ({ farm }: { farm: Farm }) => (
  <Card>
    <CardHeader><CardTitle>Farm Overview: {farm.name}</CardTitle></CardHeader>
    <CardContent><p>Summary metrics and details for {farm.name} will go here.</p></CardContent>
  </Card>
);

const FarmGoalsTab = ({ farmId }: { farmId: string }) => (
  <Card>
    <CardHeader><CardTitle>Goals</CardTitle></CardHeader>
    <CardContent><p>Goal list and management for farm {farmId} will go here.</p></CardContent>
  </Card>
);
const FarmStrategiesTab = ({ farmId }: { farmId: string }) => (
    <Card>
      <CardHeader><CardTitle>Strategies</CardTitle></CardHeader>
      <CardContent><p>Strategy management for farm {farmId} will go here.</p></CardContent>
    </Card>
  );

export default function FarmDetailPage() {
  const params = useParams();
  const farmId = params.id as string;
  const { farms, selectFarm, selectedFarmId } = useDashboard();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure the selected farm context matches the URL param
    if (farmId && selectedFarmId !== farmId) {
      selectFarm(farmId);
    }
  }, [farmId, selectedFarmId, selectFarm]);

  useEffect(() => {
    // Fetch or find the farm details based on farmId
    // For now, find it in the context's farms list
    setLoading(true);
    if (farmId && farms.length > 0) {
      const currentFarm = farms.find(f => f.id === farmId);
      setFarm(currentFarm || null);
    } 
    // In a real app, you might fetch if not found: `fetchFarmDetails(farmId).then(...)`
    setLoading(false); // Set loading to false after attempting to find/fetch
  }, [farmId, farms]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" /> 
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!farm) {
    return <div>Farm not found or access denied.</div>;
  }

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-2xl font-bold mb-4">Farm: {farm.name}</h1>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4"> 
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          {/* Add more tabs as needed: Performance, Settings, Risk? */}
        </TabsList>

        <TabsContent value="overview">
          <FarmOverviewTab farm={farm} />
        </TabsContent>
        <TabsContent value="agents">
          <AgentList farmId={farmId} />
        </TabsContent>
        <TabsContent value="goals">
          <FarmGoalsTab farmId={farmId} />
        </TabsContent>
        <TabsContent value="strategies">
          <FarmStrategiesTab farmId={farmId} />
        </TabsContent>
        {/* Add more TabsContent for other tabs */}
      </Tabs>
    </div>
  );
}
