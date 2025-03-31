"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Loader2, Activity, BarChart2, Wallet, Users, AlertTriangle } from 'lucide-react';
import RiskControl from '../risk-control';

interface Farm {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  risk_profile: {
    max_drawdown: number;
    max_trade_size?: number;
    risk_per_trade?: number;
    volatility_tolerance?: 'low' | 'medium' | 'high';
  };
  performance_metrics: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
    average_win?: number;
    average_loss?: number;
  };
  created_at: string;
  updated_at: string;
  agents?: any[];
  wallets?: any[];
  strategies?: any[];
}

export default function FarmDetailPage() {
  const params = useParams();
  const farmId = parseInt(params.id as string, 10);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load farm data
  useEffect(() => {
    async function loadFarm() {
      try {
        setLoading(true);
        const response = await api.getFarm(farmId);
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setFarm(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch farm details');
      } finally {
        setLoading(false);
      }
    }
    
    if (farmId) {
      loadFarm();
    }
  }, [farmId]);

  // Handle farm data refresh
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await api.getFarm(farmId);
      if (response.data) {
        setFarm(response.data);
        setError(null);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh farm data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        <p className="font-medium">Error loading farm</p>
        <p>{error || 'Farm not found'}</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{farm.name}</h1>
          {farm.description && (
            <p className="text-muted-foreground mt-1">{farm.description}</p>
          )}
        </div>
        
        <div className={`px-2 py-1 rounded text-sm font-medium ${
          farm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {farm.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>
      
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (farm.performance_metrics?.total_profit_loss || 0) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(farm.performance_metrics?.total_profit_loss)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(farm.performance_metrics?.win_rate || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farm.performance_metrics?.trades_count || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Max Drawdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatPercentage(farm.risk_profile?.max_drawdown / 100 || 0)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="wallets">
            <Wallet className="h-4 w-4 mr-2" />
            Wallets
          </TabsTrigger>
          <TabsTrigger value="risk">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Risk Management
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart2 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Farm Details</CardTitle>
                <CardDescription>Basic information about this farm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span>{farm.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(farm.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{new Date(farm.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Agents</span>
                    <span>{farm.agents?.filter(a => a.is_active).length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strategies</span>
                    <span>{farm.strategies?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Risk Profile</CardTitle>
                <CardDescription>Current risk parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span>{farm.risk_profile?.max_drawdown || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Per Trade</span>
                    <span>{farm.risk_profile?.risk_per_trade || 1}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Trade Size</span>
                    <span>{formatCurrency(farm.risk_profile?.max_trade_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volatility Tolerance</span>
                    <span className="capitalize">{farm.risk_profile?.volatility_tolerance || 'medium'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Key trading metrics for this farm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Win Rate</h3>
                  <p className="text-2xl font-bold">{formatPercentage(farm.performance_metrics?.win_rate || 0)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Profit Factor</h3>
                  <p className="text-2xl font-bold">{farm.performance_metrics?.profit_factor?.toFixed(2) || 'N/A'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Average Win</h3>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(farm.performance_metrics?.average_win)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Average Loss</h3>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(farm.performance_metrics?.average_loss)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Farm Agents</CardTitle>
              <CardDescription>Trading agents in this farm</CardDescription>
            </CardHeader>
            <CardContent>
              {farm.agents && farm.agents.length > 0 ? (
                <div className="space-y-4">
                  {farm.agents.map((agent) => (
                    <div key={agent.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{agent.name}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No agents found for this farm.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Wallets Tab */}
        <TabsContent value="wallets">
          <Card>
            <CardHeader>
              <CardTitle>Farm Wallets</CardTitle>
              <CardDescription>Connected wallets and balances</CardDescription>
            </CardHeader>
            <CardContent>
              {farm.wallets && farm.wallets.length > 0 ? (
                <div className="space-y-4">
                  {farm.wallets.map((wallet) => (
                    <div key={wallet.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{wallet.name}</h3>
                        <div className="text-lg font-bold">
                          {formatCurrency(wallet.balance)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{wallet.currency} • {wallet.wallet_type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No wallets found for this farm.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Risk Management Tab */}
        <TabsContent value="risk">
          <RiskControl 
            farmId={farmId} 
            initialRiskProfile={farm.risk_profile}
            onUpdate={handleRefresh}
          />
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed performance metrics and charts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Performance visualization not yet implemented.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 