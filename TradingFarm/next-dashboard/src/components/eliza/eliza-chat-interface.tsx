"use client"

import * as React from 'react' // Fixes lint: useEffect, useRef, useState
import type { AgentMessage } from '@/hooks/useElizaMessaging';
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
  PlusCircle,
  Users,
  Database
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ElizaAgentCreationDialog } from './ElizaAgentCreationDialog';
import ElizaAgentManager from './ElizaAgentManager';
import KnowledgeManager from './KnowledgeManager';

// AgentMessage comes from ElizaOS backend, which includes: id, content, message_type, timestamp, etc.
// We'll adapt AgentMessage to the local display type if needed.

interface QuickCommand {
  id: string
  label: string
  command: string
  icon: React.ReactNode
  description: string
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

import { useElizaMessaging } from '@/hooks/useElizaMessaging';
import { useElizaAgents } from '@/hooks/useElizaAgents';

export default function ElizaChatInterface({
  initialContext = {},
  showTitle = true,
  title = "ElizaOS AI",
  height = "400px",
  agentId: agentIdProp
}: ElizaChatInterfaceProps & { agentId?: string } = {}) {
  const { agents, loading: agentsLoading } = useElizaAgents(initialContext.farmId);
  const agentId = agentIdProp || (agents.length > 0 ? agents[0].id : undefined);
  const {
    messages: agentMessages,
    loading: messagesLoading,
    error: messagesError,
    sendCommand,
    refreshMessages
  } = useElizaMessaging({ agentId: agentId || '' });

  // Adapt AgentMessage[] to local display type (with .type and .timestamp as Date)
  const messages = React.useMemo(() =>
    agentMessages.map((msg) => {
      let type: 'user' | 'ai' | 'system';
      switch (msg.message_type) {
        case 'direct':
          type = 'user'; break;
        case 'broadcast':
          type = 'system'; break;
        case 'command':
        case 'status':
        case 'analysis':
        case 'alert':
        case 'query':
        default:
          type = 'ai'; break;
      }
      return {
        id: msg.id,
        content: msg.content,
        type,
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
      };
    }),
    [agentMessages]
  );

  const [inputValue, setInputValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

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
    e.preventDefault();
    if (inputValue.trim() === '' || isProcessing || !agentId) return;
    setIsProcessing(true);
    try {
      await sendCommand(inputValue);
      setInputValue('');
      setTimeout(() => refreshMessages(), 500);
    } finally {
      setIsProcessing(false);
    }
  }

  // Handle quick command click
  const handleQuickCommand = (command: string) => {
    setInputValue(command);
    // Programmatically submit the form
    setTimeout(() => {
      const form = document.getElementById('eliza-chat-form') as HTMLFormElement;
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 0);
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
      className={`dashboard-card ${isExpanded ? 'fixed inset-6 z-50 flex flex-col' : `h-[${height}] flex flex-col`}`}
      ref={chatContainerRef}
      className={`rounded-lg border border-border bg-card transition-all duration-300 ${
        isExpanded 
          ? 'fixed inset-6 z-50' 
          : 'relative w-full h-full'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {showTitle && (
            <h2 className="text-xl font-bold flex items-center">
              <Zap className="mr-2 h-5 w-5 text-accent" />
              {title}
            </h2>
          )}
          {/* Action buttons */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" title="Create Agent" className="ml-2"><PlusCircle className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create New Agent</DialogTitle></DialogHeader>
              <ElizaAgentCreationDialog farmId={initialContext.farmId} onSuccess={() => {}} buttonText="Create Agent" />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" title="Manage Agents"><Users className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Manage Agents</DialogTitle></DialogHeader>
              <ElizaAgentManager farmId={initialContext.farmId} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" title="View Memory"><Database className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Agent Memory</DialogTitle></DialogHeader>
              <KnowledgeManager agentId={agentId} farmId={initialContext.farmId} allowEdit={false} />
            </DialogContent>
          </Dialog>
        </div>
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
