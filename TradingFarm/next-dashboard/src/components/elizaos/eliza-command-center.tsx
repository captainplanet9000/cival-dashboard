"use client"

import { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Zap, 
  BarChart2, 
  TrendingUp, 
  Bot,
  Users,
  Brain,
  ArrowRightLeft,
  FileText
} from 'lucide-react'
import { ElizaChatInterface } from '@/components/eliza/eliza-chat-interface'

// Quick commands for ElizaOS
const quickCommands = [
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
    description: 'Suggest improvements for your current trading strategy'
  },
  {
    id: 'agents',
    label: 'Agent Status',
    command: 'Show me the status of all agents',
    icon: <Users className="h-4 w-4" />,
    description: 'View the current status and performance of all trading agents'
  }
]

// AI assistants available in ElizaOS
const assistants = [
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
    id: 'trading-assistant',
    name: 'Trading Assistant',
    description: 'Helps manage and execute trades',
    modelType: 'claude-3-sonnet',
    icon: <ArrowRightLeft className="h-5 w-5" />,
    capabilities: ['Trade execution', 'Market analysis', 'Position management', 'Risk assessment']
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

// Initial welcome messages
const initialMessages = [
  {
    id: 'welcome-1',
    content: 'Welcome to ElizaOS - your advanced trading assistant. How can I help with your trading farm operations today?',
    type: 'ai' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    metadata: {
      modelName: 'system',
      intent: 'greeting'
    }
  },
  {
    id: 'welcome-2',
    content: 'You can ask about market conditions, request trading assistance, manage your agents, or analyze performance data.',
    type: 'ai' as const,
    timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 minutes ago
    metadata: {
      modelName: 'system',
      intent: 'help'
    }
  }
]

export function ElizaCommandCenter() {
  return (
    <div className="h-[calc(100vh-14rem)]">
      <ElizaChatInterface 
        initialMessages={initialMessages}
        assistants={assistants}
        quickCommands={quickCommands}
        defaultAssistant="eliza-general"
      />
    </div>
  )
}
