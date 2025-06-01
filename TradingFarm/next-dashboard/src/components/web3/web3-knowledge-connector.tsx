"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useRef, RefObject, MutableRefObject } from 'react'
import { ElizaChatInterface } from '@/components/eliza/eliza-chat-interface'
import { Shield, Database, BarChart2, Send, MessageSquare } from 'lucide-react'
import { KnowledgeChatProvider } from '@/components/eliza/knowledge-chat-connector'

// Define types for Web3 knowledge management
type Web3KnowledgeState = {
  isConnected: boolean
  hasKnowledgeBase: boolean
  recentQueries: string[]
  supportedCommandTypes: string[]
  knowledgeDepth: 'basic' | 'intermediate' | 'advanced'
  lastUpdated: Date | null
}

type Web3KnowledgeContextType = {
  knowledge: Web3KnowledgeState
  connect: () => Promise<boolean>
  disconnect: () => void
  executeQuery: (query: string) => Promise<string>
  addToKnowledgeBase: (document: { title: string; content: string; tags: string[] }) => Promise<boolean>
}

// Create context with default values
const Web3KnowledgeContext = createContext<Web3KnowledgeContextType>({
  knowledge: {
    isConnected: false,
    hasKnowledgeBase: false,
    recentQueries: [],
    supportedCommandTypes: [],
    knowledgeDepth: 'basic',
    lastUpdated: null
  },
  connect: async () => false,
  disconnect: () => {},
  executeQuery: async () => '',
  addToKnowledgeBase: async () => false
})

// Provider component that wraps your app and makes knowledge context available
export function Web3KnowledgeProvider({ children }: { children: ReactNode }) {
  const [knowledge, setKnowledge] = useState<Web3KnowledgeState>({
    isConnected: false,
    hasKnowledgeBase: false,
    recentQueries: [],
    supportedCommandTypes: [],
    knowledgeDepth: 'basic',
    lastUpdated: null
  })

  // Connect to the knowledge management system
  const connect = async (): Promise<boolean> => {
    try {
      // In a real implementation, this would connect to ElizaOS knowledge management
      console.log('Connecting to ElizaOS Knowledge Management...')
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setKnowledge({
        isConnected: true,
        hasKnowledgeBase: true,
        recentQueries: [],
        supportedCommandTypes: [
          'balance-query',
          'transaction-history',
          'strategy-performance',
          'risk-analysis',
          'market-sentiment'
        ],
        knowledgeDepth: 'intermediate',
        lastUpdated: new Date()
      })
      
      return true
    } catch (error) {
      console.error('Failed to connect to knowledge management:', error)
      return false
    }
  }
  
  // Disconnect from knowledge management
  const disconnect = () => {
    setKnowledge(prev => ({
      ...prev,
      isConnected: false
    }))
  }
  
  // Execute a knowledge query
  const executeQuery = async (query: string): Promise<string> => {
    if (!knowledge.isConnected) {
      throw new Error('Not connected to knowledge management')
    }
    
    try {
      // In a real implementation, this would call the ElizaOS RAG system
      console.log(`Executing query: ${query}`)
      
      // Simulate query processing
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Add to recent queries
      setKnowledge(prev => ({
        ...prev,
        recentQueries: [query, ...prev.recentQueries].slice(0, 5),
        lastUpdated: new Date()
      }))
      
      // Return a simulated response
      return `Response to query: "${query}" from Trading Farm's knowledge base.`
    } catch (error) {
      console.error('Failed to execute query:', error)
      throw error
    }
  }
  
  // Add document to knowledge base
  const addToKnowledgeBase = async (document: { title: string; content: string; tags: string[] }): Promise<boolean> => {
    if (!knowledge.isConnected) {
      throw new Error('Not connected to knowledge management')
    }
    
    try {
      // In a real implementation, this would add to the ElizaOS vector db
      console.log(`Adding to knowledge base:`, document)
      
      // Simulate adding document
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      setKnowledge(prev => ({
        ...prev,
        lastUpdated: new Date()
      }))
      
      return true
    } catch (error) {
      console.error('Failed to add to knowledge base:', error)
      return false
    }
  }
  
  // Connect on component mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])
  
  return (
    <Web3KnowledgeContext.Provider
      value={{
        knowledge,
        connect,
        disconnect,
        executeQuery,
        addToKnowledgeBase
      }}
    >
      {children}
    </Web3KnowledgeContext.Provider>
  )
}

// Custom hook to use the web3 knowledge context
export function useWeb3Knowledge() {
  const context = useContext(Web3KnowledgeContext)
  
  if (context === undefined) {
    throw new Error('useWeb3Knowledge must be used within a Web3KnowledgeProvider')
  }
  
  return context
}

// ElizaChat component with Web3 knowledge integration
export function Web3ElizaChat() {
  const { knowledge, executeQuery } = useWeb3Knowledge()
  
  // Custom quick commands for web3 interactions
  const web3Commands = [
    {
      id: 'vault-status',
      label: 'Vault Status',
      command: 'What is the current status of my vault?',
      icon: <Shield className="h-3.5 w-3.5" />,
      description: 'Check vault security status'
    },
    {
      id: 'strategy-performance',
      label: 'Performance',
      command: 'Show me strategy performance metrics',
      icon: <BarChart2 className="h-3.5 w-3.5" />,
      description: 'View strategy performance data'
    },
    {
      id: 'knowledge-base',
      label: 'Knowledge',
      command: 'What trading concepts do you know about?',
      icon: <Database className="h-3.5 w-3.5" />,
      description: 'Explore the knowledge base'
    },
    {
      id: 'new-transaction',
      label: 'New Transfer',
      command: 'I want to create a new transfer',
      icon: <Send className="h-3.5 w-3.5" />,
      description: 'Initialize a new transfer'
    }
  ]
  
  // Function to process knowledge request when user sends a message
  const processKnowledgeRequest = async (message: string) => {
    if (!knowledge.isConnected) {
      return "Knowledge system is not currently connected. Please try again later."
    }
    
    try {
      return await executeQuery(message)
    } catch (error) {
      console.error('Error executing knowledge query:', error)
      return "I'm having trouble accessing that information right now. Please try again."
    }
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-10">
      <KnowledgeChatProvider>
        <ElizaChatInterface 
          initialMessages={[
            {
              id: 'welcome',
              content: `Welcome to the Trading Farm web3 interface. I'm connected to the knowledge base${!knowledge.isConnected ? ' (connecting...)' : ''} and can help with blockchain interactions, trading strategies, and vault operations.`,
              type: 'ai',
              timestamp: new Date()
            }
          ]}
          quickCommands={web3Commands}
        />
      </KnowledgeChatProvider>
    </div>
  )
}
