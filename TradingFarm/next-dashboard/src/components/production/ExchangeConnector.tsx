"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CircleDollarSign, 
  Plus, 
  Settings, 
  Trash, 
  Check, 
  X, 
  RefreshCw,
  Key,
  ShieldAlert,
  AlertTriangle,
  Globe
} from "lucide-react";

interface ExchangeConnectorProps {
  onConnect?: (exchangeId: string, apiKey: string, apiSecret: string) => void;
  onDisconnect?: (exchangeId: string) => void;
}

export function ExchangeConnector({
  onConnect,
  onDisconnect
}: ExchangeConnectorProps) {
  // Mock exchange data
  const [exchanges, setExchanges] = useState([
    { 
      id: "binance", 
      name: "Binance", 
      logo: "/exchanges/binance.svg", 
      connected: true, 
      active: true,
      tradingEnabled: true,
      lastSynced: "2025-04-12T14:32:00Z",
      assets: 12,
      balance: "$128,450.32"
    },
    { 
      id: "coinbase", 
      name: "Coinbase Pro", 
      logo: "/exchanges/coinbase.svg", 
      connected: true, 
      active: true,
      tradingEnabled: false,
      lastSynced: "2025-04-12T13:15:00Z",
      assets: 8,
      balance: "$75,320.18"
    },
    { 
      id: "ftx", 
      name: "FTX", 
      logo: "/exchanges/ftx.svg", 
      connected: false, 
      active: false,
      tradingEnabled: false,
      lastSynced: null,
      assets: 0,
      balance: "$0.00"
    },
    { 
      id: "kraken", 
      name: "Kraken", 
      logo: "/exchanges/kraken.svg", 
      connected: false, 
      active: false,
      tradingEnabled: false,
      lastSynced: null,
      assets: 0,
      balance: "$0.00"
    },
    { 
      id: "kucoin", 
      name: "KuCoin", 
      logo: "/exchanges/kucoin.svg", 
      connected: false, 
      active: false,
      tradingEnabled: false,
      lastSynced: null,
      assets: 0,
      balance: "$0.00"
    }
  ]);
  
  // Form state for API credentials
  const [formState, setFormState] = useState({
    exchangeId: "",
    apiKey: "",
    apiSecret: "",
    label: "",
    tradingEnabled: false
  });
  
  // Connection
  const [connecting, setConnecting] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Connect to exchange
  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setExchanges(prev => 
        prev.map(exchange => 
          exchange.id === formState.exchangeId ? 
            { 
              ...exchange, 
              connected: true, 
              active: true,
              tradingEnabled: formState.tradingEnabled,
              lastSynced: new Date().toISOString(),
              assets: Math.floor(Math.random() * 15) + 1,
              balance: `$${((Math.random() * 100000) + 10000).toFixed(2)}`
            } : 
            exchange
        )
      );
      
      setFormState({
        exchangeId: "",
        apiKey: "",
        apiSecret: "",
        label: "",
        tradingEnabled: false
      });
      
      setConnecting(false);
      
      if (onConnect) {
        onConnect(formState.exchangeId, formState.apiKey, formState.apiSecret);
      }
    }, 1500);
  };
  
  // Disconnect exchange
  const handleDisconnect = (exchangeId: string) => {
    setExchanges(prev => 
      prev.map(exchange => 
        exchange.id === exchangeId ? 
          { ...exchange, connected: false, active: false, tradingEnabled: false } : 
          exchange
      )
    );
    
    if (onDisconnect) {
      onDisconnect(exchangeId);
    }
  };
  
  // Toggle trading
  const toggleTrading = (exchangeId: string, enabled: boolean) => {
    setExchanges(prev => 
      prev.map(exchange => 
        exchange.id === exchangeId ? 
          { ...exchange, tradingEnabled: enabled } : 
          exchange
      )
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exchange Connectors</h2>
          <p className="text-muted-foreground">
            Connect to trading exchanges and manage API connections
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="connected">
        <TabsList>
          <TabsTrigger value="connected">Connected Exchanges</TabsTrigger>
          <TabsTrigger value="available">Available Exchanges</TabsTrigger>
          <TabsTrigger value="api-keys">API Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connected" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Connected Exchanges</CardTitle>
              <CardDescription>
                Exchanges that are currently connected to your Trading Farm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trading</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchanges.filter(exchange => exchange.connected).map((exchange) => (
                    <TableRow key={exchange.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <CircleDollarSign className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{exchange.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {exchange.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {exchange.active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                            Disconnected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={exchange.tradingEnabled} 
                            onCheckedChange={(checked) => toggleTrading(exchange.id, checked)}
                          />
                          <span className="text-sm">{exchange.tradingEnabled ? "Enabled" : "Disabled"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(exchange.lastSynced)}
                      </TableCell>
                      <TableCell>
                        {exchange.assets}
                      </TableCell>
                      <TableCell>
                        {exchange.balance}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDisconnect(exchange.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {exchanges.filter(exchange => exchange.connected).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Globe className="h-8 w-8 mb-2 opacity-40" />
                          <p>No exchanges connected</p>
                          <p className="text-sm">Connect an exchange to get started with live trading</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="available" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {exchanges.map((exchange) => (
              <Card key={exchange.id} className={exchange.connected ? "border-primary/20 bg-primary/5" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <CircleDollarSign className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{exchange.name}</CardTitle>
                    </div>
                    {exchange.connected && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Connected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {exchange.connected ? 
                        "This exchange is already connected to your account." :
                        "Connect to this exchange to enable trading functionality."
                      }
                    </div>
                    
                    {exchange.connected && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Assets</div>
                          <div className="font-medium">{exchange.assets}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Balance</div>
                          <div className="font-medium">{exchange.balance}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  {exchange.connected ? (
                    <div className="flex space-x-2 w-full">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDisconnect(exchange.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setSelectedExchange(exchange.id);
                        setFormState(prev => ({ ...prev, exchangeId: exchange.id }));
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Exchange
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="api-keys" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Manage your API keys for exchange connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-md flex items-start space-x-2">
                <ShieldAlert className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Security Notice</p>
                  <p className="mt-1">
                    API keys provide direct access to your exchange accounts. Always create keys with appropriate permissions and restrictions:
                  </p>
                  <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
                    <li>Use read-only permissions when possible</li>
                    <li>Enable IP whitelisting when available</li>
                    <li>Set trading limits on your exchange</li>
                    <li>Never share your API secret</li>
                  </ul>
                </div>
              </div>
              
              {selectedExchange && (
                <div className="border rounded-md p-4 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">Connect to {exchanges.find(e => e.id === selectedExchange)?.name}</h3>
                    <p className="text-sm text-muted-foreground">Enter your API credentials below</p>
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="connection-label">Connection Label</Label>
                      <Input
                        id="connection-label"
                        placeholder="e.g., Main Trading Account"
                        value={formState.label}
                        onChange={(e) => setFormState(prev => ({ ...prev, label: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        placeholder="Enter your API key"
                        type="password"
                        value={formState.apiKey}
                        onChange={(e) => setFormState(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="api-secret">API Secret</Label>
                      <Input
                        id="api-secret"
                        placeholder="Enter your API secret"
                        type="password"
                        value={formState.apiSecret}
                        onChange={(e) => setFormState(prev => ({ ...prev, apiSecret: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="trading-enabled"
                        checked={formState.tradingEnabled}
                        onCheckedChange={(checked) => setFormState(prev => ({ ...prev, tradingEnabled: checked }))}
                      />
                      <Label htmlFor="trading-enabled">Enable Trading (not just read-only)</Label>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedExchange(null);
                          setFormState({
                            exchangeId: "",
                            apiKey: "",
                            apiSecret: "",
                            label: "",
                            tradingEnabled: false
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleConnect}
                        disabled={!formState.apiKey || !formState.apiSecret || connecting}
                      >
                        {connecting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Connect Exchange
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
