"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { CommandResponse } from '@/hooks/use-eliza-agent-commands'

interface ElizaContextType {
  ready: boolean
  initializing: boolean
  lastCommand: string | null
  commandResponses: any[]
  executeCommand: (command: string) => Promise<void>
  clearResponses: () => void
  error: string | null
  isConsoleOpen: boolean
  isConsoleMinimized: boolean
  isQuickCommandsOpen: boolean
  openConsole: () => void
  closeConsole: () => void
  minimizeConsole: () => void
  maximizeConsole: () => void
  toggleConsoleMinimize: () => void
  toggleQuickCommands: () => void
  openQuickCommands: () => void
  closeQuickCommands: () => void
}

const defaultContext: ElizaContextType = {
  ready: false,
  initializing: false,
  lastCommand: null,
  commandResponses: [],
  executeCommand: async () => {},
  clearResponses: () => {},
  error: null,
  isConsoleOpen: false,
  isConsoleMinimized: false,
  isQuickCommandsOpen: false,
  openConsole: () => {},
  closeConsole: () => {},
  minimizeConsole: () => {},
  maximizeConsole: () => {},
  toggleConsoleMinimize: () => {},
  toggleQuickCommands: () => {},
  openQuickCommands: () => {},
  closeQuickCommands: () => {},
}

const ElizaContext = createContext<ElizaContextType>(defaultContext)

export const useEliza = () => useContext(ElizaContext)

interface ElizaProviderProps {
  children: ReactNode
}

export const ElizaProvider = ({ children }: ElizaProviderProps) => {
  const [ready, setReady] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  const [commandResponses, setCommandResponses] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false)
  const [isQuickCommandsOpen, setIsQuickCommandsOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initEliza = async () => {
      if (initializing || ready) return

      try {
        setInitializing(true)
        console.log("Initializing ElizaOS context...")

        await new Promise(resolve => setTimeout(resolve, 500))

        setReady(true)
        setError(null)
      } catch (err) {
        console.error("Error initializing ElizaOS:", err)
        setError(`Initialization error: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setInitializing(false)
      }
    }

    initEliza()

    const forceReadyTimeout = setTimeout(() => {
      if (!ready) {
        console.warn("Forcing ElizaOS ready state after timeout")
        setReady(true)
        setInitializing(false)
      }
    }, 3000)

    return () => clearTimeout(forceReadyTimeout)
  }, [initializing, ready])

  const addResponse = (response: any) => {
    setCommandResponses(prev => [...prev, response])
  }

  const executeCommand = async (command: string) => {
    if (!command.trim()) return

    setLastCommand(command)

    addResponse({
      id: Date.now().toString(),
      content: command,
      type: "user",
      timestamp: new Date(),
    })

    try {
      console.log(`Executing command: ${command}`)

      await new Promise(resolve => setTimeout(resolve, 800))

      let responseContent = `Processed command: ${command}`
      let responseType = "assistance"

      if (command.startsWith("/")) {
        responseContent = `System command processed: ${command}`
        responseType = "system"
      } else if (command.includes("?")) {
        responseContent = `Knowledge response for: ${command}`
        responseType = "knowledge"
      }

      addResponse({
        id: Date.now().toString(),
        content: responseContent,
        type: responseType,
        timestamp: new Date(),
      })
    } catch (err) {
      console.error(`Error executing command "${command}":`, err)

      addResponse({
        id: Date.now().toString(),
        content: `Error executing command: ${err instanceof Error ? err.message : String(err)}`,
        type: "error",
        timestamp: new Date(),
      })
    }
  }

  const clearResponses = () => {
    setCommandResponses([])
  }

  const openConsole = useCallback(() => {
    setIsConsoleOpen(true)
    setIsConsoleMinimized(false)
  }, [])

  const closeConsole = useCallback(() => {
    setIsConsoleOpen(false)
  }, [])

  const minimizeConsole = useCallback(() => {
    setIsConsoleMinimized(true)
  }, [])

  const maximizeConsole = useCallback(() => {
    setIsConsoleMinimized(false)
  }, [])

  const toggleConsoleMinimize = useCallback(() => {
    setIsConsoleMinimized(prev => !prev)
  }, [])

  const toggleQuickCommands = useCallback(() => {
    setIsQuickCommandsOpen(prev => !prev)
  }, [])

  const openQuickCommands = useCallback(() => {
    setIsQuickCommandsOpen(true)
  }, [])

  const closeQuickCommands = useCallback(() => {
    setIsQuickCommandsOpen(false)
  }, [])

  const contextValue: ElizaContextType = {
    ready,
    initializing,
    lastCommand,
    commandResponses,
    executeCommand,
    clearResponses,
    error,
    isConsoleOpen,
    isConsoleMinimized,
    isQuickCommandsOpen,
    openConsole,
    closeConsole,
    minimizeConsole,
    maximizeConsole,
    toggleConsoleMinimize,
    toggleQuickCommands,
    openQuickCommands,
    closeQuickCommands,
  }

  return (
    <ElizaContext.Provider value={contextValue}>
      {children}
    </ElizaContext.Provider>
  )
}
