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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div 
      className={`dashboard-card ${isExpanded ? 'fixed inset-6 z-50 flex flex-col' : `h-[${height}] flex flex-col`}`}
      ref={chatContainerRef}
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
