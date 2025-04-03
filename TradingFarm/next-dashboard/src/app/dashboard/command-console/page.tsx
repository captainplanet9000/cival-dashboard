"use client";

import React from "react";
import { nanoid } from "nanoid";
import { CommandTerminal, CommandMessage } from "@/components/ui/command-terminal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, Terminal, Database, Activity, BrainCircuit } from "lucide-react";
import { elizaService } from "@/services/eliza-service";
import { useToast } from "@/components/ui/use-toast";

export default function CommandConsolePage() {
  const [messages, setMessages] = React.useState<CommandMessage[]>([]);
  const [isConnected, setIsConnected] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<string>("main");
  const { toast } = useToast();

  // Connect to ElizaOS on component mount
  React.useEffect(() => {
    const connectToEliza = async () => {
      try {
        const connected = await elizaService.connect();
        setIsConnected(connected);
        
        if (connected) {
          // Add welcome message
          setMessages([{
            id: nanoid(),
            content: "Welcome to ElizaOS Command Console. Type 'help' to see available commands.",
            timestamp: new Date(),
            type: "system",
            source: "system"
          }]);
          
          toast({
            title: "Connected to ElizaOS",
            description: "Command console is ready for use",
          });
        } else {
          toast({
            title: "Connection Failed",
            description: "Failed to connect to ElizaOS. Using demo mode.",
            variant: "destructive",
          });
          
          // Add demo mode message
          setMessages([{
            id: nanoid(),
            content: "ElizaOS Command Console [DEMO MODE]. Type 'help' to see available commands.",
            timestamp: new Date(),
            type: "system",
            source: "system"
          }]);
        }
      } catch (error) {
        console.error("Error connecting to ElizaOS:", error);
        setIsConnected(false);
        toast({
          title: "Connection Error",
          description: "An error occurred connecting to ElizaOS",
          variant: "destructive",
        });
      }
    };

    connectToEliza();

    // Clean up socket connection on unmount
    return () => {
      elizaService.disconnect();
    };
  }, [toast]);

  // Handle sending commands to ElizaOS
  const handleSendCommand = async (command: string) => {
    setIsLoading(true);
    
    try {
      // Process command and get responses
      const updatedMessages = await elizaService.processCommand(command);
      
      // Update messages state with all new messages
      setMessages(prev => [...prev, ...updatedMessages]);
    } catch (error) {
      console.error("Error processing command:", error);
      toast({
        title: "Command Error",
        description: "Failed to process command",
        variant: "destructive",
      });
      
      // Add error message
      setMessages(prev => [...prev, {
        id: nanoid(),
        content: `Error processing command: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
        type: "alert",
        source: "system"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConsole = () => {
    setMessages([{
      id: nanoid(),
      content: "Console cleared. Type 'help' to see available commands.",
      timestamp: new Date(),
      type: "system",
      source: "system"
    }]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Command Console</h1>
        <p className="text-muted-foreground">
          Interact with ElizaOS to manage trading farms, agents, and knowledge
        </p>
      </div>

      {!isConnected && (
        <Alert variant="warning">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Limited functionality</AlertTitle>
          <AlertDescription>
            Running in demo mode with simulated responses. Some advanced features may not be available.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="main" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="main">
                <Terminal className="h-4 w-4 mr-2" />
                Main Console
              </TabsTrigger>
              <TabsTrigger value="data">
                <Database className="h-4 w-4 mr-2" />
                Data Explorer
              </TabsTrigger>
              <TabsTrigger value="monitor">
                <Activity className="h-4 w-4 mr-2" />
                System Monitor
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="mt-0">
              <CommandTerminal
                messages={messages}
                onSendCommand={handleSendCommand}
                isLoading={isLoading}
                fullWidth={true}
                maxHeight="600px"
                title="ElizaOS Command Console"
              />
            </TabsContent>
            
            <TabsContent value="data" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Data Explorer</CardTitle>
                  <CardDescription>
                    Query and visualize data from your trading farms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Data Explorer is coming soon
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setActiveTab("main");
                        handleSendCommand("help data");
                      }}
                    >
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="monitor" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>System Monitor</CardTitle>
                  <CardDescription>
                    Monitor the health and performance of your trading infrastructure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      System Monitor is coming soon
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setActiveTab("main");
                        handleSendCommand("status");
                      }}
                    >
                      Check Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Commands</CardTitle>
              <CardDescription>
                Frequently used commands
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleSendCommand("help")}
              >
                <Terminal className="h-4 w-4 mr-2" />
                Help
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleSendCommand("status")}
              >
                <Activity className="h-4 w-4 mr-2" />
                System Status
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleSendCommand("farm list")}
              >
                <Database className="h-4 w-4 mr-2" />
                List Farms
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleSendCommand("agent list")}
              >
                <BrainCircuit className="h-4 w-4 mr-2" />
                List Agents
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleClearConsole()}
              >
                <Terminal className="h-4 w-4 mr-2" />
                Clear Console
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Search trading knowledge documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleSendCommand("find trading strategies")}
                >
                  Search: Trading Strategies
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleSendCommand("find risk management")}
                >
                  Search: Risk Management
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleSendCommand("find market cycles")}
                >
                  Search: Market Cycles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
