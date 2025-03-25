"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Define message types
export interface SocketMessage {
  id: string;
  content: string;
  type: "command" | "response" | "system" | "error" | "market" | "portfolio" | "agent" | "knowledge";
  timestamp: Date;
  source?: string;
}

// Define socket context type with all properties used in the application
export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  messages: SocketMessage[];
  sendCommand: (command: string) => void;
  toggleSimulation: () => void;
  isSimulating: boolean;
  lastError: string | null;
}

// Create the socket context with default values
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  messages: [],
  sendCommand: () => {},
  toggleSimulation: () => {},
  isSimulating: false,
  lastError: null,
});

// Socket URL from environment variable with fallback
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Safeguard to ensure this only runs in the browser
    if (typeof window === "undefined") return;

    // Create socket instance
    const socketInstance = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    // Set up event handlers
    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      setLastError(null);
      
      // Add system connection message
      addMessage({
        id: Date.now().toString(),
        content: "Connected to trading server",
        type: "system",
        timestamp: new Date(),
      });
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
      
      // Add system disconnection message
      addMessage({
        id: Date.now().toString(),
        content: "Disconnected from trading server",
        type: "system",
        timestamp: new Date(),
      });
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
      setLastError(`Connection error: ${err.message}`);
      
      // If connection fails, automatically enable simulation mode
      if (!isSimulating) {
        console.log("Enabling simulation mode due to connection failure");
        setIsSimulating(true);
        
        // Add system message about simulation mode
        addMessage({
          id: Date.now().toString(),
          content: "Connection failed. Enabled simulation mode.",
          type: "system",
          timestamp: new Date(),
        });
      }
    });

    // Trading event handlers
    const eventHandlers = {
      "command:response": (data: any) => {
        addMessage({
          id: data.id || Date.now().toString(),
          content: data.content || JSON.stringify(data),
          type: "response",
          timestamp: new Date(data.timestamp) || new Date(),
          source: data.source || "system",
        });
      },
      
      "knowledge:response": (data: any) => {
        addMessage({
          id: data.id || Date.now().toString(),
          content: data.content || JSON.stringify(data),
          type: "knowledge",
          timestamp: new Date(data.timestamp) || new Date(),
          source: "knowledge-base",
        });
      },
      
      "market:update": (data: any) => {
        addMessage({
          id: Date.now().toString(),
          content: `Market Update: ${data.symbol || "Unknown"} - ${data.price || "N/A"}`,
          type: "market",
          timestamp: new Date(),
          source: "market-data",
        });
      },
      
      "portfolio:update": (data: any) => {
        addMessage({
          id: Date.now().toString(),
          content: `Portfolio Update: Balance ${data.balance || "Unknown"}`,
          type: "portfolio",
          timestamp: new Date(),
          source: "portfolio",
        });
      },
      
      "strategy:created": (data: any) => {
        addMessage({
          id: Date.now().toString(),
          content: `Strategy created: ${data.name || "Unknown"}`,
          type: "system",
          timestamp: new Date(),
          source: "strategy",
        });
      },
      
      "strategy:updated": (data: any) => {
        addMessage({
          id: Date.now().toString(),
          content: `Strategy updated: ${data.name || "Unknown"}`,
          type: "system",
          timestamp: new Date(),
          source: "strategy",
        });
      },
      
      "strategy:deleted": (data: any) => {
        addMessage({
          id: Date.now().toString(),
          content: `Strategy deleted: ${data.name || "Unknown"}`,
          type: "system",
          timestamp: new Date(),
          source: "strategy",
        });
      },
    };

    // Register all event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socketInstance.on(event, handler);
    });

    // Store socket instance
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      Object.keys(eventHandlers).forEach((event) => {
        socketInstance.off(event);
      });
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("connect_error");
      socketInstance.disconnect();
    };
  }, []);

  // Helper to add messages to the state
  const addMessage = (message: SocketMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  // Function to send commands
  const sendCommand = (command: string) => {
    if (isConnected && socket) {
      // Send to actual socket
      socket.emit("command:submit", { content: command });
      
      // Add to message list
      addMessage({
        id: Date.now().toString(),
        content: command,
        type: "command",
        timestamp: new Date(),
      });
    } else if (isSimulating) {
      // Handle simulated command
      handleSimulatedCommand(command);
    } else {
      // Not connected and not simulating
      addMessage({
        id: Date.now().toString(),
        content: "Cannot send command: Not connected to server",
        type: "error",
        timestamp: new Date(),
      });
    }
  };

  // Toggle simulation mode
  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
    addMessage({
      id: Date.now().toString(),
      content: `Simulation mode ${!isSimulating ? "enabled" : "disabled"}`,
      type: "system",
      timestamp: new Date(),
    });
  };

  // Simulate command responses for disconnected states
  const handleSimulatedCommand = (command: string) => {
    // Add command to message list
    addMessage({
      id: Date.now().toString(),
      content: command,
      type: "command",
      timestamp: new Date(),
    });
    
    // Simulate a delay
    setTimeout(() => {
      // Simple simulation responses
      if (command.toLowerCase().includes("btc") || command.toLowerCase().includes("bitcoin")) {
        addMessage({
          id: Date.now().toString(),
          content: "Simulated BTC Price: $45,723.55 (24h: +2.4%)",
          type: "response",
          timestamp: new Date(),
          source: "simulation",
        });
      } else if (command.toLowerCase().includes("portfolio")) {
        addMessage({
          id: Date.now().toString(),
          content: "Simulated Portfolio: Total Value $125,432.10 (BTC: 1.25, ETH: 15.5, USDT: 25,000)",
          type: "response",
          timestamp: new Date(),
          source: "simulation",
        });
      } else if (command.toLowerCase().includes("strategy")) {
        addMessage({
          id: Date.now().toString(),
          content: "Simulated Strategy: Found 3 active strategies. Auto-DCA performing +12.5% YTD, Momentum at +8.2%, Grid trading at +5.3%",
          type: "response",
          timestamp: new Date(),
          source: "simulation",
        });
      } else {
        addMessage({
          id: Date.now().toString(),
          content: `Simulated response: Processing command "${command}" in simulation mode. Live data not available.`,
          type: "response",
          timestamp: new Date(),
          source: "simulation",
        });
      }
    }, 1500);
    
    // For specific commands, simulate market updates
    if (command.toLowerCase().includes("monitor") || command.toLowerCase().includes("watch")) {
      // Simulate periodic market updates
      const symbolsToSimulate = ["BTC", "ETH", "SOL", "LINK"];
      let updateCount = 0;
      
      const interval = setInterval(() => {
        updateCount++;
        const randomSymbol = symbolsToSimulate[Math.floor(Math.random() * symbolsToSimulate.length)];
        const randomPrice = Math.floor(Math.random() * 1000) / 10;
        const direction = Math.random() > 0.5 ? "+" : "-";
        const changePercent = (Math.random() * 2).toFixed(2);
        
        addMessage({
          id: Date.now().toString(),
          content: `Market Update: ${randomSymbol}/USDT - $${randomPrice.toFixed(2)} (${direction}${changePercent}%)`,
          type: "market",
          timestamp: new Date(),
          source: "simulation",
        });
        
        // Stop after 5 updates
        if (updateCount >= 5) {
          clearInterval(interval);
        }
      }, 3000);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        messages,
        sendCommand,
        toggleSimulation,
        isSimulating,
        lastError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Hook for easier context usage
export const useSocket = () => useContext(SocketContext);
