"use client";

import { useState, useEffect } from "react";
import { TradingAgent, TradingAgentStatus, TradingAgentConfig } from "@/services/elizaos/trading-agent-service";

/**
 * Custom hook for fetching and managing trading agents
 */
export function useTradingAgents() {
  const [agents, setAgents] = useState<TradingAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch agents on component mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/trading-agents");
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch agents");
        }
        
        const data = await response.json();
        setAgents(data);
      } catch (err: any) {
        console.error("Error fetching agents:", err);
        setError(err.message || "An error occurred while fetching agents");
      } finally {
        setLoading(false);
      }
    }
    
    fetchAgents();
  }, []);

  /**
   * Create a new trading agent
   */
  const createAgent = async (config: TradingAgentConfig): Promise<TradingAgent> => {
    try {
      const response = await fetch("/api/trading-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create agent");
      }
      
      const newAgent = await response.json();
      setAgents((prevAgents) => [...prevAgents, newAgent]);
      
      return newAgent;
    } catch (err: any) {
      console.error("Error creating agent:", err);
      throw err;
    }
  };

  /**
   * Get a specific agent by ID
   */
  const getAgent = async (agentId: string): Promise<TradingAgent> => {
    try {
      const response = await fetch(`/api/trading-agents?id=${agentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch agent");
      }
      
      return await response.json();
    } catch (err: any) {
      console.error(`Error fetching agent ${agentId}:`, err);
      throw err;
    }
  };

  /**
   * Activate a trading agent
   */
  const activateAgent = async (agentId: string): Promise<TradingAgent> => {
    try {
      const response = await fetch("/api/trading-agents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId, action: "activate" }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to activate agent");
      }
      
      const updatedAgent = await response.json();
      
      setAgents((prevAgents) =>
        prevAgents.map((agent) =>
          agent.id === agentId ? updatedAgent : agent
        )
      );
      
      return updatedAgent;
    } catch (err: any) {
      console.error(`Error activating agent ${agentId}:`, err);
      throw err;
    }
  };

  /**
   * Pause a trading agent
   */
  const pauseAgent = async (agentId: string): Promise<TradingAgent> => {
    try {
      const response = await fetch("/api/trading-agents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId, action: "pause" }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to pause agent");
      }
      
      const updatedAgent = await response.json();
      
      setAgents((prevAgents) =>
        prevAgents.map((agent) =>
          agent.id === agentId ? updatedAgent : agent
        )
      );
      
      return updatedAgent;
    } catch (err: any) {
      console.error(`Error pausing agent ${agentId}:`, err);
      throw err;
    }
  };

  /**
   * Delete a trading agent
   */
  const deleteAgent = async (agentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/trading-agents?id=${agentId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete agent");
      }
      
      setAgents((prevAgents) =>
        prevAgents.filter((agent) => agent.id !== agentId)
      );
    } catch (err: any) {
      console.error(`Error deleting agent ${agentId}:`, err);
      throw err;
    }
  };

  /**
   * Refresh the agent list
   */
  const refreshAgents = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/trading-agents");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch agents");
      }
      
      const data = await response.json();
      setAgents(data);
    } catch (err: any) {
      console.error("Error refreshing agents:", err);
      setError(err.message || "An error occurred while refreshing agents");
    } finally {
      setLoading(false);
    }
  };

  return {
    agents,
    loading,
    error,
    createAgent,
    getAgent,
    activateAgent,
    pauseAgent,
    deleteAgent,
    refreshAgents,
  };
}
