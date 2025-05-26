"use client";

import React from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { Loader2, SendHorizontal, Terminal, XCircle, Info, Bot, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from '@supabase/supabase-js';

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "agent";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  agentId?: string;
  agentName?: string;
  actionType?: "command" | "status" | "notification";
};

type CommandResponse = {
  id?: string;
  command: string;
  response: string;
  status: "success" | "error" | "pending";
  created_at?: string;
  agent_id?: string;
  agent_name?: string;
  execution_details?: Record<string, any>;
};

type Agent = {
  id: string;
  name: string;
  status: "idle" | "running" | "paused" | "error";
  capabilities: string[];
};

// Mock responses for when we can't connect to the backend
const MOCK_RESPONSES: Record<string, string> = {
  "hello": "Hello! I'm ElizaOS, your AI assistant. How can I help you with Trading Farm today?",
  "help": "Here are some commands you can try:\n- 'status': Check system status\n- 'markets': View current market data\n- 'portfolio': See your portfolio summary\n- 'settings': Adjust your preferences\n- 'agents': List available trading agents",
  "status": "All systems operational. Backend API connection status: Limited (Running in compatibility mode)",
  "markets": "Currently tracking: BTC, ETH, SOL, XRP, ADA\nTop performer: ETH (+2.8% 24h)\nMarket sentiment: Neutral with bullish bias",
  "portfolio": "Portfolio summary:\nTotal value: $124,582\nDay change: +$2,105 (1.7%)\nHoldings: 5 assets, 3 strategies active",
  "settings": "Current settings:\n- Theme: System default\n- Notifications: Enabled\n- Auto-trading: Disabled\n- Risk level: Moderate",
  "agents": "Available agents:\n- TrendFollower\n- MeanReversion\n- MarketMaker\n- SentimentTrader\n- MacroStrategy"
};

export function ElizaTerminal() {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to ElizaOS Terminal. How can I assist you today? You can control trading agents through natural language commands.",
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isOfflineMode, setIsOfflineMode] = React.useState(false);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = React.useState<string | null>(null);
  const [commandChannels, setCommandChannels] = React.useState<Record<string, RealtimeChannel>>({});
  
  const inputRef = React.useRef<HTMLInputElement>(null);
  const endOfMessagesRef = React.useRef<HTMLDivElement>(null);
  const supabaseRef = React.useRef(createBrowserClient());
  
  // Scroll to bottom when messages change
  React.useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on initial load and setup subscriptions
  React.useEffect(() => {
    inputRef.current?.focus();
    
    // Test connection on mount
    testConnection();
    
    // Load available agents
    loadAgents();
    
    // Setup realtime subscriptions
    setupRealtimeSubscriptions();
    
    // Cleanup subscriptions on unmount
    return () => {
      Object.values(commandChannels).forEach(channel => {
        channel.unsubscribe();
      });
    };
  }, []);
  
  // Setup realtime subscriptions for agent commands and responses
  const setupRealtimeSubscriptions = () => {
    const supabase = supabaseRef.current;
    
    // Create a channel for command responses
    const commandChannel = supabase
      .channel('agent_responses')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_responses' },
        (payload) => {
          const response = payload.new as CommandResponse;
          
          // Only process if this is a response to one of our commands
          if (response && response.agent_id) {
            // Add response to messages
            setMessages((prev) => [
              ...prev,
              {
                id: uuidv4(),
                role: 'agent',
                content: response.response,
                timestamp: new Date(),
                agentId: response.agent_id,
                agentName: response.agent_name || `Agent ${response.agent_id}`,
                actionType: 'command',
              },
            ]);
          }
        }
      )
      .subscribe();
    
    // Create a channel for agent status updates
    const statusChannel = supabase
      .channel('agent_status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agents' },
        (payload) => {
          const updatedAgent = payload.new as any;
          
          // Update our local agents list
          if (updatedAgent && updatedAgent.id) {
            setAgents((prev) => 
              prev.map((agent) => 
                agent.id === updatedAgent.id 
                  ? { ...agent, status: updatedAgent.status } 
                  : agent
              )
            );
            
            // Add status update message if status changed
            const oldStatus = payload.old?.status;
            if (oldStatus && oldStatus !== updatedAgent.status) {
              setMessages((prev) => [
                ...prev,
                {
                  id: uuidv4(),
                  role: 'system',
                  content: `Agent ${updatedAgent.name || updatedAgent.id} status changed from ${oldStatus} to ${updatedAgent.status}`,
                  timestamp: new Date(),
                  agentId: updatedAgent.id,
                  actionType: 'status',
                },
              ]);
            }
          }
        }
      )
      .subscribe();
    
    // Store channels for cleanup
    setCommandChannels({
      commandChannel,
      statusChannel,
    });
  };
  
  // Load available agents from the database
  const loadAgents = async () => {
    try {
      const { data, error } = await supabaseRef.current
        .from('agents')
        .select('id, name, status, capabilities')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading agents:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setAgents(data as Agent[]);
        
        // Add a system message about available agents
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'system',
            content: `Found ${data.length} available agents. You can control them with commands like "start agent [name]", "stop agent [name]", or "get status of all agents".`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'system',
            content: 'No agents found. You can create new agents using the Agent Management panel.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Error in loadAgents:', err);
    }
  };
  
  // Function to test connection and set offline mode if needed
  const testConnection = async () => {
    try {
      const { error } = await supabaseRef.current
        .from('health_check')
        .select('*')
        .limit(1);
      
      if (error) {
        console.warn('API connection issue, switching to offline mode', error);
        setIsOfflineMode(true);
        
        // Try to recreate the client
        supabaseRef.current = createBrowserClient();
      } else {
        setIsOfflineMode(false);
      }
    } catch (err) {
      console.error('Connection test failed, switching to offline mode', err);
      setIsOfflineMode(true);
      
      // Try to recreate the client
      supabaseRef.current = createBrowserClient();
    }
  };

  // Process natural language commands and detect agent-related operations
  const processNaturalLanguage = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Detect agent commands
    const startAgentPattern = /(start|run|activate|launch)\s+(agent|trading agent|bot|trading bot)\s+([a-zA-Z0-9_\-]+)/i;
    const stopAgentPattern = /(stop|pause|halt|deactivate)\s+(agent|trading agent|bot|trading bot)\s+([a-zA-Z0-9_\-]+)/i;
    const agentStatusPattern = /(status|health|info|details)\s+(of|for)\s+(agent|trading agent|bot|trading bot)\s+([a-zA-Z0-9_\-]+)/i;
    const allAgentsPattern = /(show|list|get)\s+(all|available)\s+(agents|trading agents|bots|trading bots)/i;
    
    // Parse command type and target
    if (startAgentPattern.test(lowerCommand)) {
      const match = lowerCommand.match(startAgentPattern);
      if (match && match[3]) {
        const agentName = match[3];
        return {
          type: 'agent_command',
          action: 'start',
          target: agentName,
          targetId: findAgentIdByName(agentName)
        };
      }
    } 
    else if (stopAgentPattern.test(lowerCommand)) {
      const match = lowerCommand.match(stopAgentPattern);
      if (match && match[3]) {
        const agentName = match[3];
        return {
          type: 'agent_command',
          action: 'stop',
          target: agentName,
          targetId: findAgentIdByName(agentName)
        };
      }
    }
    else if (agentStatusPattern.test(lowerCommand)) {
      const match = lowerCommand.match(agentStatusPattern);
      if (match && match[4]) {
        const agentName = match[4];
        return {
          type: 'agent_query',
          action: 'status',
          target: agentName,
          targetId: findAgentIdByName(agentName)
        };
      }
    }
    else if (allAgentsPattern.test(lowerCommand)) {
      return {
        type: 'agent_query',
        action: 'list_all',
        target: 'all_agents'
      };
    }
    
    // Default - treat as general command
    return {
      type: 'general_command',
      originalCommand: command
    };
  };
  
  // Helper to find agent ID by name (case insensitive)
  const findAgentIdByName = (name: string): string | null => {
    const agent = agents.find(a => 
      a.name.toLowerCase() === name.toLowerCase() || 
      a.id.toLowerCase() === name.toLowerCase()
    );
    return agent ? agent.id : null;
  };
  
  // Handle agent commands directly
  const handleAgentCommand = async (
    commandType: 'agent_command' | 'agent_query', 
    action: string, 
    target: string, 
    targetId: string | null
  ) => {
    // Command can't be processed if no target ID found for agent commands
    if (commandType === 'agent_command' && !targetId) {
      return {
        success: false,
        response: `I couldn't find an agent named "${target}". Please check the agent name and try again.`
      };
    }
    
    try {
      // Different logic based on command type
      if (commandType === 'agent_command') {
        if (action === 'start') {
          // Start the agent via API
          const { data, error } = await supabaseRef.current
            .from('agent_commands')
            .insert({
              command: 'start',
              agent_id: targetId,
              status: 'pending',
              context: JSON.stringify({ source: 'terminal', action: 'start', initiated_at: new Date().toISOString() })
            })
            .select()
            .single();
            
          if (error) throw error;
          
          return {
            success: true,
            response: `Starting agent "${target}" (ID: ${targetId}). The agent is being initialized and will begin processing soon.`
          };
        }
        else if (action === 'stop') {
          // Stop the agent via API
          const { data, error } = await supabaseRef.current
            .from('agent_commands')
            .insert({
              command: 'stop',
              agent_id: targetId,
              status: 'pending',
              context: JSON.stringify({ source: 'terminal', action: 'stop', initiated_at: new Date().toISOString() })
            })
            .select()
            .single();
            
          if (error) throw error;
          
          return {
            success: true,
            response: `Stopping agent "${target}" (ID: ${targetId}). The agent will safely complete any in-progress operations before shutting down.`
          };
        }
      }
      else if (commandType === 'agent_query') {
        if (action === 'status' && targetId) {
          // Get agent status
          const { data, error } = await supabaseRef.current
            .from('agents')
            .select('id, name, status, last_active, current_task, performance_metrics')
            .eq('id', targetId)
            .single();
            
          if (error) throw error;
          
          if (!data) {
            return {
              success: false,
              response: `I couldn't find detailed information for agent "${target}".`
            };
          }
          
          return {
            success: true,
            response: `Agent "${data.name}" (ID: ${data.id})\nStatus: ${data.status}\nLast Active: ${data.last_active || 'N/A'}\nCurrent Task: ${data.current_task || 'None'}\nPerformance: ${JSON.stringify(data.performance_metrics || {})}`
          };
        }
        else if (action === 'list_all') {
          // No need for another API call - use local state
          if (agents.length === 0) {
            return {
              success: true,
              response: "No agents found. You can create agents through the Agent Management interface."
            };
          }
          
          const agentList = agents.map(a => `- ${a.name} (${a.id}): ${a.status}`).join('\n');
          return {
            success: true,
            response: `Available Agents:\n${agentList}\n\nYou can get detailed information about a specific agent by asking for its status.`
          };
        }
      }
      
      // Default fallback
      return {
        success: false,
        response: `I couldn't process the ${commandType} with action "${action}" for target "${target}". This may be an unsupported operation.`
      };
    }
    catch (err) {
      console.error('Error in handleAgentCommand:', err);
      return {
        success: false,
        response: `Error processing agent command: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    // Create thinking message ID
    const thinkingId = Date.now().toString() + "-thinking";
    
    try {
      // Add "thinking" message
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: thinkingId,
          role: "assistant",
          content: "Processing command...",
          timestamp: new Date(),
          status: "sending",
        },
      ]);
      
      let responseContent = "";
      
      // If we're in offline mode or the command matches a mock response,
      // use the mock response system instead of making API calls
      const lowerInput = input.toLowerCase().trim();
      const mockKey = Object.keys(MOCK_RESPONSES).find(key => 
        lowerInput === key || lowerInput.includes(key)
      );
      
      if (isOfflineMode || mockKey) {
        // Use mock responses in offline mode
        await new Promise(resolve => setTimeout(resolve, 700)); // Simulate processing time
        
        if (mockKey) {
          responseContent = MOCK_RESPONSES[mockKey];
        } else {
          // Generic response for unknown commands in offline mode
          responseContent = `I processed your request "${input}" in compatibility mode. The backend API connection is limited.\n\nTry 'help' to see available commands.`;
        }
      } else {
        // Online mode - try to use natural language processing for agent commands first
        const nlpResult = processNaturalLanguage(input);
        
        // Handle agent commands directly if detected
        if (nlpResult.type === 'agent_command' || nlpResult.type === 'agent_query') {
          const { success, response } = await handleAgentCommand(
            nlpResult.type as 'agent_command' | 'agent_query',
            nlpResult.action,
            nlpResult.target,
            nlpResult.targetId
          );
          
          responseContent = response;
          
          // If successful agent command, we don't need to send to general command API
          if (success) {
            // Remove thinking message and add the response
            setMessages((prev: Message[]) => [
              ...prev.filter(m => m.id !== thinkingId),
              {
                id: uuidv4(),
                role: "assistant",
                content: responseContent,
                timestamp: new Date(),
              },
            ]);
            setIsProcessing(false);
            inputRef.current?.focus();
            return; // Exit early
          }
        }
        
        // Fall back to general command API for non-agent commands or failed agent commands
        try {
          // Process the command through Supabase
          const { data, error } = await supabaseRef.current
            .from("agent_commands")
            .insert({
              command: input,
              agent_id: "eliza-terminal",
              status: "pending",
              context: JSON.stringify({ source: "terminal" }),
            })
            .select()
            .single();

          if (error) {
            // Switch to offline mode on any API error
            console.error("API error:", error);
            setIsOfflineMode(true);
            throw new Error(error.message);
          }

          // With realtime subscriptions, we no longer need to poll
          // Just show a temporary response that will be updated in real-time
          responseContent = "Command sent to ElizaOS. Waiting for response...";
          
          // Toast notification for command submission
          toast({
            title: "Command Submitted",
            description: "ElizaOS is processing your request",
          });
        } catch (error) {
          // If we get here, the API call failed
          console.error("Command processing error:", error);
          setIsOfflineMode(true); // Switch to offline mode
          responseContent = `I couldn't process your command through the API. I've switched to compatibility mode.\n\nError: ${error instanceof Error ? error.message : "Unknown error"}\n\nTry 'help' to see available commands.`;
          
          // Try to reinitialize the client
          supabaseRef.current = createBrowserClient();
        }
      }

      // Remove thinking message and add the actual response
      setMessages((prev: Message[]) => [
        ...prev.filter(m => m.id !== thinkingId),
        {
          id: uuidv4(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
        },
      ]);
      
    } catch (error) {
      console.error("Error in handleSend:", error);
      
      // Add error message
      setMessages((prev: Message[]) => [
        ...prev.filter(m => !m.status || m.status !== "sending"),
        {
          id: uuidv4(),
          role: "assistant",
          content: `Error processing command: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
          status: "error",
        },
      ]);
      
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Get a reference to an agent by ID or name
  const getAgentReference = (idOrName: string): Agent | null => {
    // Try to find by exact ID first
    let agent = agents.find(a => a.id === idOrName);
    
    // If not found, try case-insensitive name search
    if (!agent) {
      agent = agents.find(a => 
        a.name.toLowerCase() === idOrName.toLowerCase()
      );
    }
    
    return agent || null;
  };
  
  // Execute an agent action and return a formatted response
  const executeAgentAction = async (agentId: string, action: string, params: Record<string, any> = {}): Promise<string> => {
    try {
      // Get agent reference
      const agent = getAgentReference(agentId);
      if (!agent) {
        return `Error: Agent with ID "${agentId}" not found.`;
      }
      
      // Construct context with action-specific parameters
      const context = {
        source: "terminal",
        action,
        params,
        initiated_at: new Date().toISOString(),
      };
      
      // Send command to agent via supabase
      const { data, error } = await supabaseRef.current
        .from("agent_commands")
        .insert({
          command: action,
          agent_id: agentId,
          status: "pending",
          context: JSON.stringify(context),
        })
        .select()
        .single();
        
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return `Command "${action}" sent to agent "${agent.name}" (ID: ${agent.id}).\nCommand ID: ${data.id}\nStatus: Pending\n\nThe agent will process this command and report back shortly.`;
    } catch (error) {
      console.error(`Error executing agent action "${action}" for agent "${agentId}":`, error);
      return `Error executing ${action}: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  };
  
  // Format agent data for display
  const formatAgentData = (agent: any): string => {
    if (!agent) return "No agent data available";
    
    let output = `Agent: ${agent.name || "Unnamed"} (${agent.id})\n`;
    output += `Status: ${agent.status || "unknown"}\n`;
    
    if (agent.capabilities && agent.capabilities.length > 0) {
      output += `Capabilities: ${agent.capabilities.join(", ")}\n`;
    }
    
    if (agent.last_active) {
      output += `Last Active: ${new Date(agent.last_active).toLocaleString()}\n`;
    }
    
    if (agent.performance_metrics) {
      output += "Performance Metrics:\n";
      try {
        const metrics = typeof agent.performance_metrics === 'string' 
          ? JSON.parse(agent.performance_metrics)
          : agent.performance_metrics;
          
        Object.entries(metrics).forEach(([key, value]) => {
          output += `- ${key}: ${value}\n`;
        });
      } catch (e) {
        output += `- Error parsing metrics: ${e instanceof Error ? e.message : "Unknown error"}\n`;
      }
    }
    
    return output;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Chat cleared. How can I assist you?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col w-full h-full max-w-3xl mx-auto rounded-lg border bg-card shadow">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <h2 className="text-lg font-semibold">ElizaOS Terminal</h2>
          {isOfflineMode && (
            <div className="flex items-center ml-2 text-amber-500 text-xs">
              <Info className="h-3 w-3 mr-1" />
              <span>Compatibility Mode</span>
            </div>
          )}
          {agents.length > 0 && (
            <div className="flex items-center ml-2 text-green-500 text-xs">
              <Bot className="h-3 w-3 mr-1" />
              <span>{agents.length} Agent{agents.length !== 1 ? 's' : ''} Connected</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {/* If we have agents, show active count */}
          {agents.filter(a => a.status === 'running').length > 0 && (
            <div className="flex items-center text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
              <span>{agents.filter(a => a.status === 'running').length} Active</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Different avatars based on message role */}
              {message.role === "assistant" && (
                <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <Terminal className="h-4 w-4 text-primary-foreground" />
                </Avatar>
              )}
              
              {message.role === "agent" && (
                <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </Avatar>
              )}
              
              {message.role === "system" && (
                <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600">
                  <AlertCircle className="h-4 w-4 text-primary-foreground" />
                </Avatar>
              )}
              
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "agent"
                    ? "bg-green-600/10 border border-green-600/20"
                    : message.role === "system"
                    ? "bg-amber-600/10 border border-amber-600/20"
                    : "bg-muted"
                } ${message.status === "sending" ? "opacity-70" : ""}`}
              >
                {/* Agent name label if it's an agent message */}
                {message.role === "agent" && message.agentName && (
                  <div className="text-xs font-semibold text-green-600 mb-1">
                    {message.agentName}
                  </div>
                )}
                
                {/* System message label */}
                {message.role === "system" && (
                  <div className="text-xs font-semibold text-amber-600 mb-1">
                    System Notification
                  </div>
                )}
                
                {message.status === "sending" ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
                
                {/* Action buttons for agent messages */}
                {message.role === "agent" && message.agentId && (
                  <div className="mt-2 flex gap-2">
                    <button 
                      className="text-xs px-2 py-1 bg-green-600/10 text-green-600 rounded hover:bg-green-600/20 transition-colors"
                      onClick={() => {
                        // Set active agent and focus with prompt
                        setActiveAgent(message.agentId!);
                        setInput(`tell agent ${message.agentName} `);
                        inputRef.current?.focus();
                      }}
                    >
                      Reply
                    </button>
                    <button 
                      className="text-xs px-2 py-1 bg-blue-600/10 text-blue-600 rounded hover:bg-blue-600/20 transition-colors"
                      onClick={() => {
                        executeAgentAction(message.agentId!, "status").then(response => {
                          // Add response as agent message
                          setMessages(prev => [
                            ...prev,
                            {
                              id: uuidv4(),
                              role: "agent",
                              content: response,
                              timestamp: new Date(),
                              agentId: message.agentId,
                              agentName: message.agentName,
                              actionType: "status"
                            }
                          ]);
                        });
                      }}
                    >
                      Status
                    </button>
                  </div>
                )}
              </div>
              
              {message.role === "user" && (
                <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <span className="text-xs font-medium">You</span>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={endOfMessagesRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        {/* Agent selection UI if we have agents */}
        {agents.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1 mt-1">Agents:</span>
            {agents.map(agent => (
              <button
                key={agent.id}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  activeAgent === agent.id
                    ? 'bg-primary text-primary-foreground'
                    : agent.status === 'running'
                    ? 'bg-green-600/10 text-green-600 hover:bg-green-600/20'
                    : agent.status === 'error'
                    ? 'bg-red-600/10 text-red-600 hover:bg-red-600/20'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => {
                  setActiveAgent(activeAgent === agent.id ? null : agent.id);
                  if (activeAgent !== agent.id) {
                    setInput(`tell agent ${agent.name} `);
                    inputRef.current?.focus();
                  }
                }}
              >
                {agent.name}
                <span className="ml-1 opacity-70">
                  ({agent.status})
                </span>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            // @ts-ignore: Input component doesn't properly expose ref type
            ref={inputRef}
            id="message-input"
            placeholder={activeAgent 
              ? `Send command to ${agents.find(a => a.id === activeAgent)?.name || 'selected agent'}...` 
              : "Type a command or query..."}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={isProcessing || !input.trim()}
            size="icon"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Command suggestions */}
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1 mt-1">Try:</span>
          <button
            className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
            onClick={() => {
              setInput("list all agents");
              handleSend();
            }}
          >
            List agents
          </button>
          <button
            className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
            onClick={() => {
              setInput("start agent TradingBot");
              handleSend();
            }}
          >
            Start agent
          </button>
          <button
            className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
            onClick={() => {
              setInput("show current market status");
              handleSend();
            }}
          >
            Market status
          </button>
        </div>
      </div>
    </div>
  );
}
