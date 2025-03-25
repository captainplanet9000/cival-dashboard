"use client"

import { useState } from "react"
import { Bot, BarChart, Activity, Wallet, PlusCircle, ChevronDown, X } from "lucide-react"
import { Agent } from "@/components/agents/agent-details"

interface VisibleQuickCommandsProps {
  agents?: Agent[]
  onClose: () => void
  onCommandSelect: (command: string) => void
}

export function VisibleQuickCommands({
  agents = [],
  onClose,
  onCommandSelect
}: VisibleQuickCommandsProps) {
  // No conditional rendering here - this component will always be visible when rendered
  
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
      icon: <Bot size={14} className="text-primary" />, 
      label: "View All Agents",
      command: "list agents"
    },
    { 
      icon: <BarChart size={14} className="text-primary" />, 
      label: "Performance Report",
      command: "show performance report"
    },
    { 
      icon: <Activity size={14} className="text-primary" />, 
      label: "Active Trades",
      command: "show active trades"
    },
    { 
      icon: <Wallet size={14} className="text-primary" />, 
      label: "Wallet Status",
      command: "check wallet balance"
    }
  ]
  
  // Handle command click
  const handleCommandClick = (command: string) => {
    onCommandSelect(command)
    onClose()
  }
    
  return (
    <div className="bg-card border-2 border-primary rounded-md shadow-xl p-3 mb-2 w-[280px] fixed bottom-24 right-8 z-50">
      {/* Extra obvious close button at the top */}
      <button 
        onClick={onClose} 
        className="absolute -top-3 -right-3 bg-destructive text-white rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
        aria-label="Close panel"
      >
        <X size={18} />
      </button>
      
      {/* Header with title */}
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <h3 className="text-base font-medium flex items-center gap-1">
          <Bot className="text-primary" size={16} />
          ElizaOS Commands
        </h3>
      </div>
      
      {/* Agent stats */}
      <div className="bg-muted/30 p-2 rounded-md text-sm mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-muted-foreground">Performance:</span>
          <span className={avgPerformance >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
            {avgPerformance.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Top Agent:</span>
          <span className="font-medium">{topAgent?.name || "None"}</span>
        </div>
      </div>
      
      {/* Quick commands */}
      <div>
        <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              className="flex items-center justify-center gap-1.5 text-sm p-2 bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              onClick={() => handleCommandClick(cmd.command)}
            >
              {cmd.icon}
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Create agent button */}
      <button
        className="flex items-center gap-1.5 text-sm w-full justify-center p-2 bg-primary/20 hover:bg-primary/30 rounded-md mt-3 transition-colors"
        onClick={() => handleCommandClick("create agent")}
      >
        <PlusCircle size={14} className="text-primary" />
        <span>Create New Agent</span>
      </button>
      
      {/* Unmissable close button */}
      <button
        className="flex items-center gap-1.5 w-full justify-center p-2 bg-destructive hover:bg-destructive/90 text-white rounded-md mt-3 font-medium"
        onClick={onClose}
      >
        <ChevronDown size={14} />
        <span>CLOSE PANEL</span>
      </button>
    </div>
  )
}
