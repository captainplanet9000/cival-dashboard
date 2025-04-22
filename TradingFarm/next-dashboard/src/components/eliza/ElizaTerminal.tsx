"use client";

import React from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { Loader2, SendHorizontal, Terminal, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
};

type CommandResponse = {
  id?: string;
  command: string;
  response: string;
  status: "success" | "error" | "pending";
  created_at?: string;
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
      content: "Welcome to ElizaOS Terminal. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isOfflineMode, setIsOfflineMode] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const endOfMessagesRef = React.useRef<HTMLDivElement>(null);
  const supabaseRef = React.useRef(createBrowserClient());
  
  // Scroll to bottom when messages change
  React.useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on initial load
  React.useEffect(() => {
    inputRef.current?.focus();
    
    // Test connection on mount
    testConnection();
  }, []);
  
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
        // Online mode - try to use the real API
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

          // Start polling for response
          const commandId = data.id;
          const response = await pollForResponse(commandId);
          responseContent = response.response || "Command processed successfully.";
          
          // Handle command execution if needed
          if (responseContent.includes("[EXECUTE]")) {
            const executeCommand = responseContent
              .split("[EXECUTE]")[1]
              .trim()
              .split("[/EXECUTE]")[0];
            
            toast({
              title: "Executing command",
              description: executeCommand,
            });
          }
          
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

  const pollForResponse = async (commandId: string): Promise<CommandResponse> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 15; // 15 seconds max polling time

      const checkResponse = async () => {
        try {
          attempts++;
          
          // Check if we've gone offline during polling
          if (isOfflineMode) {
            reject(new Error("API connection lost during polling"));
            return;
          }
          
          try {
            const { data, error } = await supabaseRef.current
              .from("agent_responses")
              .select("*")
              .eq("command_id", commandId)
              .limit(1)
              .maybeSingle();
              
            if (error) {
              // Any error during polling means we should go offline
              console.error("Polling error:", error);
              setIsOfflineMode(true);
              reject(error);
              return;
            }
            
            if (data) {
              resolve({
                id: data.id,
                command: commandId,
                response: data.response,
                status: data.status || "success",
                created_at: data.created_at,
              });
              return;
            }
          } catch (err) {
            console.error("Exception during polling:", err);
            setIsOfflineMode(true);
            supabaseRef.current = createBrowserClient(); // Try to get a new client
            reject(err);
            return;
          }
          
          if (attempts >= maxAttempts) {
            setIsOfflineMode(true); // Switch to offline after timeout
            reject(new Error("Timeout waiting for response. Switched to compatibility mode."));
            return;
          }
          
          // Continue polling
          setTimeout(checkResponse, 1000);
        } catch (error) {
          console.error("Unexpected error in polling:", error);
          setIsOfflineMode(true);
          reject(error);
        }
      };
      
      checkResponse();
    });
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
        </div>
        <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat">
          <XCircle className="h-5 w-5" />
        </Button>
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
              {message.role === "assistant" && (
                <Avatar className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <Terminal className="h-4 w-4 text-primary-foreground" />
                </Avatar>
              )}
              
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } ${message.status === "sending" ? "opacity-70" : ""}`}
              >
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
        <div className="flex gap-2">
          <Input
            // @ts-ignore: Input component doesn't properly expose ref type
            ref={inputRef}
            id="message-input"
            placeholder="Type a command..."
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
      </div>
    </div>
  );
}
