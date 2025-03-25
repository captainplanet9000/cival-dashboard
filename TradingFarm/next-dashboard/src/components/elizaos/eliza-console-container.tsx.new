"use client"

import { useState } from 'react'
import { Terminal } from 'lucide-react'
import { Agent } from '@/components/agents/agent-details'
import ElizaCommandConsole from './eliza-command-console'
import { useEliza } from '@/context/eliza-context'

interface ElizaConsoleContainerProps {
  agents?: Agent[]
  onAgentChange?: (updatedAgents: Agent[]) => void
}

export default function ElizaConsoleContainer({ 
  agents = [], 
  onAgentChange 
}: ElizaConsoleContainerProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const { isConsoleOpen, isConsoleMinimized, openConsole, closeConsole, toggleConsoleMinimize, executeCommand } = useEliza()

  // Find the selected agent if needed for the console
  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null

  return (
    <>
      {isConsoleOpen && (
        <ElizaCommandConsole
          isMinimized={isConsoleMinimized}
          onMinimizeToggle={toggleConsoleMinimize}
          onClose={closeConsole}
          executeCommand={executeCommand}
          agents={agents}
          onAgentChange={onAgentChange}
        />
      )}
      
      {!isConsoleOpen && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            onClick={openConsole}
            className="p-2 bg-card border border-border rounded-full shadow-lg hover:bg-muted transition-colors"
            aria-label="Open ElizaOS Console"
          >
            <Terminal className="h-4 w-4 text-primary" />
          </button>
        </div>
      )}
    </>
  )
}
