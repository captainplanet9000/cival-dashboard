"use client"

import { useState, useRef, useEffect } from 'react'
import { 
  Bot, 
  Send, 
  Cpu, 
  PanelRight, 
  Sparkles, 
  Lightbulb, 
  HelpCircle,
  ChevronDown,
  X,
  Clock,
  BarChart2,
  AlertTriangle,
  Wifi,
  RefreshCw,
  MessageSquare,
  Settings,
  Clipboard,
  Zap
} from 'lucide-react'

// Message types
type MessageType = 'user' | 'ai' | 'system'

interface Message {
  id: string
  content: string
  type: MessageType
  timestamp: Date
  isLoading?: boolean
  isError?: boolean
}

// Sample command suggestions
const commandSuggestions = [
  { id: '1', command: 'System Status', description: 'Get current system health and status' },
  { id: '2', command: 'Market Analysis', description: 'Analyze current market conditions' },
  { id: '3', command: 'Optimize Strategy', description: 'Suggest improvements for current strategy' },
  { id: '4', command: 'Market Forecast', description: 'Predict market trends for the next 24 hours' },
  { id: '5', command: 'Adjust Risk', description: 'Recommend risk adjustment parameters' }
]

export default function ElizaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello, I am ElizaOS, your AI trading assistant. How can I help you today?',
      type: 'ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
    },
    {
      id: '2',
      content: 'I can help with market analysis, strategy optimization, system monitoring, and more. Try asking me about the current system status.',
      type: 'ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 4) // 4 minutes ago
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Function to handle input submission
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!inputValue.trim()) return
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      type: 'user',
      timestamp: new Date()
    }
    
    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: 'Thinking...',
      type: 'ai',
      timestamp: new Date(),
      isLoading: true
    }
    
    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInputValue('')
    setIsProcessing(true)
    
    // Simulate AI response
    setTimeout(() => {
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading))
      
      // Determine response based on input
      let response = ''
      const lowerCaseInput = userMessage.content.toLowerCase()
      
      if (lowerCaseInput.includes('hello') || lowerCaseInput.includes('hi')) {
        response = 'Hello! I\'m here to assist with your trading needs. How can I help today?'
      } else if (lowerCaseInput.includes('system status') || lowerCaseInput.includes('status')) {
        response = 'All systems operational. Current status:\n- Auto-Trading: Active\n- Risk Manager: Enabled\n- Exchange Connections: 3/3 Online\n- Active Strategies: 5\n- Position Limits: 70% Utilized\n- Last System Check: 3 minutes ago'
      } else if (lowerCaseInput.includes('market') || lowerCaseInput.includes('analysis')) {
        response = 'Market Analysis as of March 20, 2025:\n\nBTC: Strong uptrend, +2.4% in last 24h with increased volume. Key resistance at $87,500.\n\nETH: Consolidating after breakout, +1.8% in 24h. Support formed at $4,950.\n\nOverall Market: Bullish sentiment with 65% of top assets in positive territory. Volatility index at moderate levels.'
      } else if (lowerCaseInput.includes('risk') || lowerCaseInput.includes('adjustment')) {
        response = 'Risk Assessment:\n\nBased on current market conditions, I recommend the following adjustments:\n\n1. Reduce position size for high-beta assets by 10%\n2. Increase stop-loss distance from 5% to 6.5% for trending positions\n3. Set take-profit levels at 3:1 risk-reward ratio\n4. Consider hedging 15% of portfolio with inverse positions\n\nThese adjustments maintain your risk profile while adapting to the current volatility environment.'
      } else if (lowerCaseInput.includes('strategy') || lowerCaseInput.includes('optimize')) {
        response = 'Strategy Optimization Recommendations:\n\n1. For your Momentum strategy: Consider reducing lookback period from 14 to 10 days to capture recent volatility\n\n2. For DCA Strategy: Increase frequency from weekly to bi-weekly based on current market conditions\n\n3. For your Swing Trading strategy: Add trailing stop at 15% to maximize recent trend movements\n\nImplementing these changes could improve overall performance by an estimated 8-12% based on backtests.'
      } else if (lowerCaseInput.includes('forecast') || lowerCaseInput.includes('predict')) {
        response = '24-Hour Market Forecast:\n\nBTC is likely to test the $87,500 resistance with a 65% probability of breakthrough based on order book analysis and funding rates.\n\nETH shows consolidation patterns with increased accumulation at $4,950-$5,100 range.\n\nOverall market expected to maintain bullish bias with 70% probability, though watch for potential pullback if BTC fails at resistance.\n\nRecommendation: Maintain current positions with appropriate stop losses. Consider scaling into ETH positions if support holds.'
      } else if (lowerCaseInput.includes('help') || lowerCaseInput.includes('command')) {
        response = 'Available Commands:\n\n1. System Status - Check the health of your trading system\n2. Market Analysis - Get current market insights\n3. Optimize Strategy - Receive suggestions for strategy improvements\n4. Market Forecast - Get short-term market predictions\n5. Adjust Risk - Get risk management recommendations\n6. Portfolio Summary - View your current holdings\n7. Performance Report - Analyze trading performance\n\nYou can also ask me questions in natural language about market conditions, trading strategies, or system management.'
      } else {
        response = 'I\'ve processed your request. To provide a more accurate response, I may need more specific information. Try asking about system status, market analysis, strategy optimization, or use one of the suggested commands for best results.'
      }
      
      // Add AI response
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response,
        type: 'ai',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
      setIsProcessing(false)
    }, 1500)
  }
  
  // Handle command suggestion click
  const handleCommandClick = (command: string) => {
    setInputValue(command)
  }
  
  // Format message content with line breaks
  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ))
  }
  
  return (
    <div className="p-6 h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col dashboard-card h-full overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-border p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">ElizaOS Chat</h2>
                <div className="text-sm text-muted-foreground flex items-center">
                  <span className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-success mr-1"></span>
                    Online
                  </span>
                  <span className="mx-2">•</span>
                  <span>Gemma 3 LLM</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                className="btn-ghost-sm"
                onClick={() => setShowSidebar(!showSidebar)}
                title={showSidebar ? "Hide sidebar" : "Show sidebar"}
              >
                <PanelRight className="h-4 w-4" />
              </button>
              <button className="btn-ghost-sm" title="Settings">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {message.type !== 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' ? 'bg-primary text-primary-foreground' : 
                    message.type === 'system' ? 'bg-muted' : 'bg-muted/50'
                  } ${message.isLoading ? 'animate-pulse' : ''}`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {formatMessageContent(message.content)}
                      
                      {/* Message timestamp */}
                      <div className="text-[10px] text-muted-foreground/70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
                
                {message.type === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ml-3 mt-1">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Command suggestions */}
          {showCommandSuggestions && (
            <div className="px-4 pb-3">
              <div className="relative">
                <button 
                  className="flex items-center text-xs text-muted-foreground mb-2"
                  onClick={() => setShowCommandSuggestions(!showCommandSuggestions)}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  <span>Suggested commands</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </button>
                
                <div className="flex flex-wrap gap-2">
                  {commandSuggestions.map((cmd) => (
                    <button
                      key={cmd.id}
                      className="inline-flex items-center text-xs rounded-full border border-border px-3 py-1 hover:bg-muted transition-colors"
                      onClick={() => handleCommandClick(cmd.command)}
                      title={cmd.description}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {cmd.command}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Input */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="Type a message or command..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isProcessing}
              />
              <button
                type="submit"
                className={`btn-primary-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-full md:w-80 dashboard-card h-full overflow-hidden flex flex-col">
            <div className="border-b border-border p-4">
              <h3 className="font-medium">ElizaOS Information</h3>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-6 flex-1">
              {/* System Status */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Cpu className="h-4 w-4 mr-2" />
                  System Status
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Auto Trading</span>
                    <span className="flex items-center text-success">
                      <span className="h-2 w-2 rounded-full bg-success mr-1"></span>
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Risk Manager</span>
                    <span className="flex items-center text-success">
                      <span className="h-2 w-2 rounded-full bg-success mr-1"></span>
                      Enabled
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Exchange Connections</span>
                    <span className="flex items-center text-success">
                      <span className="h-2 w-2 rounded-full bg-success mr-1"></span>
                      3/3 Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Strategies</span>
                    <span>5</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Position Limits</span>
                    <span>70% Utilized</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last System Check</span>
                    <span>3 minutes ago</span>
                  </div>
                </div>
              </div>
              
              {/* Recent Commands */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Commands
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm p-2 hover:bg-muted rounded-md cursor-pointer">
                    <MessageSquare className="h-3 w-3 mr-2 text-muted-foreground" />
                    <span>System Status</span>
                  </div>
                  <div className="flex items-center text-sm p-2 hover:bg-muted rounded-md cursor-pointer">
                    <MessageSquare className="h-3 w-3 mr-2 text-muted-foreground" />
                    <span>Market Analysis</span>
                  </div>
                  <div className="flex items-center text-sm p-2 hover:bg-muted rounded-md cursor-pointer">
                    <MessageSquare className="h-3 w-3 mr-2 text-muted-foreground" />
                    <span>Adjust Risk Parameters</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Commands */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Commands
                </h4>
                
                <div className="space-y-2">
                  <button className="flex items-center justify-between w-full text-sm p-2 hover:bg-muted rounded-md">
                    <span className="flex items-center">
                      <BarChart2 className="h-3 w-3 mr-2 text-muted-foreground" />
                      Generate Performance Report
                    </span>
                    <Sparkles className="h-3 w-3 text-primary" />
                  </button>
                  
                  <button className="flex items-center justify-between w-full text-sm p-2 hover:bg-muted rounded-md">
                    <span className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-2 text-muted-foreground" />
                      Market Alert Settings
                    </span>
                    <Sparkles className="h-3 w-3 text-primary" />
                  </button>
                  
                  <button className="flex items-center justify-between w-full text-sm p-2 hover:bg-muted rounded-md">
                    <span className="flex items-center">
                      <Wifi className="h-3 w-3 mr-2 text-muted-foreground" />
                      Test API Connections
                    </span>
                    <Sparkles className="h-3 w-3 text-primary" />
                  </button>
                  
                  <button className="flex items-center justify-between w-full text-sm p-2 hover:bg-muted rounded-md">
                    <span className="flex items-center">
                      <RefreshCw className="h-3 w-3 mr-2 text-muted-foreground" />
                      Refresh All Data
                    </span>
                    <Sparkles className="h-3 w-3 text-primary" />
                  </button>
                </div>
              </div>
              
              {/* Command Help */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Command Help
                </h4>
                
                <div className="space-y-4 text-xs text-muted-foreground">
                  <p>
                    You can interact with ElizaOS using natural language. Try asking about:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Current market conditions</li>
                    <li>Trading strategy optimization</li>
                    <li>Risk management suggestions</li>
                    <li>Farm and agent performance</li>
                    <li>Portfolio allocation</li>
                  </ul>
                  <p>
                    For advanced commands, use the suggested commands above or type
                    "help" to see all available commands.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
