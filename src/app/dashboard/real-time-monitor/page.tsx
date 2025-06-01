'use client';

import React, { useState } from 'react';
import { RealTimeDashboard } from '@/components/dashboards/real-time-dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFarms, useAgents } from '@/hooks';

export default function RealTimeMonitorPage() {
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  
  // Fetch farms and agents data
  const { farms, loading: farmsLoading } = useFarms();
  const { agents, loading: agentsLoading } = useAgents({ farmId: selectedFarmId !== 'all' ? selectedFarmId : undefined });
  
  // Handle refresh rate change
  const handleRefreshRateChange = (value: string) => {
    setRefreshInterval(parseInt(value));
  };
  
  // Handle farm selection change
  const handleFarmChange = (value: string) => {
    setSelectedFarmId(value);
    setSelectedAgentId('all'); // Reset agent selection when farm changes
  };
  
  // Handle agent selection change
  const handleAgentChange = (value: string) => {
    setSelectedAgentId(value);
  };
  
  return (
    <div className="container mx-auto py-4 space-y-6">
      <h1 className="text-3xl font-bold">Real-Time Monitoring</h1>
      
      {/* Filter and Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Controls</CardTitle>
          <CardDescription>
            Filter and configure your real-time monitoring display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Farm Selector */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Farm</label>
              <Select
                value={selectedFarmId}
                onValueChange={handleFarmChange}
                disabled={farmsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Farms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farms</SelectItem>
                  {farms?.map(farm => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Agent Selector */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Agent</label>
              <Select
                value={selectedAgentId}
                onValueChange={handleAgentChange}
                disabled={agentsLoading || selectedFarmId === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedFarmId === 'all' ? 'Select a farm first' : 'All Agents'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents?.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Refresh Rate Selector */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Refresh Rate</label>
              <Select
                value={refreshInterval.toString()}
                onValueChange={handleRefreshRateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="30 seconds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000">5 seconds</SelectItem>
                  <SelectItem value="15000">15 seconds</SelectItem>
                  <SelectItem value="30000">30 seconds</SelectItem>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Real Time Dashboard */}
      <RealTimeDashboard 
        farmId={selectedFarmId !== 'all' ? selectedFarmId : undefined}
        agentId={selectedAgentId !== 'all' ? selectedAgentId : undefined}
        refreshInterval={refreshInterval}
      />
    </div>
  );
} 