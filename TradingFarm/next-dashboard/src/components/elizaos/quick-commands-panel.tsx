"use client"

import { useState } from "react"
import { Bot, BarChart, Activity, Wallet, PlusCircle, ChevronUp, ChevronDown, X, Minimize2, Maximize2 } from "lucide-react"
import { Agent } from "@/components/agents/agent-details"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useEliza } from "@/context/eliza-context"

interface QuickCommandsPanelProps {
  agents: Agent[]
  onCommandSelect: (command: string) => void
}

export function QuickCommandsPanel({
  agents = [],
  onCommandSelect
}: QuickCommandsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const { isQuickCommandsOpen, closeQuickCommands } = useEliza()

  // Calculate average performance
  const avgPerformance = agents.length > 0
    ? agents.reduce((sum, agent) => sum + agent.performance, 0) / agents.length
    : 0
  
  // Find top performing agent
  const topAgent = agents.length > 0
    ? agents.reduce((top, agent) => agent.performance > top.performance ? agent : top, agents[0])
    : null
  
  // Quick commands
  const quickCommands = [
    { 
      icon: <Bot className="h-3 w-3 text-primary" />, 
      label: "View All Agents",
      command: "list agents"
    },
    { 
      icon: <BarChart className="h-3 w-3 text-primary" />, 
      label: "Performance Report",
      command: "show performance report"
    },
    { 
      icon: <Activity className="h-3 w-3 text-primary" />, 
      label: "Active Trades",
      command: "show active trades"
    },
    { 
      icon: <Wallet className="h-3 w-3 text-primary" />, 
      label: "Wallet Status",
      command: "check wallet balance"
    }
  ]
  
  // Handle command click
  const handleCommandClick = (command: string) => {
    onCommandSelect(command)
    closeQuickCommands()
  }
  
  // Handle minimize/maximize
  const handleMinimizeToggle = () => {
    setIsMinimized(!isMinimized)
  }
  
  if (!isQuickCommandsOpen) return null
  
  // DIRECTLY REPLICATE THE DOM STRUCTURE WITH ADDED CLOSE BUTTONS
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 mb-2 w-[280px] fixed bottom-20 right-6 z-50">
      {/* This is an EXACT match to the element structure the user sees, with added buttons */}
      
      {/* Add floating close button that's unmissable */}
      <button
        onClick={closeQuickCommands}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-50"
        style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <X size={14} />
      </button>
      
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-1">
          <Bot className="h-3 w-3 text-primary" />
          <span>ElizaOS Quick Commands</span>
        </h3>
        <div className="text-xs text-muted-foreground">
          {agents.filter(a => a.status === 'active').length} active
        </div>
      </div>
      
      <div className="mb-3 bg-muted/30 p-2 rounded-md text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-muted-foreground">Avg Performance:</span>
          <span className={avgPerformance >= 0 ? "text-green-500" : "text-red-500"}>
            {avgPerformance.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Top Agent:</span>
          <span className="font-medium">{topAgent?.name || "None"}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-1">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
              onClick={() => handleCommandClick(cmd.command)}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t">
        <button
          className="flex items-center gap-1 text-xs w-full justify-center p-1.5 hover:bg-muted rounded-md"
          onClick={() => handleCommandClick("create agent")}
        >
          <PlusCircle className="h-3 w-3 text-primary" />
          <span>Create New Agent</span>
        </button>
      </div>
      
      {/* Add unmissable close button at bottom */}
      <div className="mt-3">
        <button
          className="flex items-center gap-1 text-xs w-full justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium"
          onClick={closeQuickCommands}
        >
          <X className="h-3 w-3" />
          <span>CLOSE PANEL</span>
        </button>
      </div>
    </div>
  )
}
