"use client"

import { useState } from "react"
import { Bot, BarChart, Activity, Wallet, PlusCircle, ChevronUp, ChevronDown, X } from "lucide-react"

interface StandaloneQuickCommandsProps {
  onClose?: () => void
}

// Simple standalone version that matches the exact DOM structure
export function StandaloneQuickCommands({ onClose }: StandaloneQuickCommandsProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  const handleClose = () => {
    setIsVisible(false)
    if (onClose) onClose()
  }
  
  if (!isVisible) return null
  
  return (
    <div className="bg-card border border-border rounded-md shadow-lg p-3 mb-2 w-[280px] fixed bottom-20 right-6 z-50">
      {/* Make the header with very prominent controls */}
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h3 className="text-sm font-medium flex items-center gap-1">
          <Bot className="h-3 w-3 text-primary" />
          <span>ElizaOS Quick Commands</span>
        </h3>
        <button 
          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
          <span>Close</span>
        </button>
      </div>
      
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs text-muted-foreground">
          2 active agents
        </div>
        <button 
          className="bg-muted hover:bg-accent px-2 py-1 rounded text-xs flex items-center gap-1"
          onClick={handleClose}
        >
          <ChevronDown className="h-3 w-3" />
          <span>Minimize</span>
        </button>
      </div>
      
      <div className="mb-3 bg-muted/30 p-2 rounded-md text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-muted-foreground">Avg Performance:</span>
          <span className="text-green-500">8.00%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Top Agent:</span>
          <span className="font-medium">SwingTrader</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button 
            className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
            onClick={() => console.log("View All Agents")}
          >
            <Bot className="h-3 w-3 text-primary" />
            <span>View All Agents</span>
          </button>
          <button 
            className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
            onClick={() => console.log("Performance Report")}
          >
            <BarChart className="h-3 w-3 text-primary" />
            <span>Performance Report</span>
          </button>
          <button 
            className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
            onClick={() => console.log("Active Trades")}
          >
            <Activity className="h-3 w-3 text-primary" />
            <span>Active Trades</span>
          </button>
          <button 
            className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
            onClick={() => console.log("Wallet Status")}
          >
            <Wallet className="h-3 w-3 text-primary" />
            <span>Wallet Status</span>
          </button>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t">
        <button
          className="flex items-center gap-1 text-xs w-full justify-center p-1.5 hover:bg-muted rounded-md"
          onClick={() => console.log("Create Agent")}
        >
          <PlusCircle className="h-3 w-3 text-primary" />
          <span>Create New Agent</span>
        </button>
      </div>
      
      {/* Add extremely visible close button at the bottom */}
      <div className="mt-3 pt-2">
        <button
          className="flex items-center gap-1 text-xs w-full justify-center p-2 bg-muted hover:bg-accent rounded-md font-medium border border-border"
          onClick={handleClose}
        >
          <ChevronDown className="h-3 w-3" />
          <span>CLOSE PANEL</span>
        </button>
      </div>
    </div>
  )
}
