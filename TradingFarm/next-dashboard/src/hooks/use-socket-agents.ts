"use client";

import { useEffect, useState } from "react";
import { useSocket, TRADING_EVENTS } from "@/providers/socket-provider";

export type AgentStatus = "idle" | "active" | "paused" | "error";

export type AgentUpdate = {
  id: string;
  name: string;
  status: AgentStatus;
  type: string;
  performance: number;
  trades: number;
  winRate: number;
  lastActivity: number;
  cpuUsage?: number;
  memoryUsage?: number;
  strategiesActive?: number;
  farmId?: string;
};

export const useSocketAgents = (agentIds?: string[]) => {
  const { socket, isConnected } = useSocket();
  const [agents, setAgents] = useState<Record<string, AgentUpdate>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);

    // Handle agent status updates
    const handleAgentUpdate = (data: AgentUpdate | AgentUpdate[]) => {
      setIsLoading(false);
      
      const updates = Array.isArray(data) ? data : [data];
      
      setAgents(prevAgents => {
        const newAgents = { ...prevAgents };
        
        updates.forEach(update => {
          // If specific agent IDs are provided, filter for those only
          if (!agentIds || agentIds.includes(update.id)) {
            newAgents[update.id] = {
              ...update,
              lastActivity: update.lastActivity || Date.now(),
            };
          }
        });
        
        return newAgents;
      });
    };

    // Register event handler
    socket.on(TRADING_EVENTS.AGENT_STATUS, handleAgentUpdate);

    // Request initial agent data
    socket.emit("agent:list", { agentIds });

    return () => {
      socket.off(TRADING_EVENTS.AGENT_STATUS, handleAgentUpdate);
    };
  }, [socket, isConnected, agentIds]);

  // Function to control an agent
  const controlAgent = (agentId: string, action: "start" | "pause" | "reset") => {
    if (!socket || !isConnected) {
      console.error("Cannot control agent: Socket not connected");
      return false;
    }

    socket.emit("agent:control", { agentId, action });
    return true;
  };

  return {
    agents,
    agentList: Object.values(agents),
    isLoading,
    isConnected,
    controlAgent,
  };
};
