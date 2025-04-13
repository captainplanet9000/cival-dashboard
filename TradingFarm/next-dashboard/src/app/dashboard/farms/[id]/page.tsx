"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, RefreshCw, Edit, Trash, Play, Pause, Settings, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFarms, useAgents, Farm, Agent } from '@/hooks';
import { AgentList } from '@/components/agents/agent-list';
import { useNotifications } from '@/components/notifications/notification-provider';

export default function FarmDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const { addNotification } = useNotifications();
  
  // Fetch farm data
  const { 
    farms, 
    loading: farmsLoading, 
    error: farmsError, 
    getFarmById,
    refresh: refreshFarms
  } = useFarms({ enableRealtime: true });
  
  // Get the specific farm by ID
  const farm = getFarmById(farmId);
  
  // Fetch agents for this farm
  const {
    agents,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
    counts: agentCounts
  } = useAgents({ farmId, enableRealtime: true });

  // Handle farm status change
  const handleStatusChange = (newStatus: boolean) => {
    // In a real app, this would call a mutation to update the farm
    console.log(`Change farm ${farmId} status to ${newStatus ? 'active' : 'inactive'}`);
    
    // Show a notification for testing
    addNotification({
      type: 'success',
      title: 'Farm Status Changed',
      message: `Farm status has been changed to ${newStatus ? 'active' : 'inactive'}.`,
      data: { farmId, newStatus }
    });
  };

  // Handle navigation back to farms list
  const handleBack = () => {
    router.push('/dashboard/farms');
  };

  // Handle navigation to edit page
  const handleEdit = () => {
    router.push(`/dashboard/farms/${farmId}/edit`);
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this farm?')) {
      // In a real app, this would call a mutation to delete the farm
      console.log(`Delete farm ${farmId}`);
      router.push('/dashboard/farms');
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refreshFarms();
    refreshAgents();
  };

  // Handle agent actions
  const handleEditAgent = (agent: Agent) => {
    router.push(`/dashboard/agents/${agent.id}/edit`);
  };

  const handleAgentStatusChange = (agent: Agent, newStatus: boolean) => {
    // In a real app, this would call a mutation to update the agent
    console.log(`Change agent ${agent.id} status to ${newStatus ? 'active' : 'inactive'}`);
    
    // Show a notification for testing
    addNotification({
      type: 'info',
      title: 'Agent Status Changed',
      message: `Agent status has been changed to ${newStatus ? 'active' : 'inactive'}.`,
      data: { agentId: agent.id, newStatus }
    });
  };

  // Loading state
  if (farmsLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-[250px] w-full" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (farmsError || !farm) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" size="sm" className="gap-1" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4" /> Back to Farms
        </Button>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-red-500">Farm Not Found</CardTitle>
            <CardDescription>
              The farm you're looking for does not exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{farmsError || 'Unable to find farm with the specified ID'}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack}>Return to Farms List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Get the farm status badge
  const getStatusBadge = () => {
    if (!farm.is_active) {
      return <Badge variant="outline" className="ml-2 bg-gray-100">Inactive</Badge>;
    }

    switch (farm.status.toLowerCase()) {
      case 'active':
        return <Badge className="ml-2 bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="ml-2">Paused</Badge>;
      case 'error':
        return <Badge variant="destructive" className="ml-2">Error</Badge>;
      default:
        return <Badge variant="outline" className="ml-2">{farm.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold flex items-center">
            {farm.name}
            {getStatusBadge()}
          </h1>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          
          <Button 
            variant={farm.is_active ? 'outline' : 'default'} 
            size="sm"
            onClick={() => handleStatusChange(!farm.is_active)}
          >
            {farm.is_active ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      {/* Farm description */}
      {farm.description && (
        <p className="text-muted-foreground">{farm.description}</p>
      )}
      
      {/* Tabs section */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents ({agentCounts.total})</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{farm.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(farm.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Agents</p>
                    <p className="font-medium">{agentCounts.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Agents</p>
                    <p className="font-medium">{agentCounts.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Farm Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {farm.settings ? (
                    Object.entries(farm.settings as Record<string, any>).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                        <p className="font-medium">
                          {typeof value === 'object' 
                            ? JSON.stringify(value) 
                            : String(value)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No settings configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Performance (24h)</p>
                    <p className="text-2xl font-bold text-green-500">+2.4%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Strategies</p>
                    <p className="font-medium">3</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="font-medium">27</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Activity Feed Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-2 border-b pb-4 last:border-0">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Event {i}</p>
                      <p className="text-sm text-muted-foreground">
                        Some details about this event that happened on the farm.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents">
          <AgentList 
            farmId={farmId}
            onEdit={handleEditAgent}
            onStatusChange={handleAgentStatusChange}
          />
        </TabsContent>
        
        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Real-time performance data for your farm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border rounded">
                <p className="text-muted-foreground">Performance chart will be displayed here</p>
              </div>
              
              <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-4">
                {['ROI', 'Win Rate', 'Profit Factor', 'Drawdown'].map((metric) => (
                  <Card key={metric}>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{metric}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold">
                        {metric === 'ROI' && '+12.5%'}
                        {metric === 'Win Rate' && '68%'}
                        {metric === 'Profit Factor' && '1.75'}
                        {metric === 'Drawdown' && '4.2%'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Farm Settings
              </CardTitle>
              <CardDescription>
                Configure your farm's operational parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Settings form will be implemented here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}