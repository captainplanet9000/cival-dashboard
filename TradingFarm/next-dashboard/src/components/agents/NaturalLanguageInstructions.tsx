"use client"

import { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  MessageSquare, 
  Bot, 
  User, 
  Edit, 
  Zap, 
  ArrowRight, 
  X,
  Check,
  Copy
} from 'lucide-react'

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error' | 'executing' | 'completed';
}

interface NaturalLanguageInstructionsProps {
  agentId?: string;
  agentName?: string;
}

/**
 * Natural Language Instructions Interface
 * Provides a chat-like interface for sending instructions to agents
 */
export const NaturalLanguageInstructions = ({ 
  agentId, 
  agentName = "All Agents"
}: NaturalLanguageInstructionsProps) => {
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm ElizaOS. How can I assist with your ${agentName === "All Agents" ? "agents" : agentName} today?`,
      sender: 'agent',
      timestamp: new Date(Date.now() - 60000),
      status: 'completed'
    }
  ])
  
  const [quickCommands, setQuickCommands] = useState([
    "Create a trend-following agent for Bitcoin",
    "Optimize all agents for reduced risk",
    "Show performance metrics for this agent",
    "Adjust position sizing for volatile markets",
    "Pause this agent during market uncertainty"
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!message.trim()) return
    
    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    }
    
    setMessages(prev => [...prev, newUserMessage])
    setMessage('')
    
    // Simulate agent response after a short delay
    setTimeout(() => {
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newUserMessage.id 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      )
      
      // Add agent response (simulated)
      const newAgentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: simulateResponse(message),
        sender: 'agent',
        timestamp: new Date(),
        status: 'completed'
      }
      
      setMessages(prev => [...prev, newAgentMessage])
    }, 1000)
  }
  
  // Simple simulation of agent responses
  const simulateResponse = (userMessage: string): string => {
    const lowerCaseMessage = userMessage.toLowerCase()
    
    if (lowerCaseMessage.includes('create')) {
      return "I'll help you create a new agent. Please tell me more about what type of trading strategy you'd like to implement."
    } else if (lowerCaseMessage.includes('optimize') || lowerCaseMessage.includes('improve')) {
      return "I'll optimize the agent settings. This might take a few minutes to analyze past performance and adjust parameters."
    } else if (lowerCaseMessage.includes('performance') || lowerCaseMessage.includes('metrics')) {
      return "Here are the latest performance metrics for the agent. Overall performance is +8.2% with a 64% win rate over the last 30 days."
    } else if (lowerCaseMessage.includes('pause') || lowerCaseMessage.includes('stop')) {
      return "I've paused the agent. It will no longer make any trades until you resume its operation."
    } else if (lowerCaseMessage.includes('risk') || lowerCaseMessage.includes('volatile')) {
      return "I've adjusted the risk parameters to be more conservative during the current volatile market conditions."
    } else {
      return "I understand your request. Is there anything specific about the agent's behavior you'd like me to modify?"
    }
  }
  
  const handleQuickCommand = (command: string) => {
    setMessage(command)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="border rounded-lg flex flex-col h-[500px] bg-card">
      {/* Header */}
      <div className="border-b p-3 flex justify-between items-center">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-primary" />
          <h3 className="font-medium">Natural Language Instructions</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {agentId ? `Instructing: ${agentName}` : 'Instructing: All Agents'}
        </div>
      </div>
      
      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center mb-1">
                {msg.sender === 'user' ? (
                  <User className="h-4 w-4 mr-1" />
                ) : (
                  <Bot className="h-4 w-4 mr-1" />
                )}
                <span className="text-xs font-medium mr-2">
                  {msg.sender === 'user' ? 'You' : 'ElizaOS'}
                </span>
                <span className="text-xs opacity-70">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="text-sm whitespace-pre-wrap">
                {msg.content}
              </div>
              
              {msg.status && msg.sender === 'user' && (
                <div className="flex justify-end mt-1">
                  <span className="text-xs opacity-70 flex items-center">
                    {msg.status === 'sending' && 'Sending...'}
                    {msg.status === 'sent' && (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Sent
                      </>
                    )}
                    {msg.status === 'error' && (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Error
                      </>
                    )}
                  </span>
                </div>
              )}
              
              {msg.status && msg.sender === 'agent' && msg.status === 'executing' && (
                <div className="flex justify-end mt-1">
                  <span className="text-xs opacity-70 flex items-center">
                    <Zap className="h-3 w-3 mr-1 animate-pulse" />
                    Executing...
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Commands */}
      <div className="p-2 border-t bg-muted/10">
        <div className="text-xs text-muted-foreground mb-2">Quick Commands:</div>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((command, index) => (
            <button
              key={index}
              onClick={() => handleQuickCommand(command)}
              className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 whitespace-nowrap"
            >
              {command}
            </button>
          ))}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t p-3 bg-muted/10">
        <div className="flex items-center">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your instructions to the agent..."
            className="flex-1 bg-background border rounded-md py-2 px-3 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className={`ml-2 p-2 rounded-md ${
              message.trim()
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Use natural language to instruct the agent. ElizaOS will interpret your commands.
        </div>
      </div>
    </div>
  )
}

export default NaturalLanguageInstructions; 