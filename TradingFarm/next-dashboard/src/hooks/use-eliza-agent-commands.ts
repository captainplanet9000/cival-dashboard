import { useState, useCallback, useEffect } from 'react'
import { Agent, AgentSettings } from '@/components/agents/agent-details'
import { AgentInstruction } from '@/components/agents/agent-intelligence'

// Helper types for type safety
type AgentType = 'trend' | 'reversal' | 'arbitrage' | 'custom'
type AgentStatus = 'active' | 'paused' | 'offline'
type RiskLevel = 'low' | 'medium' | 'high'
type InstructionCategory = 'general' | 'risk' | 'market' | 'timing' | 'strategy'
type InstructionImpact = 'low' | 'medium' | 'high'

export interface CommandResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

export function useElizaAgentCommands(
  agents: Agent[] = [],
  onAgentChange?: (updatedAgents: Agent[]) => void
) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResponse, setLastResponse] = useState<CommandResponse | null>(null)

  // Helper function to find an agent by name (case insensitive)
  const findAgentByName = (name: string): Agent | undefined => {
    return agents.find(agent => 
      agent.name.toLowerCase() === name.toLowerCase() ||
      agent.name.toLowerCase().includes(name.toLowerCase())
    )
  }
  
  // Create a new agent based on command parameters
  const createAgent = (type: string, asset: string): Agent => {
    // Convert string to proper AgentType
    const agentType: AgentType = 
      type === 'trend' ? 'trend' : 
      type === 'arbitrage' ? 'arbitrage' : 
      type === 'reversal' ? 'reversal' : 'custom'
    
    // Default settings based on type
    const settings: AgentSettings = {
      riskLevel: agentType === 'trend' ? 'medium' : agentType === 'arbitrage' ? 'low' : 'high' as RiskLevel,
      maxDrawdown: agentType === 'trend' ? 15 : agentType === 'arbitrage' ? 5 : 20,
      positionSizing: agentType === 'trend' ? 10 : agentType === 'arbitrage' ? 25 : 15,
      tradesPerDay: agentType === 'trend' ? 5 : agentType === 'arbitrage' ? 15 : 2,
      automationLevel: 'full',
      timeframes: agentType === 'trend' 
        ? ['1h', '4h', 'Daily'] 
        : agentType === 'arbitrage' 
          ? ['1m', '5m', '15m'] 
          : ['4h', 'Daily', 'Weekly'],
      indicators: agentType === 'trend' 
        ? ['RSI', 'Moving Averages', 'Volume'] 
        : agentType === 'arbitrage' 
          ? ['Price Divergence', 'Liquidity', 'Fees'] 
          : ['Stochastic', 'MACD', 'Bollinger Bands']
    }
    
    // Generate a new agent
    return {
      id: `agent-${Date.now()}`,
      name: `${asset} ${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
      status: 'active' as AgentStatus,
      type: agentType,
      performance: Math.floor(Math.random() * 10) + 3,
      trades: Math.floor(Math.random() * 50) + 10,
      winRate: Math.floor(Math.random() * 20) + 50,
      createdAt: new Date().toISOString().split('T')[0],
      specialization: [asset],
      description: `A ${type} agent focused on ${asset} trading strategies.`,
      level: 'basic',
      detailedPerformance: {
        daily: Math.random() * 1.5,
        weekly: Math.random() * 5,
        monthly: Math.random() * 15,
        allTime: Math.random() * 20,
        trades: {
          won: 0,
          lost: 0,
          total: 0
        },
        profitFactor: Math.random() * 2 + 1,
        avgDuration: '2h 15m'
      },
      settings: settings,
      instructions: [
        {
          id: `instr-${Date.now()}`,
          content: `Focus on ${asset} market trends and volatility patterns`,
          createdAt: new Date().toISOString(),
          enabled: true,
          category: 'market' as InstructionCategory,
          impact: 'high' as InstructionImpact
        }
      ]
    }
  }
  
  // Process a command string and execute the appropriate action
  const executeCommand = async (command: string): Promise<CommandResponse> => {
    setIsProcessing(true)
    let response: CommandResponse = {
      success: false,
      message: "I couldn't understand that command. Try something like 'create a trend agent for Bitcoin' or 'show all agents'."
    }
    
    try {
      const lowerCommand = command.toLowerCase()
      
      // Command: Create a new agent
      if (lowerCommand.includes('create') && lowerCommand.includes('agent')) {
        // Extract type (trend, reversal, arbitrage)
        let type = 'trend' // default
        if (lowerCommand.includes('trend')) type = 'trend'
        else if (lowerCommand.includes('revers')) type = 'reversal'
        else if (lowerCommand.includes('arb')) type = 'arbitrage'
        
        // Extract asset (Bitcoin, Ethereum, etc.)
        let asset = 'Bitcoin' // default
        if (lowerCommand.includes('bitcoin') || lowerCommand.includes('btc')) asset = 'Bitcoin'
        else if (lowerCommand.includes('ethereum') || lowerCommand.includes('eth')) asset = 'Ethereum'
        else if (lowerCommand.includes('solana') || lowerCommand.includes('sol')) asset = 'Solana'
        else if (lowerCommand.includes('cardano') || lowerCommand.includes('ada')) asset = 'Cardano'
        
        // Create the new agent
        const newAgent = createAgent(type, asset)
        
        // Add to the list and trigger change callback
        const updatedAgents = [...agents, newAgent]
        if (onAgentChange) {
          onAgentChange(updatedAgents)
        }
        
        response = {
          success: true,
          message: `Created a new ${type} agent for ${asset} called "${newAgent.name}".`,
          data: newAgent
        }
      }
      
      // Command: Show all agents or specific status
      else if (lowerCommand.includes('show') && lowerCommand.includes('agent')) {
        let filteredAgents = [...agents]
        
        // Filter by status
        if (lowerCommand.includes('active')) {
          filteredAgents = filteredAgents.filter(agent => agent.status === 'active')
        } else if (lowerCommand.includes('paused')) {
          filteredAgents = filteredAgents.filter(agent => agent.status === 'paused')
        }
        
        if (filteredAgents.length === 0) {
          response = {
            success: true,
            message: "No agents found with the specified criteria.",
            data: []
          }
        } else {
          const agentList = filteredAgents.map(agent => 
            `- ${agent.name} (${agent.status}): ${agent.performance}% gain, ${agent.trades} trades`
          ).join('\n')
          
          response = {
            success: true,
            message: `Found ${filteredAgents.length} agent${filteredAgents.length > 1 ? 's' : ''}:\n${agentList}`,
            data: filteredAgents
          }
        }
      }
      
      // Command: Update agent status
      else if (lowerCommand.includes('update') && lowerCommand.includes('status')) {
        // Extract agent name
        const nameMatch = command.match(/update\s+(\w+)\s+status/i) || 
                          command.match(/(\w+)\s+status\s+to/i) ||
                          command.match(/status\s+of\s+(\w+)/i)
        
        if (!nameMatch) {
          response = {
            success: false,
            message: "Please specify which agent's status you want to update. For example: 'Update TrendMaster status to paused'."
          }
        } else {
          const agentName = nameMatch[1]
          const agent = findAgentByName(agentName)
          
          if (!agent) {
            response = {
              success: false,
              message: `I couldn't find an agent with the name "${agentName}". Please check the name and try again.`
            }
          } else {
            // Extract new status
            let newStatus: AgentStatus = 'active'
            if (lowerCommand.includes('pause')) newStatus = 'paused'
            else if (lowerCommand.includes('active')) newStatus = 'active'
            else if (lowerCommand.includes('offline')) newStatus = 'offline'
            
            // Update the agent
            const updatedAgent = { ...agent, status: newStatus }
            const updatedAgents = agents.map(a => a.id === agent.id ? updatedAgent : a)
            
            if (onAgentChange) {
              onAgentChange(updatedAgents)
            }
            
            response = {
              success: true,
              message: `Updated ${agent.name}'s status to ${newStatus}.`,
              data: updatedAgent
            }
          }
        }
      }
      
      // Command: Add instruction to agent
      else if (lowerCommand.includes('add') && lowerCommand.includes('instruction')) {
        // Extract agent name
        const nameMatch = command.match(/add\s+instruction\s+to\s+(\w+)/i) || 
                          command.match(/(\w+)\s+instruction/i)
        
        if (!nameMatch) {
          response = {
            success: false,
            message: "Please specify which agent you want to add an instruction to. For example: 'Add instruction to TrendMaster: Focus on volatility'."
          }
        } else {
          const agentName = nameMatch[1]
          const agent = findAgentByName(agentName)
          
          if (!agent) {
            response = {
              success: false,
              message: `I couldn't find an agent with the name "${agentName}". Please check the name and try again.`
            }
          } else {
            // Extract instruction content
            const contentMatch = command.match(/instruction[^:]*:\s*["']?([^"']+)["']?/i) ||
                                 command.match(/instruction[^:]*to\s+["']?([^"']+)["']?/i)
            
            if (!contentMatch) {
              response = {
                success: false,
                message: `Please specify the instruction content. For example: 'Add instruction to ${agent.name}: Focus on volatility'.`
              }
            } else {
              const content = contentMatch[1].trim()
              
              // Determine category based on content keywords
              let category: InstructionCategory = 'general'
              if (content.toLowerCase().includes('risk') || 
                  content.toLowerCase().includes('stop') || 
                  content.toLowerCase().includes('drawdown')) {
                category = 'risk'
              } else if (content.toLowerCase().includes('market') || 
                         content.toLowerCase().includes('trend') || 
                         content.toLowerCase().includes('volume')) {
                category = 'market'
              } else if (content.toLowerCase().includes('entry') || 
                         content.toLowerCase().includes('exit') || 
                         content.toLowerCase().includes('signal')) {
                category = 'timing'
              } else if (content.toLowerCase().includes('strategy') || 
                         content.toLowerCase().includes('indicator') || 
                         content.toLowerCase().includes('pattern')) {
                category = 'strategy'
              }
              
              // Determine impact based on content and modifiers
              let impact: InstructionImpact = 'medium'
              if (command.toLowerCase().includes('high impact') || 
                  command.toLowerCase().includes('important') || 
                  command.toLowerCase().includes('critical')) {
                impact = 'high'
              } else if (command.toLowerCase().includes('low impact') || 
                         command.toLowerCase().includes('minor') || 
                         command.toLowerCase().includes('suggestion')) {
                impact = 'low'
              }
              
              // Create new instruction with proper types
              const newInstruction: AgentInstruction = {
                id: `instr-${Date.now()}`,
                content: content,
                createdAt: new Date().toISOString(),
                enabled: true,
                category,
                impact
              }
              
              // Update agent with new instruction
              const instructions = agent.instructions ? [...agent.instructions, newInstruction] : [newInstruction]
              const updatedAgent = { ...agent, instructions }
              const updatedAgents = agents.map(a => a.id === agent.id ? updatedAgent : a)
              
              if (onAgentChange) {
                onAgentChange(updatedAgents)
              }
              
              response = {
                success: true,
                message: `Added ${impact} impact ${category} instruction to ${agent.name}: "${content}"`,
                data: updatedAgent
              }
            }
          }
        }
      }
      
      // Command: Change agent risk level
      else if (lowerCommand.includes('change') && lowerCommand.includes('risk')) {
        // Extract agent name
        const nameMatch = command.match(/change\s+(\w+)\s+risk/i) || 
                          command.match(/(\w+)['s]?\s+risk/i)
        
        if (!nameMatch) {
          response = {
            success: false,
            message: "Please specify which agent's risk level you want to change. For example: 'Change TrendMaster risk to low'."
          }
        } else {
          const agentName = nameMatch[1]
          const agent = findAgentByName(agentName)
          
          if (!agent) {
            response = {
              success: false,
              message: `I couldn't find an agent with the name "${agentName}". Please check the name and try again.`
            }
          } else {
            // Extract new risk level
            let riskLevel: RiskLevel = 'medium' // default
            if (lowerCommand.includes('low')) riskLevel = 'low'
            else if (lowerCommand.includes('medium')) riskLevel = 'medium'
            else if (lowerCommand.includes('high')) riskLevel = 'high'
            
            // Adjust other settings based on risk level
            const maxDrawdown = riskLevel === 'low' ? 5 : riskLevel === 'medium' ? 15 : 25
            const positionSizing = riskLevel === 'low' ? 5 : riskLevel === 'medium' ? 10 : 20
            
            // Update the agent
            const settings: AgentSettings = agent.settings ? {
              ...agent.settings,
              riskLevel,
              maxDrawdown,
              positionSizing
            } : {
              riskLevel,
              maxDrawdown,
              positionSizing,
              tradesPerDay: 5,
              automationLevel: 'full',
              timeframes: ['1h', '4h', 'Daily'],
              indicators: ['RSI', 'Moving Averages', 'Volume']
            }
            
            const updatedAgent = { ...agent, settings }
            const updatedAgents = agents.map(a => a.id === agent.id ? updatedAgent : a)
            
            if (onAgentChange) {
              onAgentChange(updatedAgents)
            }
            
            response = {
              success: true,
              message: `Updated ${agent.name}'s risk level to ${riskLevel}. Max drawdown set to ${maxDrawdown}% and position sizing to ${positionSizing}%.`,
              data: updatedAgent
            }
          }
        }
      }
      
      // Command: Show agent performance
      else if (lowerCommand.includes('performance')) {
        // Check if specific agent is mentioned
        let agentName = ""
        for (const agent of agents) {
          if (lowerCommand.includes(agent.name.toLowerCase())) {
            agentName = agent.name
            break
          }
        }
        
        if (agentName) {
          // Show specific agent performance
          const agent = findAgentByName(agentName)
          if (agent) {
            const performance = agent.detailedPerformance
            if (performance) {
              response = {
                success: true,
                message: `${agent.name} Performance:
- Daily: ${performance.daily.toFixed(2)}%
- Weekly: ${performance.weekly.toFixed(2)}%
- Monthly: ${performance.monthly.toFixed(2)}%
- All time: ${performance.allTime.toFixed(2)}%
- Win rate: ${agent.winRate}%
- Profit factor: ${performance.profitFactor.toFixed(2)}
- Trades: ${performance.trades.won} won, ${performance.trades.lost} lost (${performance.trades.total} total)
- Avg trade duration: ${performance.avgDuration}`,
                data: agent
              }
            } else {
              response = {
                success: true,
                message: `${agent.name} Performance:
- Overall: ${agent.performance.toFixed(2)}%
- Win rate: ${agent.winRate}%
- Trades: ${agent.trades} total`,
                data: agent
              }
            }
          }
        } else {
          // Show overall performance for all agents
          const totalPerformance = agents.reduce((sum, agent) => sum + agent.performance, 0)
          const avgPerformance = agents.length > 0 ? totalPerformance / agents.length : 0
          const totalTrades = agents.reduce((sum, agent) => sum + agent.trades, 0)
          
          const topPerformer = [...agents].sort((a, b) => b.performance - a.performance)[0]
          
          response = {
            success: true,
            message: `Overall Agent Performance:
- Total agents: ${agents.length}
- Average performance: ${avgPerformance.toFixed(2)}%
- Total trades: ${totalTrades}
${topPerformer ? `- Top performer: ${topPerformer.name} (${topPerformer.performance.toFixed(2)}%)` : ''}
            
Use "show agent performance" for a specific agent to see more details.`,
            data: { agents, avgPerformance, totalTrades, topPerformer }
          }
        }
      }
      
      // Command: List agent instructions
      else if ((lowerCommand.includes('list') || lowerCommand.includes('show')) && 
               lowerCommand.includes('instruction')) {
        // Extract agent name
        let agentName = ""
        for (const agent of agents) {
          if (lowerCommand.includes(agent.name.toLowerCase())) {
            agentName = agent.name
            break
          }
        }
        
        if (!agentName) {
          response = {
            success: false,
            message: "Please specify which agent's instructions you want to list. For example: 'List TrendMaster instructions'."
          }
        } else {
          const agent = findAgentByName(agentName)
          
          if (!agent) {
            response = {
              success: false,
              message: `I couldn't find an agent with the name "${agentName}". Please check the name and try again.`
            }
          } else if (!agent.instructions || agent.instructions.length === 0) {
            response = {
              success: true,
              message: `${agent.name} doesn't have any instructions yet. You can add one with "Add instruction to ${agent.name}: [your instruction]".`,
              data: []
            }
          } else {
            const instructionsList = agent.instructions.map((instr, index) => 
              `${index + 1}. [${instr.enabled ? 'ENABLED' : 'DISABLED'}] [${instr.category}/${instr.impact}] "${instr.content}"`
            ).join('\n')
            
            response = {
              success: true,
              message: `${agent.name}'s Instructions:\n${instructionsList}`,
              data: agent.instructions
            }
          }
        }
      }
      
      // Command: Enable/disable instruction
      else if ((lowerCommand.includes('enable') || lowerCommand.includes('disable')) && 
               lowerCommand.includes('instruction')) {
        // Determine action
        const toEnable = lowerCommand.includes('enable')
        
        // Extract agent name
        let agentName = ""
        for (const agent of agents) {
          if (lowerCommand.includes(agent.name.toLowerCase())) {
            agentName = agent.name
            break
          }
        }
        
        if (!agentName) {
          response = {
            success: false,
            message: `Please specify which agent's instruction you want to ${toEnable ? 'enable' : 'disable'}. For example: '${toEnable ? 'Enable' : 'Disable'} instruction 2 for TrendMaster'.`
          }
        } else {
          const agent = findAgentByName(agentName)
          
          if (!agent) {
            response = {
              success: false,
              message: `I couldn't find an agent with the name "${agentName}". Please check the name and try again.`
            }
          } else if (!agent.instructions || agent.instructions.length === 0) {
            response = {
              success: false,
              message: `${agent.name} doesn't have any instructions to ${toEnable ? 'enable' : 'disable'}.`,
              data: []
            }
          } else {
            // Try to extract instruction number
            const numMatch = command.match(/instruction\s+(\d+)/i)
            
            if (numMatch) {
              const instructionNum = parseInt(numMatch[1])
              
              if (instructionNum <= 0 || instructionNum > agent.instructions.length) {
                response = {
                  success: false,
                  message: `Invalid instruction number. ${agent.name} has ${agent.instructions.length} instructions (numbered 1-${agent.instructions.length}).`
                }
              } else {
                // Update the instruction
                const updatedInstructions = [...agent.instructions]
                updatedInstructions[instructionNum - 1] = {
                  ...updatedInstructions[instructionNum - 1],
                  enabled: toEnable
                }
                
                const updatedAgent = { ...agent, instructions: updatedInstructions }
                const updatedAgents = agents.map(a => a.id === agent.id ? updatedAgent : a)
                
                if (onAgentChange) {
                  onAgentChange(updatedAgents)
                }
                
                const instruction = updatedInstructions[instructionNum - 1]
                
                response = {
                  success: true,
                  message: `${toEnable ? 'Enabled' : 'Disabled'} instruction ${instructionNum} for ${agent.name}: "${instruction.content}"`,
                  data: updatedAgent
                }
              }
            } else {
              // Try to match by content
              const contentWords = command.split(' ').filter(word => 
                word.length > 4 && 
                !['instruction', 'enable', 'disable', 'for', 'the', 'that', 'contains', 'about', agent.name].includes(word.toLowerCase())
              )
              
              let matchedIndex = -1
              
              if (contentWords.length > 0) {
                for (let i = 0; i < agent.instructions.length; i++) {
                  const instruction = agent.instructions[i]
                  const matchesContent = contentWords.some(word => 
                    instruction.content.toLowerCase().includes(word.toLowerCase())
                  )
                  
                  if (matchesContent) {
                    matchedIndex = i
                    break
                  }
                }
              }
              
              if (matchedIndex === -1) {
                response = {
                  success: false,
                  message: `I couldn't determine which instruction you want to ${toEnable ? 'enable' : 'disable'}. Please specify the instruction number or use more specific content keywords.`
                }
              } else {
                // Update the instruction
                const updatedInstructions = [...agent.instructions]
                updatedInstructions[matchedIndex] = {
                  ...updatedInstructions[matchedIndex],
                  enabled: toEnable
                }
                
                const updatedAgent = { ...agent, instructions: updatedInstructions }
                const updatedAgents = agents.map(a => a.id === agent.id ? updatedAgent : a)
                
                if (onAgentChange) {
                  onAgentChange(updatedAgents)
                }
                
                const instruction = updatedInstructions[matchedIndex]
                
                response = {
                  success: true,
                  message: `${toEnable ? 'Enabled' : 'Disabled'} instruction for ${agent.name}: "${instruction.content}"`,
                  data: updatedAgent
                }
              }
            }
          }
        }
      }
      
      // Fallback for unrecognized commands
      else {
        response = {
          success: false,
          message: "I'm not sure how to process that request. Here are some commands you can try:\n- Create a trend agent for Bitcoin\n- Show all active agents\n- Update TrendMaster status to paused\n- Add instruction to SwingTrader: 'Only trade during high volume'\n- Enable/disable instruction 2 for TrendMaster\n- List TrendMaster instructions\n- Change StableCoin Arbitrageur risk to low\n- Show agent performance"
        }
      }
    } catch (error) {
      console.error("Error processing command:", error)
      response = {
        success: false,
        message: "An error occurred while processing your command. Please try again."
      }
    } finally {
      setIsProcessing(false)
      setLastResponse(response)
    }
    
    return response
  }

  return {
    executeCommand,
    isProcessing,
    lastResponse
  }
}
