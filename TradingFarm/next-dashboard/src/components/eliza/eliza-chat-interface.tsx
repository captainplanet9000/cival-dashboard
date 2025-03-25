"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
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
  Minimize2,
  Bot,
  Brain,
  FileText,
  MessageSquare,
  ChevronDown,
  Upload,
  Copy,
  Save
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sendChatMessage, processFileUpload } from '@/services/ai/ai-integration'
import { useKnowledgeChat } from './knowledge-chat-connector'

export type MessageType = 'user' | 'ai' | 'system' | 'error' | 'metadata'

export interface ChatMessage {
  id: string
  content: string
  type: MessageType
  timestamp: Date
  metadata?: {
    modelName?: string
    tokens?: number
    processingTime?: number
    intent?: string
    confidence?: number
    files?: Array<{
      name: string
      size: number
      type: string
    }>
    [key: string]: any
  }
}

export interface Assistant {
  id: string
  name: string
  description: string
  modelType: string
  icon: React.ReactNode
  capabilities: string[]
}

interface QuickCommand {
  id: string
  label: string
  command: string
  icon: React.ReactNode
  description: string
}

export interface ElizaChatInterfaceProps {
  initialMessages?: ChatMessage[]
  assistants?: Assistant[]
  quickCommands?: QuickCommand[]
  defaultAssistant?: string
}

export function ElizaChatInterface({
  initialMessages,
  assistants: providedAssistants,
  quickCommands: providedQuickCommands,
  defaultAssistant
}: ElizaChatInterfaceProps = {}) {
  // Default AI assistants (used if not provided via props)
  const defaultAssistants: Assistant[] = [
    {
      id: 'eliza-general',
      name: 'ElizaOS Assistant',
      description: 'General-purpose assistant for the Trading Farm platform',
      modelType: 'gemini-1.5-pro',
      icon: <Bot className="h-5 w-5" />,
      capabilities: ['Answer questions', 'Provide instructions', 'Process commands']
    },
    {
      id: 'strategy-advisor',
      name: 'Strategy Advisor',
      description: 'Specialized assistant for trading strategy development',
      modelType: 'gpt-4',
      icon: <Brain className="h-5 w-5" />,
      capabilities: ['Strategy analysis', 'Market insights', 'Risk assessment', 'Backtesting help']
    },
    {
      id: 'document-assistant',
      name: 'Document Assistant',
      description: 'Helps manage and analyze trading documents',
      modelType: 'claude-3-opus',
      icon: <FileText className="h-5 w-5" />,
      capabilities: ['Document summarization', 'Content extraction', 'Q&A on documents', 'Knowledge insights']
    }
  ]

  // Use provided assistants or fall back to defaults
  const assistants = providedAssistants || defaultAssistants

  // Default welcome message if no initialMessages provided
  const defaultMessages: ChatMessage[] = [
    {
      id: 'welcome',
      content: 'Welcome to the enhanced ElizaOS AI Assistant. How can I help with your trading farm operations today?',
      type: 'ai',
      timestamp: new Date(),
      metadata: {
        modelName: 'system',
        intent: 'greeting'
      }
    }
  ]

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || defaultMessages)
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Find the default assistant based on defaultAssistant prop or use the first assistant
  const findDefaultAssistant = (): Assistant => {
    if (defaultAssistant) {
      const found = assistants.find(a => a.id === defaultAssistant)
      if (found) return found
    }
    return assistants[0]
  }
  
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant>(findDefaultAssistant())
  const [showAssistantSelection, setShowAssistantSelection] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentTab, setCurrentTab] = useState('chat')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Connect to the KnowledgeChatContext
  const { registerChatInput } = useKnowledgeChat()
  
  // Register the input ref with the KnowledgeChat context
  useEffect(() => {
    if (inputRef.current) {
      registerChatInput(inputRef)
    }
  }, [registerChatInput])

  // Helper function to convert message type to role expected by AI service
  const messageTypeToRole = (type: MessageType): string => {
    switch (type) {
      case 'user':
        return 'user'
      case 'ai':
        return 'assistant'
      case 'system':
        return 'system'
      case 'error':
        return 'system'
      case 'metadata':
        return 'system'
      default:
        return 'user'
    }
  }

  // Enhanced quick commands with descriptions
  const defaultQuickCommands: QuickCommand[] = [
    {
      id: 'status',
      label: 'System Status',
      command: 'Show me the system status',
      icon: <Zap className="h-4 w-4" />,
      description: 'Check the current status of all trading systems'
    },
    {
      id: 'market',
      label: 'Market Analysis',
      command: 'Analyze current market conditions',
      icon: <BarChart2 className="h-4 w-4" />,
      description: 'Get an analysis of current market trends and conditions'
    },
    {
      id: 'optimize',
      label: 'Optimize Strategy',
      command: 'Optimize my current trading strategy',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Receive recommendations to improve your trading strategy'
    },
    {
      id: 'risk',
      label: 'Risk Assessment',
      command: 'Assess my current risk profile',
      icon: <ShieldAlert className="h-4 w-4" />,
      description: 'Evaluate your portfolio risk and get safety recommendations'
    },
    {
      id: 'help',
      label: 'Help',
      command: 'What can you do?',
      icon: <HelpCircle className="h-4 w-4" />,
      description: 'Learn about the capabilities of the AI assistant'
    }
  ]

  // Use provided quick commands or fall back to defaults
  const quickCommands = providedQuickCommands || defaultQuickCommands

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() === '' || isProcessing) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      type: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    try {
      // Send the message to our AI service
      const aiResponse = await sendChatMessage(
        inputValue,
        selectedAssistant.id,
        messages,
        {
          assistantId: selectedAssistant.id,
          sessionId: `session-${Date.now()}`,
          taskType: 'chat',
          intent: detectIntent(inputValue)
        }
      );

      // Add AI response to messages
      setMessages(prev => [...prev, {
        id: aiResponse.id || `ai-${Date.now()}`,
        content: aiResponse.content,
        type: 'ai',
        timestamp: new Date(),
        metadata: aiResponse.metadata
      }]);
    } catch (error) {
      // Handle error
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: `There was an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  // Simple intent detection (would be more sophisticated in production)
  const detectIntent = (message: string): string => {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('status') || lowerMessage.includes('system')) {
      return 'system_status'
    } else if (lowerMessage.includes('market') || lowerMessage.includes('analyze')) {
      return 'market_analysis'
    } else if (lowerMessage.includes('optimize') || lowerMessage.includes('strategy')) {
      return 'strategy_optimization'
    } else if (lowerMessage.includes('risk')) {
      return 'risk_assessment'
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return 'help'
    } else {
      return 'general_query'
    }
  }

  // Handle quick command click
  const handleQuickCommand = (command: string) => {
    setInputValue(command)
    
    // Submit the form programmatically
    const form = document.getElementById('eliza-chat-form') as HTMLFormElement
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
  }

  // Handle file upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Process file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    
    try {
      // Process files with AI service
      const fileList = Array.from(files)
      const uploadResponse = await processFileUpload(
        fileList,
        selectedAssistant.id,
        {
          sessionId: `session-${Date.now()}`,
          taskType: 'file_upload'
        }
      )
      
      // Add upload metadata message
      setMessages(prev => [...prev, {
        id: uploadResponse.id,
        content: uploadResponse.content,
        type: 'metadata',
        timestamp: new Date(),
        metadata: uploadResponse.metadata
      }])
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      // Handle error
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: `There was an error processing your file upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsUploading(false)
    }
  }

  // Render each message based on its type
  const renderMessage = (message: ChatMessage) => {
    switch (message.type) {
      case 'user':
        return (
          <div className="flex flex-col items-end mb-4">
            <div className="flex items-start gap-2">
              <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%]">
                <p>{message.content}</p>
              </div>
              <Avatar className="h-8 w-8 bg-primary-foreground">
                <div className="h-5 w-5 text-primary">U</div>
              </Avatar>
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )
        
      case 'ai':
        return (
          <div className="flex flex-col items-start mb-4">
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 bg-secondary">
                <div className="h-5 w-5">{selectedAssistant.icon}</div>
              </Avatar>
              <div className="bg-secondary text-secondary-foreground p-3 rounded-lg max-w-[80%] whitespace-pre-line">
                <p>{message.content}</p>
                
                {message.metadata && (
                  <div className="mt-2 pt-2 border-t border-secondary-foreground/20 flex flex-wrap gap-2">
                    {message.metadata.modelName && (
                      <Badge variant="outline" className="text-xs">
                        {message.metadata.modelName}
                      </Badge>
                    )}
                    {message.metadata.tokens && (
                      <Badge variant="outline" className="text-xs">
                        {message.metadata.tokens} tokens
                      </Badge>
                    )}
                    {message.metadata.processingTime && (
                      <Badge variant="outline" className="text-xs">
                        {(message.metadata.processingTime / 1000).toFixed(2)}s
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-md">
                  <ChevronDown className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )
        
      case 'system':
        return (
          <div className="flex justify-center mb-4">
            <div className="bg-muted text-muted-foreground p-2 rounded-lg text-sm max-w-[90%] text-center">
              {message.content}
            </div>
          </div>
        )
        
      case 'error':
        return (
          <div className="flex justify-center mb-4">
            <div className="bg-destructive/20 text-destructive p-2 rounded-lg text-sm max-w-[90%] text-center">
              {message.content}
            </div>
          </div>
        )
        
      case 'metadata':
        return (
          <div className="flex justify-center mb-4">
            <div className="bg-muted/50 text-muted-foreground p-2 rounded-lg text-xs max-w-[90%] text-center">
              {message.content}
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  // Toggle expanded chat view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Render the chat interface
  return (
    <div 
      ref={chatContainerRef}
      className={`rounded-lg border border-border bg-card transition-all duration-300 ${
        isExpanded 
          ? 'fixed inset-6 z-50' 
          : 'relative w-full h-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <Dialog open={showAssistantSelection} onOpenChange={setShowAssistantSelection}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted">
                  <Avatar className="h-6 w-6">
                    <div className="h-4 w-4">{selectedAssistant.icon}</div>
                  </Avatar>
                  <span className="font-medium">{selectedAssistant.name}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select an Assistant</DialogTitle>
                  <DialogDescription>
                    Choose the specialized assistant that best fits your current needs
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  {assistants.map((assistant) => (
                    <div 
                      key={assistant.id}
                      onClick={() => {
                        setSelectedAssistant(assistant)
                        setShowAssistantSelection(false)
                      }}
                      className={`p-3 flex items-start gap-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAssistant.id === assistant.id 
                          ? 'bg-muted border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Avatar className="h-10 w-10 mt-1">
                        <div className="h-6 w-6">{assistant.icon}</div>
                      </Avatar>
                      <div>
                        <div className="font-medium">{assistant.name}</div>
                        <div className="text-sm text-muted-foreground">{assistant.description}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assistant.capabilities.map((capability, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="chat" className="text-xs px-2 py-1">
                  <MessageSquare className="h-3 w-3 mr-1" /> Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <button 
              onClick={toggleExpanded}
              className="ml-2 h-8 w-8 flex items-center justify-center hover:bg-muted rounded-md"
            >
              {isExpanded 
                ? <Minimize2 className="h-5 w-5" /> 
                : <Maximize2 className="h-5 w-5" />
              }
            </button>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                {renderMessage(message)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Quick Commands */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex overflow-x-auto pb-2 gap-2">
            {quickCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => handleQuickCommand(cmd.command)}
                className="px-3 py-1 flex items-center gap-1 text-sm bg-muted hover:bg-muted/80 text-muted-foreground rounded-full whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                title={cmd.description}
              >
                {cmd.icon}
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <form id="eliza-chat-form" onSubmit={handleSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUploadClick}
              className="p-2 bg-muted hover:bg-muted/80 rounded-md flex-shrink-0"
              disabled={isProcessing || isUploading}
            >
              {isUploading 
                ? <RefreshCw className="h-5 w-5 animate-spin" /> 
                : <Upload className="h-5 w-5" />
              }
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileUpload}
            />
            
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or command..."
              className="flex-1 bg-muted rounded-md py-2 px-3 focus:outline-none"
              disabled={isProcessing}
            />
            
            <button
              type="submit"
              className="p-2 bg-primary text-primary-foreground rounded-md flex-shrink-0 disabled:opacity-50"
              disabled={inputValue.trim() === '' || isProcessing}
            >
              {isProcessing 
                ? <RefreshCw className="h-5 w-5 animate-spin" /> 
                : <Send className="h-5 w-5" />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
