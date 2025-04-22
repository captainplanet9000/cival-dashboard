import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Database } from "@/types/database.types";
import { createBrowserClient } from "@/utils/supabase/client";

type Agent = Database['public']['Tables']['agents']['Row'];

type AgentMetadata = {
  name: string;
  description?: string;
  farm?: string | null;
  strategy?: string;
  performance?: number | string;
  maxPositions?: number;
  riskLevel?: "Low" | "Medium" | "High";
  tradingPairs?: string[];
  [key: string]: any;
};

interface Position {
  pair: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  timestamp: string;
}

interface PerformanceData {
  date: string;
  value: number;
}

interface AgentDetailsProps {
  agent: Agent | null;
  onClose: () => void;
  onAgentUpdate: () => Promise<void>;
}

const mockPerformanceHistory: PerformanceData[] = [
  { date: "2024-01-01", value: 0 },
  { date: "2024-01-02", value: 2.5 },
  { date: "2024-01-03", value: 1.8 },
  { date: "2024-01-04", value: 4.2 },
  { date: "2024-01-05", value: 3.7 },
  { date: "2024-01-06", value: 5.1 },
  { date: "2024-01-07", value: 6.3 },
];

const mockPositions: Position[] = [
  {
    pair: "BTC/USD",
    side: "long",
    size: 0.5,
    entryPrice: 42000,
    currentPrice: 43500,
    pnl: 750,
    timestamp: "2024-01-07T10:30:00Z",
  },
  {
    pair: "ETH/USD",
    side: "short",
    size: 5,
    entryPrice: 2300,
    currentPrice: 2250,
    pnl: 250,
    timestamp: "2024-01-07T11:15:00Z",
  },
];

export function AgentDetails({ agent, onClose, onAgentUpdate }: AgentDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);

  const open = !!agent;

  if (!agent) return null;

  const metadata = (agent.metadata ?? {}) as AgentMetadata;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "running":
        return "bg-green-500";
      case "paused":
      case "idle":
        return "bg-yellow-500";
      case "error":
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const handleToggleAgentStatus = async () => {
    if (!agent) return;

    setIsUpdating(true);
    const newStatus = agent.status === 'active' ? 'paused' : 'active'; // Determine new status
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) {
        throw error;
      }

      console.log(`Agent ${agent.id} status updated to ${newStatus}`);
      await onAgentUpdate(); // Refetch the agent list
      // Optionally close the modal after update:
      // onClose();
    } catch (error) {
      console.error('Error updating agent status:', error);
      // TODO: Show error message to user (e.g., using a toast notification)
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetAgent = async () => {
    if (!agent) return;

    // Optional: Add a confirmation dialog here
    // if (!confirm("Are you sure you want to reset this agent?")) {
    //   return;
    // }

    setIsUpdating(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase.rpc('reset_agent', { agent_id: agent.id });

      if (error) {
        throw error;
      }

      console.log(`Agent ${agent.id} reset request sent.`);
      await onAgentUpdate(); // Refetch the agent list
      // Optionally close the modal after reset:
      // onClose();
    } catch (error) {
      console.error('Error resetting agent:', error);
      // TODO: Show error message to user (e.g., using a toast notification)
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{metadata.name ?? agent.id}</span>
            <Badge className={getStatusColor(agent.status)}>
              {agent.status ? agent.status.charAt(0).toUpperCase() + agent.status.slice(1) : 'Unknown'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd>{agent.agent_type ?? 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Farm</dt>
                      <dd>{metadata.farm || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Strategy</dt>
                      <dd>{metadata.strategy || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Performance</dt>
                      <dd>{metadata.performance ?? 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Active</dt>
                      <dd>{formatDate(agent.last_heartbeat_at)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Current Performance</dt>
                      <dd className="text-2xl font-semibold">
                        {metadata.performance ?? 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {metadata.description || "No description available."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle>Current Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPositions.map((position, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{position.pair}</h4>
                            <Badge className={position.side === "long" ? "bg-green-500" : "bg-red-500"}>
                              {position.side.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${position.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(position.pnl)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Size: {position.size}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Entry: {formatCurrency(position.entryPrice)}</p>
                          <p>Current: {formatCurrency(position.currentPrice)}</p>
                          <p>Opened: {formatDate(position.timestamp)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockPerformanceHistory}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Agent Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Actions</h4>
                    <div className="flex space-x-2">
                      <Button
                        variant={agent.status === "active" ? "destructive" : "default"}
                        onClick={handleToggleAgentStatus}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Updating...' : (agent.status === "active" ? "Pause Agent" : "Start Agent")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetAgent}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Resetting...' : 'Reset Agent'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Configuration</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Max Positions</dt>
                        <dd>{metadata.maxPositions ?? 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Risk Level</dt>
                        <dd>{metadata.riskLevel ?? 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Trading Pairs</dt>
                        <dd>{metadata.tradingPairs?.join(", ") ?? 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}