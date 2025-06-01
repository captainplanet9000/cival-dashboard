"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

// Mock data - would be replaced with real-time data from API/socket
const initialFarms: FarmData[] = [
  {
    id: "farm-001",
    name: "Bitcoin Trend Following",
    status: "active",
    profit: 12.4,
    trades: 78,
    lastTrade: "2 min ago",
    performance: 18.7,
    uptime: "99.8%",
    errors: 0,
    warnings: 1
  },
  {
    id: "farm-002",
    name: "Ethereum Liquidity Provider",
    status: "active",
    profit: 8.2,
    trades: 142,
    lastTrade: "30 sec ago",
    performance: 11.3,
    uptime: "99.9%",
    errors: 0,
    warnings: 0
  },
  {
    id: "farm-003",
    name: "Cross-Chain Arbitrage",
    status: "warning",
    profit: 5.6,
    trades: 93,
    lastTrade: "5 min ago",
    performance: -2.1,
    uptime: "98.2%",
    errors: 1,
    warnings: 3
  },
  {
    id: "farm-004",
    name: "DeFi Yield Harvester",
    status: "error",
    profit: -3.2,
    trades: 46,
    lastTrade: "1 hour ago",
    performance: -8.7,
    uptime: "92.5%",
    errors: 3,
    warnings: 2
  },
  {
    id: "farm-005",
    name: "Forex Momentum Strategy",
    status: "inactive",
    profit: 0,
    trades: 0,
    lastTrade: "3 days ago",
    performance: 0,
    uptime: "0%",
    errors: 0,
    warnings: 0
  }
];

interface FarmData {
  id: string;
  name: string;
  status: "active" | "inactive" | "warning" | "error";
  profit: number;
  trades: number;
  lastTrade: string;
  performance: number;
  uptime: string;
  errors: number;
  warnings: number;
}

interface FarmCardProps {
  farm: FarmData;
  onSelect: (id: string) => void;
}

const FarmCard = ({ farm, onSelect }: FarmCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "error": return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200" 
      onClick={() => onSelect(farm.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">{farm.name}</CardTitle>
          <Badge className={`${getStatusColor(farm.status)} text-white`}>
            <span className="flex items-center">
              {getStatusIcon(farm.status)}
              <span className="ml-1 capitalize">{farm.status}</span>
            </span>
          </Badge>
        </div>
        <CardDescription>Last trade: {farm.lastTrade}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Profit/Loss</p>
            <div className={`flex items-center font-medium ${farm.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {farm.profit >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {farm.profit}%
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="font-medium">{farm.trades}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Performance</p>
            <div className={`flex items-center font-medium ${farm.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {farm.performance >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {farm.performance}%
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Uptime</p>
            <p className="font-medium">{farm.uptime}</p>
          </div>
        </div>
        {(farm.errors > 0 || farm.warnings > 0) && (
          <div className="mt-3 text-xs">
            {farm.errors > 0 && (
              <Badge variant="destructive" className="mr-2">
                {farm.errors} Error{farm.errors > 1 ? 's' : ''}
              </Badge>
            )}
            {farm.warnings > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                {farm.warnings} Warning{farm.warnings > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export interface RealtimeMonitorProps {
  updateInterval?: number;
  initialFilter?: string;
}

export function RealtimeMonitor({
  updateInterval = 10000,
  initialFilter = "all"
}: RealtimeMonitorProps): JSX.Element {
  const [farms, setFarms] = useState<FarmData[]>(initialFarms);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(initialFilter);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real app, this would fetch from an API or socket
      const updatedFarms = farms.map(farm => {
        // Randomly update some values to simulate real-time changes
        if (farm.status === 'active') {
          const profitChange = (Math.random() * 0.4) - 0.2;
          const newTradeChance = Math.random() > 0.7;
          
          return {
            ...farm,
            profit: parseFloat((farm.profit + profitChange).toFixed(1)),
            trades: newTradeChance ? farm.trades + 1 : farm.trades,
            lastTrade: newTradeChance ? 'just now' : farm.lastTrade,
            performance: parseFloat((farm.performance + (profitChange * 1.5)).toFixed(1)),
          };
        }
        return farm;
      });
      
      setFarms(updatedFarms);
      setLastUpdated(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [farms, updateInterval]);

  const filteredFarms = farms.filter(farm => {
    if (filter === 'all') return true;
    return farm.status === filter;
  });

  const selectedFarm = farms.find(farm => farm.id === selectedFarmId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Farm Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Farms</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="warning">Warnings</TabsTrigger>
            <TabsTrigger value="error">Errors</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredFarms.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No farms matching the selected filter</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFarms.map((farm, index) => {
            // The key is a special prop that React uses for reconciliation
            // and is not actually passed to the component
            return (
              <div key={farm.id}>
                <FarmCard
                  farm={farm} 
                  onSelect={setSelectedFarmId} 
                />
              </div>
            );
          })}
        </div>
      )}

      {selectedFarm && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Farm Details: {selectedFarm.name}</CardTitle>
              <Badge className={`${selectedFarm.status === 'active' ? 'bg-green-500' : selectedFarm.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                {selectedFarm.status.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>
              Real-time performance metrics and status information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Current Profit</p>
                    <p className={`text-xl font-bold ${selectedFarm.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedFarm.profit}%
                    </p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-xl font-bold">{selectedFarm.trades}</p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Overall Performance</p>
                    <p className={`text-xl font-bold ${selectedFarm.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedFarm.performance}%
                    </p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">System Uptime</p>
                    <p className="text-xl font-bold">{selectedFarm.uptime}</p>
                  </div>
                </div>

                <h4 className="font-medium pt-2">Recent Activity</h4>
                <div className="space-y-2">
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Trade Executed</span>
                      <span className="text-sm font-medium">{selectedFarm.lastTrade}</span>
                    </div>
                  </div>
                  {(selectedFarm.errors > 0 || selectedFarm.warnings > 0) && (
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Issues Detected</span>
                        <div>
                          {selectedFarm.errors > 0 && (
                            <Badge variant="destructive" className="mr-2">
                              {selectedFarm.errors} Error{selectedFarm.errors > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {selectedFarm.warnings > 0 && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                              {selectedFarm.warnings} Warning{selectedFarm.warnings > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Farm Control</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                    {selectedFarm.status === 'active' ? 'Pause Farm' : 'Activate Farm'}
                  </button>
                  <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors">
                    Restart Farm
                  </button>
                  <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors">
                    View Logs
                  </button>
                  <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors">
                    Edit Settings
                  </button>
                </div>

                <h4 className="font-medium pt-2">Quick Actions</h4>
                <div className="space-y-2">
                  <div className="bg-secondary/50 p-3 rounded-lg flex items-center justify-between">
                    <span>Auto-rebalance on threshold</span>
                    <div className="h-5 w-9 bg-primary rounded-full relative cursor-pointer">
                      <div className="h-4 w-4 bg-white rounded-full absolute top-0.5 right-0.5" />
                    </div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg flex items-center justify-between">
                    <span>Emergency stop on loss</span>
                    <div className="h-5 w-9 bg-primary rounded-full relative cursor-pointer">
                      <div className="h-4 w-4 bg-white rounded-full absolute top-0.5 right-0.5" />
                    </div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg flex items-center justify-between">
                    <span>Adaptive position sizing</span>
                    <div className="h-5 w-9 bg-gray-400 rounded-full relative cursor-pointer">
                      <div className="h-4 w-4 bg-white rounded-full absolute top-0.5 left-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
