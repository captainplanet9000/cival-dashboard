"use client"

import { useState, useEffect, useRef } from 'react'
import { Bot, Minimize2, Maximize2, X, Send, Sparkles, ArrowUp, ArrowDown, Clock, List, BarChart, Activity, Wallet, PlusCircle } from 'lucide-react'
import { useElizaAgentCommands } from '@/hooks/use-eliza-agent-commands'
import { Agent } from '@/components/agents/agent-details'
import { CommandResponse } from '@/hooks/use-eliza-agent-commands'
import { useEliza } from '@/context/eliza-context'

interface ElizaCommandConsoleProps {
  isMinimized: boolean
  onMinimizeToggle: () => void
  onClose: () => void
  executeCommand: (command: string) => Promise<CommandResponse>
  agents?: Agent[]
  onAgentChange?: (updatedAgents: Agent[]) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
}

interface MessageType {
  type: 'user' | 'system'
}

interface CommandFeedback {
  type: 'success' | 'error'
  message: string
}

// Common command suggestions based on typical agent operations
const COMMAND_SUGGESTIONS = [
  "Create trend agent for Bitcoin",
  "Show all active agents",
  "Pause ReversalMaster agent",
  "Add instruction to TrendMaster: Focus on volatility breakouts",
  "Show TrendMaster performance",
  "Change SwingTrader risk to medium",
  "Enable instruction 2 for ReversalMaster",
  "List TrendMaster instructions"
]

export default function ElizaCommandConsole({
  isMinimized,
  onMinimizeToggle,
  onClose,
  executeCommand,
  agents = [],
  onAgentChange
}: ElizaCommandConsoleProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to ElizaOS Command Console. How can I assist you with managing your trading agents today?',
      timestamp: new Date()
    }
  ])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [showHistory, setShowHistory] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback | null>(null)
  
  // Directly manage quick commands inside the console component
  const [quickCommandsVisible, setQuickCommandsVisible] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when console is opened
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isMinimized])

  // Listen for external command events
  useEffect(() => {
    const handleExternalCommand = (e: CustomEvent<{ command: string }>) => {
      if (e.detail.command) {
        handleSubmit(e.detail.command)
      }
    }
    
    // Type assertion to handle custom event
    document.addEventListener('eliza:command', handleExternalCommand as EventListener)
    
    return () => {
      document.removeEventListener('eliza:command', handleExternalCommand as EventListener)
    }
  }, [])

  // Filter suggestions based on input
  useEffect(() => {
    if (input.trim() === '') {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    const filtered = COMMAND_SUGGESTIONS.filter(
      suggestion => suggestion.toLowerCase().includes(input.toLowerCase())
    )
    
    setFilteredSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedSuggestion(-1)
  }, [input])

  const handleSubmit = (commandText: string = input) => {
    if (!commandText.trim()) return
    
    // Add the command to history
    setCommandHistory(prev => {
      const newHistory = [commandText, ...prev.slice(0, 19)]
      // Save to localStorage for persistence
      localStorage.setItem('elizaCommandHistory', JSON.stringify(newHistory))
      return newHistory
    })
    
    // Reset input and hide suggestions
    setInput('')
    setShowSuggestions(false)
    setHistoryIndex(-1)
    
    // Add the command to messages
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: commandText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    // Process the command
    const processCommand = async () => {
      setIsProcessing(true)
      try {
        // Process with agent commands hook
        const response = await executeCommand(commandText)
        
        // Add response to messages
        const systemMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response.message || 'Command processed successfully.',
          timestamp: new Date(),
          isError: !response.success
        }
        
        setMessages(prev => [...prev, systemMessage])
        
        // Show visual feedback
        if (response.success) {
          setCommandFeedback({
            type: 'success',
            message: 'Command executed successfully'
          })
        } else {
          setCommandFeedback({
            type: 'error',
            message: response.error || 'Failed to execute command'
          })
        }
      } catch (error) {
        console.error('Error processing command:', error)
        // Add error message
        const errorMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          timestamp: new Date(),
          isError: true
        }
        
        setMessages(prev => [...prev, errorMessage])
        
        setCommandFeedback({
          type: 'error',
          message: 'Error processing command'
        })
      } finally {
        setIsProcessing(false)
        // Clear feedback after a delay
        setTimeout(() => {
          setCommandFeedback(null)
        }, 3000)
      }
    }
    
    processCommand()
  }

  // Handle keyboard navigation for history and suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle up/down arrows for command history
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && selectedSuggestion > -1) {
        // Navigate up in suggestions
        setSelectedSuggestion(prev => Math.max(0, prev - 1))
      } else {
        // Navigate up in history
        const nextIndex = Math.min(commandHistory.length - 1, historyIndex + 1)
        if (nextIndex >= 0 && commandHistory[nextIndex]) {
          setHistoryIndex(nextIndex)
          setInput(commandHistory[nextIndex])
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && selectedSuggestion < filteredSuggestions.length - 1) {
        // Navigate down in suggestions
        setSelectedSuggestion(prev => Math.min(filteredSuggestions.length - 1, prev + 1))
      } else {
        // Navigate down in history
        const nextIndex = Math.max(-1, historyIndex - 1)
        if (nextIndex === -1) {
          setHistoryIndex(-1)
          setInput('')
        } else if (commandHistory[nextIndex]) {
          setHistoryIndex(nextIndex)
          setInput(commandHistory[nextIndex])
        }
      }
    } else if (e.key === 'Tab' && showSuggestions) {
      e.preventDefault()
      // Use selected suggestion or first one
      const suggestionIndex = selectedSuggestion === -1 ? 0 : selectedSuggestion
      if (filteredSuggestions[suggestionIndex]) {
        setInput(filteredSuggestions[suggestionIndex])
        setShowSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      // Close suggestions
      setShowSuggestions(false)
      setShowHistory(false)
    }
  }

  // Function to apply a suggestion
  const applySuggestion = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Function to apply a history item
  const applyHistoryItem = (command: string) => {
    setInput(command)
    setShowHistory(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 p-2 bg-card border border-border shadow-lg rounded-md">
        <button 
          onClick={onMinimizeToggle}
          className="flex items-center gap-2 text-sm"
        >
          <Bot className="h-4 w-4 text-primary" />
          <span>ElizaOS</span>
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed z-50 ${isMinimized ? 'bottom-4 right-4 w-auto' : 'bottom-0 right-0 md:right-8 md:bottom-8 md:w-[450px]'}`}>
      {/* Directly render QuickCommandsPanel within the console component */}
      {!isMinimized && quickCommandsVisible && (
        <div className="bg-card border-2 border-red-500 rounded-md shadow-lg p-3 mb-2 w-[280px] fixed bottom-[620px] right-6 z-50">
          {/* Unmissable floating close button */}
          <button
            onClick={() => setQuickCommandsVisible(false)}
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
              <span className={agents.length > 0 && agents.reduce((sum, agent) => sum + agent.performance, 0) / agents.length >= 0 ? "text-green-500" : "text-red-500"}>
                {agents.length > 0 ? (agents.reduce((sum, agent) => sum + agent.performance, 0) / agents.length).toFixed(2) : "0.00"}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Top Agent:</span>
              <span className="font-medium">
                {agents.length > 0 ? agents.reduce((top, agent) => agent.performance > top.performance ? agent : top, agents[0]).name : "None"}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
                onClick={() => { 
                  handleSubmit("list agents");
                  setQuickCommandsVisible(false);
                }}
              >
                <Bot className="h-3 w-3 text-primary" />
                <span>View All Agents</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
                onClick={() => {
                  handleSubmit("show performance report");
                  setQuickCommandsVisible(false);
                }}
              >
                <BarChart className="h-3 w-3 text-primary" />
                <span>Performance Report</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
                onClick={() => {
                  handleSubmit("show active trades");
                  setQuickCommandsVisible(false);
                }}
              >
                <Activity className="h-3 w-3 text-primary" />
                <span>Active Trades</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs p-1.5 hover:bg-muted rounded-md"
                onClick={() => {
                  handleSubmit("check wallet balance");
                  setQuickCommandsVisible(false);
                }}
              >
                <Wallet className="h-3 w-3 text-primary" />
                <span>Wallet Status</span>
              </button>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t">
            <button
              className="flex items-center gap-1 text-xs w-full justify-center p-1.5 hover:bg-muted rounded-md"
              onClick={() => {
                handleSubmit("create agent");
                setQuickCommandsVisible(false);
              }}
            >
              <PlusCircle className="h-3 w-3 text-primary" />
              <span>Create New Agent</span>
            </button>
          </div>
          
          {/* Unmissable close button at bottom */}
          <div className="mt-3">
            <button
              className="flex items-center gap-1 text-xs w-full justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium"
              onClick={() => setQuickCommandsVisible(false)}
            >
              <X className="h-3 w-3" />
              <span>CLOSE PANEL</span>
            </button>
          </div>
        </div>
      )}
      
      <div className={`bg-background border rounded-lg shadow-lg overflow-hidden ${isMinimized ? 'p-3' : 'h-[600px] flex flex-col'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">ElizaOS Command Console</h3>
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <button 
                className="p-1 hover:bg-accent rounded-sm"
                onClick={() => setQuickCommandsVisible(!quickCommandsVisible)}
                title="Toggle Quick Commands"
              >
                <List className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button 
              className="p-1 hover:bg-accent rounded-sm"
              onClick={onMinimizeToggle}
            >
              {isMinimized ? 
                <Maximize2 className="h-4 w-4 text-muted-foreground" /> : 
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            <button 
              className="p-1 hover:bg-accent rounded-sm"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Messages container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-3"
        >
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-2 rounded-md ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : message.isError 
                      ? 'bg-destructive/10 text-destructive border border-destructive/30' 
                      : 'bg-muted text-foreground'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1 text-right">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => setShowSuggestions(prev => !prev)}
              className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground"
              title="Show suggestions"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setShowHistory(prev => !prev)}
              className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground"
              title="Show command history"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
          
          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="mb-2 bg-popover border border-border rounded-md shadow-md max-h-[150px] overflow-y-auto">
              <div className="p-1 text-xs text-muted-foreground border-b border-border">
                Suggestions (Tab to select)
              </div>
              <div>
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={`w-full text-left p-2 text-sm hover:bg-accent ${
                      selectedSuggestion === index ? 'bg-accent' : ''
                    }`}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* History dropdown */}
          {showHistory && commandHistory.length > 0 && (
            <div className="mb-2 bg-popover border border-border rounded-md shadow-md max-h-[150px] overflow-y-auto">
              <div className="p-1 text-xs text-muted-foreground border-b border-border">
                Command History
              </div>
              <div>
                {commandHistory.map((command, index) => (
                  <button
                    key={index}
                    className={`w-full text-left p-2 text-sm hover:bg-accent truncate ${
                      historyIndex === index ? 'bg-accent' : ''
                    }`}
                    onClick={() => applyHistoryItem(command)}
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit(input)
              setInput('')
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or message..."
                className="w-full p-2 pr-10 rounded-md bg-background border border-border"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <Send className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>
          </form>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" /> <ArrowDown className="h-3 w-3" /> for command history | 
              <span className="px-1 bg-muted rounded text-[10px]">Tab</span> to complete suggestion
            </span>
          </div>
          {commandFeedback && (
            <div className={`mt-2 text-xs ${commandFeedback.type === 'success' ? 'text-success' : 'text-destructive'}`}>
              {commandFeedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
