'use client';

import React from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Brain, Zap, LineChart, Bot2, Terminal, Lightbulb, ChevronRight } from 'lucide-react';

export default function ElizaIntegrationGuidePage() {
  return (
    <div className="container py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
            <Bot2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">ElizaOS Integration Guide</h1>
          <p className="text-xl text-muted-foreground">
            Harness the power of AI in your trading strategies
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">What is ElizaOS?</CardTitle>
                <CardDescription>
                  An AI-powered operating system for autonomous trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  ElizaOS is an advanced AI framework that powers the Trading Farm platform, enabling intelligent trading strategies, automated decision-making, and real-time market analysis. With ElizaOS integration, your trading strategies gain access to:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">AI-Powered Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Advanced market analysis and pattern recognition
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Strategy Optimization</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatic parameter tuning for maximum performance
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Terminal className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Natural Language Control</h3>
                      <p className="text-sm text-muted-foreground">
                        Interact with your strategies using plain English commands
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Autonomous Agents</h3>
                      <p className="text-sm text-muted-foreground">
                        Deploy strategies as self-managing trading agents
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/strategies/builder">
                    Try ElizaOS in Strategy Builder <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center space-x-2">
                      <LineChart className="h-5 w-5 text-blue-500" />
                      <span>Strategy Builder with ElizaOS tab</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Terminal className="h-5 w-5 text-amber-500" />
                      <span>Command Console for natural language interaction</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-green-500" />
                      <span>Agent deployment with AI configuration</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      <span>AI-powered strategy insights and analysis</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="bg-primary/10 inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 text-primary font-bold">1</div>
                      <h3 className="font-medium">Create a strategy in the Strategy Builder</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-11">
                      Use the visual editor to create your trading strategy logic
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="bg-primary/10 inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 text-primary font-bold">2</div>
                      <h3 className="font-medium">Switch to the ElizaOS tab for AI assistance</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-11">
                      Use the command console to analyze and optimize your strategy
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="bg-primary/10 inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 text-primary font-bold">3</div>
                      <h3 className="font-medium">Deploy as an agent with ElizaOS enabled</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-11">
                      Configure AI parameters and trading instructions
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="strategies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS in Strategy Builder</CardTitle>
                <CardDescription>
                  Leverage AI to enhance your trading strategies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  The Strategy Builder provides a visual interface for creating trading strategies with the power of ElizaOS AI. Here's how to get the most out of this integration:
                </p>
                
                <div className="space-y-6 mt-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      Strategy Analysis
                    </h3>
                    <p className="text-sm mb-2">
                      ElizaOS can analyze your strategy to identify strengths, weaknesses, and potential improvements.
                    </p>
                    <div className="bg-muted p-2 rounded text-sm font-mono">
                      "Analyze this strategy and suggest improvements"
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-amber-500" />
                      Parameter Optimization
                    </h3>
                    <p className="text-sm mb-2">
                      Let ElizaOS optimize your strategy parameters based on historical data.
                    </p>
                    <div className="bg-muted p-2 rounded text-sm font-mono">
                      "Optimize the RSI parameters for better performance"
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Terminal className="h-5 w-5 mr-2 text-blue-500" />
                      Code Generation
                    </h3>
                    <p className="text-sm mb-2">
                      Convert your visual strategy into executable code for different platforms.
                    </p>
                    <div className="bg-muted p-2 rounded text-sm font-mono">
                      "Generate Python code for this strategy"
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href="/dashboard/strategies/builder">
                    Open Strategy Builder
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="agents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS-Powered Agents</CardTitle>
                <CardDescription>
                  Deploy strategies as autonomous trading agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  ElizaOS agents can execute your strategies with varying levels of autonomy, from fully automated to requiring approval for trades.
                </p>
                
                <div className="space-y-6 mt-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Bot className="h-5 w-5 mr-2 text-green-500" />
                      Agent Configuration
                    </h3>
                    <p className="text-sm mb-2">
                      When deploying a strategy as an agent, you can configure:
                    </p>
                    <ul className="list-disc text-sm pl-5 space-y-1">
                      <li>Risk tolerance levels</li>
                      <li>Maximum position size</li>
                      <li>Auto-execution preferences</li>
                      <li>Natural language instructions</li>
                      <li>Knowledge base access</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Terminal className="h-5 w-5 mr-2 text-blue-500" />
                      Command Console
                    </h3>
                    <p className="text-sm mb-2">
                      Each agent includes a command console for direct interaction:
                    </p>
                    <ul className="list-disc text-sm pl-5 space-y-1">
                      <li>Modify trading parameters</li>
                      <li>Request market analysis</li>
                      <li>Query performance metrics</li>
                      <li>Pause or resume trading</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-md mt-4 border border-amber-200 dark:border-amber-800">
                  <h3 className="font-medium flex items-center text-amber-800 dark:text-amber-400">
                    <Lightbulb className="h-5 w-5 mr-2" />
                    Pro Tip
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Provide detailed instructions to your ElizaOS agent for the best results. The more specific your guidance, the better the agent will execute your strategy.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="mr-2">
                  <Link href="/dashboard/strategies">
                    View Strategies
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/dashboard/agents">
                    Manage Agents
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="commands" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ElizaOS Command Reference</CardTitle>
                <CardDescription>
                  Common commands to use with the ElizaOS system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Strategy Analysis Commands</h3>
                    <div className="grid gap-2">
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">analyze strategy</span> - 
                        Get a comprehensive analysis of the current strategy
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">explain this strategy</span> - 
                        Get a human-readable explanation of how the strategy works
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">identify weaknesses</span> - 
                        Find potential weaknesses in the strategy
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Optimization Commands</h3>
                    <div className="grid gap-2">
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">optimize parameters</span> - 
                        Find optimal parameters for the strategy
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">optimize for lower drawdown</span> - 
                        Optimize the strategy with focus on risk reduction
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">optimize for higher returns</span> - 
                        Optimize the strategy with focus on maximizing returns
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Market Analysis Commands</h3>
                    <div className="grid gap-2">
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">analyze BTC market conditions</span> - 
                        Get analysis for a specific market
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">identify trading opportunities</span> - 
                        Find potential trading opportunities
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">risk assessment for current positions</span> - 
                        Analyze risk of open positions
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Code Generation Commands</h3>
                    <div className="grid gap-2">
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">generate python code</span> - 
                        Convert the strategy to Python code
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">generate typescript implementation</span> - 
                        Convert the strategy to TypeScript
                      </div>
                      <div className="bg-muted p-2 rounded text-sm">
                        <span className="font-mono text-blue-600 dark:text-blue-400">export strategy as JSON</span> - 
                        Get the raw JSON representation of the strategy
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  ElizaOS understands natural language, so feel free to phrase your commands in different ways.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
