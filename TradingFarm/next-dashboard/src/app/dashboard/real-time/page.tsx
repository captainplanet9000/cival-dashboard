"use client";

import { useState } from "react";
import { MarketTicker } from "@/components/real-time/market-ticker";
import { LiveTradesFeed } from "@/components/real-time/live-trades-feed";
import { LivePortfolioChart } from "@/components/real-time/live-portfolio-chart";
import { AgentStatusGrid } from "@/components/real-time/agent-status-grid";
import { SystemAlertsFeed } from "@/components/real-time/system-alerts-feed";
import { Button } from "@/components/ui/button";
import { TradeExecution } from "@/hooks/use-socket-trades";
import { SystemAlert } from "@/hooks/use-socket-alerts";
import { AgentUpdate } from "@/hooks/use-socket-agents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  BellIcon, 
  LayoutDashboard, 
  RefreshCw, 
  Zap,
  Database,
  Bot,
  MessageSquare,
  BarChart3
} from "lucide-react";

export default function RealTimeDashboardPage() {
  const [selectedTrade, setSelectedTrade] = useState<TradeExecution | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentUpdate | null>(null);
  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [knowledgeAlert, setKnowledgeAlert] = useState<SystemAlert | null>(null);
  
  // Handler for trade details
  const handleTradeClick = (trade: TradeExecution) => {
    setSelectedTrade(trade);
  };
  
  // Handler for alert details
  const handleAlertClick = (alert: SystemAlert) => {
    setSelectedAlert(alert);
  };
  
  // Handler for agent details
  const handleAgentClick = (agent: AgentUpdate) => {
    setSelectedAgent(agent);
  };
  
  // Handler for knowledge actions
  const handleKnowledgeAction = (alert: SystemAlert) => {
    setKnowledgeAlert(alert);
    setKnowledgeDialogOpen(true);
  };
  
  return (
    <div className="container p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor market activity, trades, portfolio performance, and system alerts in real-time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            Run All Agents
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MarketTicker className="lg:col-span-2" />
        <LiveTradesFeed onTradeClick={handleTradeClick} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LivePortfolioChart className="lg:col-span-2" />
        <SystemAlertsFeed onAlertClick={handleAlertClick} onKnowledgeAction={handleKnowledgeAction} />
      </div>
      
      <div className="pt-4">
        <AgentStatusGrid onAgentClick={handleAgentClick} />
      </div>
      
      {/* Trade Details Dialog */}
      <Dialog open={!!selectedTrade} onOpenChange={(open) => !open && setSelectedTrade(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
            <DialogDescription>
              Detailed information about this trade execution
            </DialogDescription>
          </DialogHeader>
          
          {selectedTrade && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trade ID</p>
                  <p className="font-medium">{selectedTrade.id}</p>
                </div>
                <Badge variant={selectedTrade.side === 'buy' ? "success" : "destructive"}>
                  {selectedTrade.side === 'buy' ? 'Buy' : 'Sell'}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Symbol</p>
                  <p className="font-medium">{selectedTrade.symbol}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedTrade.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{selectedTrade.amount.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">${selectedTrade.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="font-medium">${(selectedTrade.amount * selectedTrade.price).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(selectedTrade.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Agent Information</p>
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <p className="font-medium">{selectedTrade.agentId || 'Manual Trade'}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrade.agentNotes || 'No additional notes for this trade'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
            <DialogDescription>
              Detailed information about this system alert
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alert ID</p>
                  <p className="font-medium">{selectedAlert.id}</p>
                </div>
                <Badge variant={
                  selectedAlert.severity === 'error' ? "destructive" : 
                  selectedAlert.severity === 'warning' ? "warning" : 
                  selectedAlert.severity === 'success' ? "success" : 
                  "default"
                }>
                  {selectedAlert.severity}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium text-lg">{selectedAlert.title}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Message</p>
                <div className="bg-muted p-3 rounded-md">
                  <p>{selectedAlert.message}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedAlert.source}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedAlert.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedAlert.read ? 'Read' : 'Unread'}</p>
                </div>
              </div>
              
              {selectedAlert.actions && selectedAlert.actions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlert.actions.map((action, index) => (
                        <Button key={index} variant="outline" size="sm">
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Agent Details Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agent Details</DialogTitle>
            <DialogDescription>
              Detailed information about this trading agent
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agent ID</p>
                  <p className="font-medium">{selectedAgent.id}</p>
                </div>
                <Badge variant={
                  selectedAgent.status === 'active' ? "success" : 
                  selectedAgent.status === 'paused' ? "warning" : 
                  selectedAgent.status === 'error' ? "destructive" : 
                  "default"
                }>
                  {selectedAgent.status}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-lg">{selectedAgent.name}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedAgent.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Farm ID</p>
                  <p className="font-medium">{selectedAgent.farmId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="font-medium">{selectedAgent.trades}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="font-medium">{selectedAgent.winRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <p className={`font-medium ${selectedAgent.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedAgent.performance >= 0 ? '+' : ''}{selectedAgent.performance.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Active</p>
                  <p className="font-medium">{new Date(selectedAgent.lastActive).toLocaleString()}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <div className="bg-muted p-3 rounded-md">
                  <p>{selectedAgent.description || 'No description available'}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
                <Button className="flex-1" variant={selectedAgent.status === 'active' ? 'destructive' : 'default'}>
                  {selectedAgent.status === 'active' ? 'Stop Agent' : 'Start Agent'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Knowledge Integration Dialog */}
      <Dialog open={knowledgeDialogOpen} onOpenChange={setKnowledgeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Knowledge Integration</DialogTitle>
            <DialogDescription>
              Save information to ElizaOS knowledge base
            </DialogDescription>
          </DialogHeader>
          
          {knowledgeAlert && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                <h3 className="font-medium">Save to Knowledge Base</h3>
              </div>
              
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">{knowledgeAlert.title}</p>
                <p className="text-sm text-muted-foreground">{knowledgeAlert.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline">{knowledgeAlert.category}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline">{knowledgeAlert.source}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  <p className="font-medium text-indigo-700 dark:text-indigo-300">ElizaOS Knowledge Management</p>
                </div>
                <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70">
                  This information will be added to the ElizaOS knowledge base and made available for agent queries, strategy development, and trading insights.
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setKnowledgeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => {
                  // This would trigger the actual knowledge base integration
                  setKnowledgeDialogOpen(false);
                }}>
                  <Database className="h-4 w-4 mr-2" />
                  Save to Knowledge Base
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
