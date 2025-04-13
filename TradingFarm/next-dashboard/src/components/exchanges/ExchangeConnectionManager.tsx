"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Plus,
  RotateCw,
  Settings,
  Trash,
  XCircle,
} from "lucide-react";
import { ExchangeConnectionForm } from "./ExchangeConnectionForm";
import databaseService from "@/services/database-service";
import exchangeMonitoringService, { HealthStatus } from "@/services/exchange-monitoring-service";
import websocketService, { WebSocketTopic } from "@/services/websocket-service";
import { ConnectionState } from "@/services/exchange-websocket-service";

// Type for exchange connection records
interface ExchangeConnection {
  id: number;
  exchange_name: string;
  chain?: string;
  api_key: string;
  label?: string;
  is_testnet: boolean;
  permissions: {
    trade: boolean;
    withdraw: boolean;
    deposit: boolean;
  };
  created_at: string;
  last_used_at?: string;
  health_status?: HealthStatus;
  connection_state?: ConnectionState;
}

export function ExchangeConnectionManager() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [editingConnection, setEditingConnection] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<number | null>(null);

  // Load connections on mount
  useEffect(() => {
    loadConnections();

    // Subscribe to connection status updates
    const unsubscribe = websocketService.subscribeToTopic(
      WebSocketTopic.SYSTEM,
      handleConnectionUpdate
    );

    // Start monitoring all connections
    connections.forEach((connection) => {
      exchangeMonitoringService.startMonitoring(
        connection.exchange_name as any,
        connection.id
      );
    });

    return () => {
      unsubscribe();
      // Stop all monitoring on unmount
      connections.forEach((connection) => {
        exchangeMonitoringService.stopMonitoring(
          connection.exchange_name as any
        );
      });
    };
  }, []);

  // Handle connection status updates from WebSocket
  const handleConnectionUpdate = (message: any) => {
    if (message.type === "exchange_health") {
      setConnections((prev) =>
        prev.map((conn) => {
          if (conn.exchange_name === message.exchange) {
            return {
              ...conn,
              health_status: message.data.healthStatus,
              connection_state: message.data.connectionState,
            };
          }
          return conn;
        })
      );
    }
  };

  // Load all connections
  const loadConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await databaseService.select(
        "exchange_credentials",
        "id, exchange_name, chain, api_key, label, is_testnet, permissions, created_at, last_used_at"
      );

      if (error) {
        throw error;
      }

      if (data) {
        // Get health status for each connection
        const connectionsWithHealth = data.map((conn: any) => {
          const health = exchangeMonitoringService.getExchangeStats(
            conn.exchange_name
          );
          
          return {
            ...conn,
            health_status: health?.healthStatus || HealthStatus.UNKNOWN,
            connection_state: health?.connectionState || ConnectionState.DISCONNECTED,
          };
        });

        setConnections(connectionsWithHealth);
        
        // Start monitoring for each connection
        connectionsWithHealth.forEach((conn: ExchangeConnection) => {
          exchangeMonitoringService.startMonitoring(
            conn.exchange_name as any,
            conn.id
          );
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading connections",
        description: error.message || "An unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete a connection
  const deleteConnection = async (id: number) => {
    try {
      const { error } = await databaseService.delete("exchange_credentials", {
        id,
      });

      if (error) {
        throw error;
      }

      // Get the exchange name before removing from local state
      const connection = connections.find((c) => c.id === id);
      if (connection) {
        exchangeMonitoringService.stopMonitoring(connection.exchange_name as any);
      }

      setConnections((prev) => prev.filter((conn) => conn.id !== id));
      
      toast({
        title: "Connection deleted",
        description: "Exchange connection has been removed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting connection",
        description: error.message || "An unknown error occurred",
      });
    } finally {
      setConnectionToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Handle connection save
  const handleConnectionSave = (connectionId: number) => {
    loadConnections();
    setEditingConnection(null);
    setAddDialogOpen(false);
  };

  // Test all connections
  const testAllConnections = () => {
    connections.forEach((conn) => {
      exchangeMonitoringService.checkExchangeHealth(
        conn.exchange_name as any,
        conn.id
      );
    });
    toast({
      title: "Testing connections",
      description: "Checking health of all exchange connections...",
    });
  };

  // Filter connections based on active tab
  const filteredConnections = connections.filter((conn) => {
    if (activeTab === "all") return true;
    if (activeTab === "active" && conn.health_status === HealthStatus.HEALTHY)
      return true;
    if (activeTab === "issues" && conn.health_status !== HealthStatus.HEALTHY)
      return true;
    if (activeTab === conn.exchange_name) return true;
    return false;
  });

  // Get health badge based on status
  const getHealthBadge = (status?: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Healthy
          </Badge>
        );
      case HealthStatus.DEGRADED:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> Degraded
          </Badge>
        );
      case HealthStatus.UNHEALTHY:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Unhealthy
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exchange Connections</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={testAllConnections}>
            <RotateCw className="w-4 h-4 mr-2" />
            Test All
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Exchange Connection</DialogTitle>
                <DialogDescription>
                  Enter your exchange API credentials to connect to the exchange.
                </DialogDescription>
              </DialogHeader>
              <ExchangeConnectionForm onSuccess={handleConnectionSave} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="bybit">Bybit</TabsTrigger>
          <TabsTrigger value="hyperliquid">Hyperliquid</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center">Loading connections...</div>
              ) : filteredConnections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConnections.map((conn) => (
                      <TableRow key={conn.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {conn.exchange_name}
                            {conn.chain && (
                              <Badge variant="outline" className="ml-2">
                                {conn.chain}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{conn.label || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={conn.is_testnet ? "outline" : "default"}
                          >
                            {conn.is_testnet ? "Testnet" : "Mainnet"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {conn.permissions.trade && (
                              <Badge variant="secondary" className="text-xs">
                                Trade
                              </Badge>
                            )}
                            {conn.permissions.withdraw && (
                              <Badge variant="destructive" className="text-xs">
                                Withdraw
                              </Badge>
                            )}
                            {conn.permissions.deposit && (
                              <Badge variant="secondary" className="text-xs">
                                Deposit
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getHealthBadge(conn.health_status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog
                              open={editingConnection === conn.id}
                              onOpenChange={(open) =>
                                setEditingConnection(open ? conn.id : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingConnection(conn.id)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Exchange Connection</DialogTitle>
                                  <DialogDescription>
                                    Update your exchange API credentials.
                                  </DialogDescription>
                                </DialogHeader>
                                <ExchangeConnectionForm
                                  credentialId={conn.id}
                                  onSuccess={handleConnectionSave}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setConnectionToDelete(conn.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No exchange connections found.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this exchange connection? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                connectionToDelete && deleteConnection(connectionToDelete)
              }
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExchangeConnectionManager;
