"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Bot, Cpu, Brain, TrendingUp, BarChart4, LineChart } from "lucide-react"

interface CharacterAgentProfile {
  id: string
  name: string
  avatarSrc?: string
  avatarFallback: string
  icon: React.ReactNode
  description: string
  expertise: string[]
  backstory: string
}

interface CharacterAgentSelectorProps {
  onSelectAgent: (agentId: string) => void
  selectedAgentId: string | null
  className?: string
}

export function CharacterAgentSelector({ 
  onSelectAgent, 
  selectedAgentId, 
  className = ""
}: CharacterAgentSelectorProps) {
  const [expanded, setExpanded] = React.useState(false)
  
  // Pre-defined character agents (matching our Python implementation)
  const characterAgents: CharacterAgentProfile[] = [
    {
      id: "max_alpha_001",
      name: "Max Alpha",
      avatarFallback: "MA",
      icon: <TrendingUp className="h-4 w-4" />,
      description: "Aggressive trading style with high risk tolerance. Focuses on momentum and breakout opportunities.",
      expertise: ["Momentum Trading", "Breakouts", "Options", "Crypto"],
      backstory: "Max began trading in the high-frequency prop trading world, thriving in volatile markets. After five years at a top quant firm, Max left to develop aggressive alpha-seeking strategies."
    },
    {
      id: "prudence_capital_001",
      name: "Prudence Capital",
      avatarFallback: "PC",
      icon: <BarChart4 className="h-4 w-4" />,
      description: "Conservative approach prioritizing capital preservation. Deep analytical approach with formal communication style.",
      expertise: ["Risk Management", "Portfolio Allocation", "Macroeconomics", "Value Investing"],
      backstory: "Prudence spent 20 years managing retirement funds with a focus on capital preservation. With a PhD in Economics and experience through multiple market cycles, Prudence developed a methodical approach to risk management."
    },
    {
      id: "techie_trend_001",
      name: "Techie Trend",
      avatarFallback: "TT",
      icon: <Cpu className="h-4 w-4" />,
      description: "Data-driven trading focused on technical analysis and algorithmic approaches.",
      expertise: ["Technical Analysis", "Algo Trading", "Pattern Recognition", "Sector Rotation"],
      backstory: "After developing algos for a Silicon Valley trading firm, Techie founded a quantitative research group focused on technical pattern recognition."
    },
    {
      id: "macro_vision_001",
      name: "Macro Vision",
      avatarFallback: "MV", 
      icon: <LineChart className="h-4 w-4" />,
      description: "Global macro perspective with focus on policy shifts, geopolitics, and capital flows.",
      expertise: ["Global Macro", "Central Bank Policy", "Geopolitics", "Commodities", "Forex"],
      backstory: "Macro Vision spent decades as a global economic advisor before moving into financial markets. With experience consulting for central banks and multinational corporations."
    },
    {
      id: "sentiment_sage_001",
      name: "Sentiment Sage",
      avatarFallback: "SS",
      icon: <Brain className="h-4 w-4" />,
      description: "Specializes in market psychology and sentiment analysis, often taking contrarian positions.",
      expertise: ["Sentiment Analysis", "Contrarian Investing", "Market Psychology", "Social Media Trends"],
      backstory: "With a background in behavioral finance and social psychology, Sage developed expertise in tracking market sentiment and investor psychology."
    }
  ]
  
  // Find the currently selected agent
  const selectedAgent = characterAgents.find(agent => agent.id === selectedAgentId) || characterAgents[0]
  
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="text-blue-400 h-5 w-5" />
            <h3 className="text-sm font-medium text-slate-200">ElizaOS Character Agent</h3>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      
      {expanded ? (
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 mb-4">
            {characterAgents.map(agent => (
              <div 
                key={agent.id}
                className={`
                  p-3 border rounded-md cursor-pointer transition-all
                  ${agent.id === selectedAgentId 
                    ? 'bg-blue-900/20 border-blue-800 text-blue-50' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }
                `}
                onClick={() => onSelectAgent(agent.id)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className={`h-10 w-10 ${agent.id === selectedAgentId ? 'border-2 border-blue-500' : ''}`}>
                    {agent.avatarSrc && <AvatarImage src={agent.avatarSrc} />}
                    <AvatarFallback className={agent.id === selectedAgentId ? 'bg-blue-700' : 'bg-slate-700'}>
                      {agent.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h4 className="font-medium">{agent.name}</h4>
                      <span className="ml-2">{agent.icon}</span>
                    </div>
                    <p className="text-xs truncate max-w-[250px]">{agent.description}</p>
                  </div>
                </div>
                
                {agent.id === selectedAgentId && (
                  <div className="mt-3 pt-3 border-t border-blue-800/30">
                    <div className="text-xs text-blue-200">
                      <strong>Expertise:</strong> {agent.expertise.join(", ")}
                    </div>
                    <div className="text-xs mt-2 text-blue-200 line-clamp-2">
                      <strong>Background:</strong> {agent.backstory}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3">
          <div className="flex items-center space-x-3">
            <Avatar>
              {selectedAgent.avatarSrc && <AvatarImage src={selectedAgent.avatarSrc} />}
              <AvatarFallback className="bg-blue-700">{selectedAgent.avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center">
                <h4 className="font-medium text-slate-200">{selectedAgent.name}</h4>
                <span className="ml-2 text-blue-400">{selectedAgent.icon}</span>
              </div>
              <Select 
                onValueChange={onSelectAgent} 
                defaultValue={selectedAgentId || characterAgents[0].id}
              >
                <SelectTrigger className="h-7 w-[180px] bg-slate-800 border-slate-700 text-xs">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {characterAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id} className="text-xs">
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
