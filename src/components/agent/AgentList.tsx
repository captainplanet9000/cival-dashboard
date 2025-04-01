import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentDetails } from "./AgentDetails";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline" | "error" | "maintenance";
  farm: string | null;
  strategy: string | null;
  performance: number;
  lastActive: string;
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Alpha Trader",
    type: "Momentum",
    status: "online",
    farm: "High Frequency Farm",
    strategy: "RSI Momentum",
    performance: 12.5,
    lastActive: "2024-03-20T10:30:00Z",
  },
  {
    id: "2",
    name: "Beta Scanner",
    type: "Mean Reversion",
    status: "offline",
    farm: null,
    strategy: "Bollinger Bands",
    performance: -2.3,
    lastActive: "2024-03-19T15:45:00Z",
  },
  {
    id: "3",
    name: "Delta Hedge",
    type: "Options",
    status: "error",
    farm: "Options Farm",
    strategy: "Iron Condor",
    performance: 8.7,
    lastActive: "2024-03-20T09:15:00Z",
  },
];

export function AgentList() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      case "maintenance":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatPerformance = (value: number) => {
    const color = value >= 0 ? "text-green-600" : "text-red-600";
    return <span className={color}>{value >= 0 ? "+" : ""}{value}%</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Farm</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAgents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>{agent.name}</TableCell>
                <TableCell>{agent.type}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell>{agent.farm || "—"}</TableCell>
                <TableCell>{agent.strategy || "—"}</TableCell>
                <TableCell>{formatPerformance(agent.performance)}</TableCell>
                <TableCell>{formatDate(agent.lastActive)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AgentDetails
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={(open) => !open && setSelectedAgent(null)}
      />
    </div>
  );
} 