"use client"

import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Zap, 
  RefreshCw, 
  BarChart2, 
  TrendingUp, 
  ShieldAlert,
  HelpCircle,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react'

type MessageType = 'user' | 'ai' | 'system'

interface Message {
  id: string
  content: string
  type: MessageType
  timestamp: Date
}

interface QuickCommand {
  id: string
  label: string
  command: string
  icon: React.ReactNode
}

interface ElizaChatInterfaceProps {
  initialContext?: {
    module?: string;
    userId?: string;
    farmId?: string;
    view?: string;
    accountCount?: number;
    balance?: number;
    [key: string]: any;
  };
  showTitle?: boolean;
  title?: string;
  height?: string;
}

export default function ElizaChatInterface({
  initialContext = {},
  showTitle = true,
  title = "ElizaOS AI",
  height = "400px"
}: ElizaChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: 'Welcome to ElizaOS AI Command Console. How can I assist you with your trading today?',
      type: 'ai',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Quick commands for common actions
  const quickCommands: QuickCommand[] = [
    {
      id: 'status',
      label: 'System Status',
      command: 'Show me the system status',
      icon: <Zap className="h-4 w-4" />
    },
    {
      id: 'market',
      label: 'Market Analysis',
      command: 'Analyze current market conditions',
      icon: <BarChart2 className="h-4 w-4" />
    },
    {
      id: 'optimize',
      label: 'Optimize Strategy',
      command: 'Optimize my current trading strategy',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'risk',
      label: 'Risk Assessment',
      command: 'Assess my current risk profile',
      icon: <ShieldAlert className="h-4 w-4" />
    },
    {
      id: 'help',
      label: 'Help',
      command: 'What can you do?',
      icon: <HelpCircle className="h-4 w-4" />
    }
  ]

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() === '' || isProcessing) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      type: 'user',
      timestamp: new Date()
    }

    setMessages((prev: Message[]) => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    // Process the command
    processElizaCommand(inputValue)
  }

  // Handle quick command click
  const handleQuickCommand = (command: string) => {
    setInputValue(command)
    
    // Submit the form programmatically
    const form = document.getElementById('eliza-chat-form') as HTMLFormElement
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
  }

  // Process ElizaOS command (simulated AI response)
  const processElizaCommand = async (command: string) => {
    // Simulate processing delay (would connect to backend in real implementation)
    await new Promise(resolve => setTimeout(resolve, 1000))

    let response: Message

    // Detect intent (would be handled by Gemma 3 in real implementation)
    if (command.toLowerCase().includes('status') || command.toLowerCase().includes('system')) {
      response = {
        id: `ai-${Date.now()}`,
        content: `
        📊 **System Status**
        
        All trading systems are operational:
        - Auto-Trading: Active
        - Risk Manager: Monitoring
        - Exchange Connections: 4 connected
        - Active Agents: 8
        
        Current CPU usage: 32%
        Memory usage: 2.1GB
        Network latency: 45ms
        `,
        type: 'ai',
        timestamp: new Date()
      }
    } else if (command.toLowerCase().includes('market') || command.toLowerCase().includes('analyze')) {
      response = {
        id: `ai-${Date.now()}`,
        content: `
        📈 **Market Analysis**
        
        Current market conditions:
        - BTC: Bullish trend, support at $63,200
        - ETH: Consolidating, resistance at $3,550
        - SOL: Upward momentum, potential breakout above $145
        
        Market sentiment: Moderately bullish
        Volatility index: Medium (45/100)
        Notable events: Fed meeting tomorrow may impact markets
        `,
        type: 'ai',
        timestamp: new Date()
      }
    } else if (command.toLowerCase().includes('optimize') || command.toLowerCase().includes('strategy')) {
      response = {
        id: `ai-${Date.now()}`,
        content: `
        ⚙️ **Strategy Optimization**
        
        Based on recent performance, I recommend:
        - Increase position size for SOL trades by 5%
        - Adjust stop loss from fixed to trailing (2%)
        - Consider adding AVAX to your portfolio for diversification
        - Reduce exposure to high-risk altcoins temporarily
        
        Expected improvement: +2.3% in monthly returns
        Confidence score: 78%
        `,
        type: 'ai',
        timestamp: new Date()
      }
    } else if (command.toLowerCase().includes('risk')) {
      response = {
        id: `ai-${Date.now()}`,
        content: `
        🛡️ **Risk Assessment**
        
        Current risk profile:
        - Overall risk level: Moderate (62/100)
        - Highest exposure: BTC (35% of portfolio)
        - Drawdown protection: Active (10% max)
        - Danger zones: Leveraged positions in ETH
        
        Recommendation: Consider reducing leverage and implementing tighter stop-losses during this period of increased volatility.
        `,
        type: 'ai',
        timestamp: new Date()
      }
    } else if (command.toLowerCase().includes('help') || command.toLowerCase().includes('what can you do')) {
      response = {
        id: `ai-${Date.now()}`,
        content: `
        🤖 **ElizaOS Capabilities**
        
        I can help you with:
        - Monitoring system status and health
        - Analyzing market conditions and trends
        - Optimizing trading strategies
        - Assessing and managing risk
        - Setting and tracking trading goals
        - Managing your trading farms
        - Executing trades with natural language
        - Providing insights on market movements
        
        Try asking me specific questions about your trading activities, or use the quick command buttons below.
        `,
        type: 'ai',
        timestamp: new Date()
      }
    } else {
      // Generic response for unrecognized commands
      response = {
        id: `ai-${Date.now()}`,
        content: `I've processed your command: "${command}". In a fully implemented system, I would connect to the trading farm backend to execute this command and provide relevant information. Is there anything specific about your trading strategy or market conditions you'd like to know?`,
        type: 'ai',
        timestamp: new Date()
      }
    }

    setMessages((prev: Message[]) => [...prev, response])
    setIsProcessing(false)
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div 
      className={`dashboard-card ${isExpanded ? 'fixed inset-6 z-50 flex flex-col' : `h-[${height}] flex flex-col`}`}
      ref={chatContainerRef}
    >
      <div className="flex justify-between items-center mb-4">
        {showTitle && (
          <h2 className="text-xl font-bold flex items-center">
            <Zap className="mr-2 h-5 w-5 text-accent" />
            {title}
          </h2>
        )}
        <button 
          onClick={toggleExpanded}
          className="p-2 rounded-md hover:bg-muted"
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
      
      <div className="chat-container flex-1">
        <div className="chat-messages">
          {messages.map((message: Message) => (
            <div 
              key={message.id} 
              className={`mb-4 ${
                message.type === 'user' 
                  ? 'message-user' 
                  : message.type === 'ai' 
                    ? 'message-ai' 
                    : 'message-system'
              }`}
            >
              <div className="whitespace-pre-line">{message.content}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="message-ai flex items-center p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse delay-150"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form id="eliza-chat-form" onSubmit={handleSubmit} className="chat-input">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your command or question..."
            className="flex-1 form-input"
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="btn-primary p-2"
            disabled={isProcessing || inputValue.trim() === ''}
          >
            {isProcessing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
        
        <div className="px-4 py-2 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {quickCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => handleQuickCommand(cmd.command)}
                className="inline-flex items-center px-3 py-1 bg-muted hover:bg-muted/80 rounded-full text-xs"
                disabled={isProcessing}
              >
                {cmd.icon}
                <span className="ml-1">{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
