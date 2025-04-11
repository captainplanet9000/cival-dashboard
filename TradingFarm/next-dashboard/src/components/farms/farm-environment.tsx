'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Database, 
  RefreshCw, 
  FileText, 
  Key, 
  Server, 
  Shield, 
  Wrench, 
  Package, 
  Circuit, 
  BarChart,
  Globe,
  Plug,
  BookOpen,
  PlusCircle,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';
import { Farm } from '@/services/farm-service';
import { toast } from '@/components/ui/use-toast';
import { FarmFileManager } from '@/components/farms/farm-file-manager';

interface FarmEnvironmentProps {
  farm: Farm;
}

export function FarmEnvironment({ farm }: FarmEnvironmentProps) {
  const [activeTab, setActiveTab] = useState('resources');
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [apiConnections, setApiConnections] = useState<any[]>([]);
  const [dataFeeds, setDataFeeds] = useState<any[]>([]);
  const [showAddResourceDialog, setShowAddResourceDialog] = useState(false);
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false);
  
  // Fetch farm environment data
  useEffect(() => {
    const fetchEnvironmentData = async () => {
      setLoading(true);
      
      try {
        // For demonstration purposes, we'll use mock data
        // In a real implementation, these would be fetch calls to appropriate endpoints
        
        // Mock resources data (tools, libraries, etc.)
        setResources([
          {
            id: '1',
            name: 'Technical Analysis Library',
            type: 'library',
            description: 'Common technical indicators and chart pattern recognition',
            status: 'active',
            version: '1.2.3',
            config: {
              enabledIndicators: ['RSI', 'MACD', 'Bollinger Bands', 'Moving Averages']
            }
          },
          {
            id: '2',
            name: 'Risk Management Module',
            type: 'tool',
            description: 'Position sizing and risk calculation utilities',
            status: 'active',
            version: '0.9.1',
            config: {
              maxPositionSize: 5,
              stopLossRequired: true
            }
          },
          {
            id: '3',
            name: 'Market Sentiment Analyzer',
            type: 'tool',
            description: 'AI-powered sentiment analysis for news and social media',
            status: 'inactive',
            version: '2.0.0',
            config: {
              sources: ['Twitter', 'Reddit', 'News APIs'],
              updateFrequency: '1h'
            }
          }
        ]);
        
        // Mock API connections
        setApiConnections([
          {
            id: '1',
            name: 'Bybit Mainnet',
            type: 'exchange',
            status: 'active',
            last_used: new Date().toISOString(),
            is_testnet: false,
            config: {
              has_credentials: true,
              permissions: ['read', 'trade', 'transfer']
            }
          },
          {
            id: '2',
            name: 'Coinbase Pro',
            type: 'exchange',
            status: 'inactive',
            last_used: null,
            is_testnet: false,
            config: {
              has_credentials: false,
              permissions: []
            }
          }
        ]);
        
        // Mock data feeds
        setDataFeeds([
          {
            id: '1',
            name: 'Crypto Market Data',
            type: 'market',
            provider: 'CoinAPI',
            status: 'active',
            update_frequency: '1m',
            assets: ['BTC', 'ETH', 'SOL', 'AVAX'],
            last_updated: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Economic Calendar',
            type: 'news',
            provider: 'FMP',
            status: 'active',
            update_frequency: '1h',
            scope: 'global',
            last_updated: new Date().toISOString()
          }
        ]);
      } catch (error) {
        console.error('Error fetching farm environment data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load farm environment data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnvironmentData();
  }, [farm.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Farm Environment</h2>
          <p className="text-muted-foreground">
            Manage tools, resources, and connections available to your farm's agents
          </p>
        </div>
        
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>
      
      <Tabs 
        defaultValue="resources" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="connections">API Connections</TabsTrigger>
          <TabsTrigger value="data">Data Sources</TabsTrigger>
          <TabsTrigger value="files">
            <FolderOpen className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="settings">Environment Settings</TabsTrigger>
        </TabsList>
        
        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Available Resources</h3>
              <p className="text-sm text-muted-foreground">
                Tools and libraries agents can use for trading and analysis
              </p>
            </div>
            
            <Dialog open={showAddResourceDialog} onOpenChange={setShowAddResourceDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Resource</DialogTitle>
                  <DialogDescription>
                    Add a new tool, library, or resource for your agents
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="resource-name" className="text-right">Name</Label>
                    <Input
                      id="resource-name"
                      placeholder="Technical Analysis Library"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="resource-type" className="text-right">Type</Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="library">Library</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="resource-description" className="text-right">Description</Label>
                    <Input
                      id="resource-description"
                      placeholder="Brief description of this resource"
                      className="col-span-3"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddResourceDialog(false)}>
                    Cancel
                  </Button>
                  <Button>Add Resource</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map(resource => (
              <Card key={resource.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {resource.type === 'library' ? (
                          <Package className="h-4 w-4 text-blue-500" />
                        ) : resource.type === 'tool' ? (
                          <Wrench className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circuit className="h-4 w-4 text-amber-500" />
                        )}
                        {resource.name}
                      </CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </div>
                    <Badge variant={resource.status === 'active' ? 'default' : 'outline'}>
                      {resource.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{resource.type}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-medium">{resource.version}</span>
                    </div>
                    
                    {resource.type === 'library' && (
                      <div className="space-y-2">
                        <div className="text-muted-foreground text-xs">Enabled Indicators:</div>
                        <div className="flex flex-wrap gap-1">
                          {resource.config.enabledIndicators.map((indicator: string) => (
                            <Badge key={indicator} variant="secondary" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {resource.type === 'tool' && resource.config.maxPositionSize && (
                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted-foreground">Max Position:</span>
                          <span className="font-medium">{resource.config.maxPositionSize}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stop Loss Required:</span>
                          <span className="font-medium">
                            {resource.config.stopLossRequired ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm">
                    Configure
                  </Button>
                  <Button variant={resource.status === 'active' ? 'destructive' : 'default'} size="sm">
                    {resource.status === 'active' ? 'Disable' : 'Enable'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* API Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">API Connections</h3>
              <p className="text-sm text-muted-foreground">
                Exchange APIs and external service connections
              </p>
            </div>
            
            <Dialog open={showAddConnectionDialog} onOpenChange={setShowAddConnectionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add API Connection</DialogTitle>
                  <DialogDescription>
                    Connect an exchange or external service API
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="service-type" className="text-right">
                      Service
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bybit">Bybit</SelectItem>
                        <SelectItem value="coinbase">Coinbase Pro</SelectItem>
                        <SelectItem value="binance">Binance</SelectItem>
                        <SelectItem value="custom">Custom API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="connection-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="connection-name"
                      placeholder="Main Trading Account"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="api-key" className="text-right">
                      API Key
                    </Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter API key"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="api-secret" className="text-right">
                      API Secret
                    </Label>
                    <Input
                      id="api-secret"
                      type="password"
                      placeholder="Enter API secret"
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Testnet</Label>
                    <div className="flex items-center space-x-2 col-span-3">
                      <Switch id="testnet" />
                      <Label htmlFor="testnet">Use testnet (paper trading)</Label>
                    </div>
                  </div>
                </div>
                
                <Alert variant="warning" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    API keys will be encrypted and stored securely. For security, only grant read and trade permissions; avoid withdrawal permissions.
                  </AlertDescription>
                </Alert>
                
                <DialogFooter className="sm:justify-end mt-4">
                  <Button variant="outline" onClick={() => setShowAddConnectionDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="button">
                    Verify & Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-4">
            {apiConnections.map(connection => (
              <Card key={connection.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Key className="h-4 w-4 text-blue-500" />
                        {connection.name}
                        {connection.is_testnet && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Testnet
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {connection.type === 'exchange' ? 'Exchange API' : 'External Service'}
                      </CardDescription>
                    </div>
                    <Badge variant={connection.status === 'active' ? 'default' : 'outline'}>
                      {connection.status === 'active' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">API Status:</span>
                      <span className={connection.config.has_credentials ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {connection.config.has_credentials ? 'Credentials Set' : 'Missing Credentials'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Permissions:</span>
                      <div className="flex gap-1">
                        {connection.config.permissions && connection.config.permissions.length > 0 ? (
                          connection.config.permissions.map((perm: string) => (
                            <Badge key={perm} variant="secondary" className="text-xs capitalize">
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                    
                    {connection.last_used && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Used:</span>
                        <span className="font-medium">
                          {new Date(connection.last_used).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm">
                    Edit Connection
                  </Button>
                  <Button variant="outline" size="sm">
                    Test Connection
                  </Button>
                  {connection.status === 'active' ? (
                    <Button variant="destructive" size="sm">
                      Disconnect
                    </Button>
                  ) : (
                    <Button variant="default" size="sm">
                      Connect
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
            
            {apiConnections.length === 0 && (
              <Card>
                <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    <Plug className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-center mb-1">No API Connections</h3>
                  <p className="text-sm text-muted-foreground text-center mb-3">
                    Add exchange APIs to allow your agents to trade
                  </p>
                  <Button onClick={() => setShowAddConnectionDialog(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add First Connection
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {/* Data Sources Tab */}
        <TabsContent value="data" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Data Sources</h3>
              <p className="text-sm text-muted-foreground">
                Market data feeds and external information sources
              </p>
            </div>
            
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          </div>
          
          <div className="space-y-4">
            {dataFeeds.map(feed => (
              <Card key={feed.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {feed.type === 'market' ? (
                          <BarChart className="h-4 w-4 text-green-500" />
                        ) : (
                          <Globe className="h-4 w-4 text-amber-500" />
                        )}
                        {feed.name}
                      </CardTitle>
                      <CardDescription>
                        Provider: {feed.provider}
                      </CardDescription>
                    </div>
                    <Badge variant={feed.status === 'active' ? 'default' : 'outline'}>
                      {feed.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{feed.type} Data</span>
                    </div>
                    
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Update Frequency:</span>
                      <span className="font-medium">{feed.update_frequency}</span>
                    </div>
                    
                    {feed.type === 'market' && feed.assets && (
                      <div className="space-y-2">
                        <div className="text-muted-foreground text-xs">Assets Covered:</div>
                        <div className="flex flex-wrap gap-1">
                          {feed.assets.map((asset: string) => (
                            <Badge key={asset} variant="secondary" className="text-xs">
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {feed.last_updated && (
                      <div className="flex justify-between mt-2">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span className="font-medium">
                          {new Date(feed.last_updated).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm">
                    Configure
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Now
                  </Button>
                  <Button variant={feed.status === 'active' ? 'destructive' : 'default'} size="sm">
                    {feed.status === 'active' ? 'Disable' : 'Enable'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <FarmFileManager farm={farm} />
        </TabsContent>
        
        {/* Environment Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Farm Environment Settings</CardTitle>
              <CardDescription>
                Configure global settings for this trading farm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security Settings</h3>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">API Key Encryption</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable encryption for all API keys and secrets
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-disconnect Idle Connections</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically disconnect APIs after 24 hours of inactivity
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Trade Execution Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Require secondary verification for trades above threshold
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Agent Permissions</h3>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Agent Access Control</Label>
                      <p className="text-sm text-muted-foreground">
                        Agents must request permission to access new resources
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Inter-agent Communication</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow agents to communicate and share information
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">External Data Sources</Label>
                      <p className="text-sm text-muted-foreground">
                        Agents can request access to external data sources
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Trading Limits</h3>
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-position-size">Max Position Size (%)</Label>
                      <Input id="max-position-size" type="number" placeholder="10" defaultValue="5" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max-drawdown">Max Drawdown (%)</Label>
                      <Input id="max-drawdown" type="number" placeholder="15" defaultValue="10" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daily-trade-limit">Daily Trade Limit</Label>
                      <Input id="daily-trade-limit" type="number" placeholder="20" defaultValue="10" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="trade-timeout">Trade Timeout (seconds)</Label>
                      <Input id="trade-timeout" type="number" placeholder="30" defaultValue="30" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
