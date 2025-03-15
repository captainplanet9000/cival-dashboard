"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SendHorizontal, AlertCircle, Bot, Terminal, User } from "lucide-react"
import { CharacterAgentSelector } from "@/components/character-agent-selector"

interface ElizaOSCommandConsoleProps {
  enabled: boolean
}

export function ElizaOSCommandConsole({ enabled }: ElizaOSCommandConsoleProps) {
  const [command, setCommand] = React.useState("")
  const [commandHistory, setCommandHistory] = React.useState<string[]>([])
  const [responses, setResponses] = React.useState<Array<{type: string, message: string, timestamp: Date, agentId?: string}>>([
    {
      type: "system",
      message: "ElizaOS v2.1.3 initialized. Type 'help' for available commands.",
      timestamp: new Date()
    }
  ])
  
  // Add character agent state
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>("techie_trend_001")
  const [characterMode, setCharacterMode] = React.useState<boolean>(false)
  
  const endOfMessagesRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [responses])
  
  // Sample command handlers - this would be connected to the actual ElizaOS integration
  const handleCommand = (cmd: string) => {
    const commandLower = cmd.toLowerCase().trim()
    
    // Record the command in history
    setCommandHistory((prev: string[]) => [...prev, cmd])
    
    // Clear the input
    setCommand("")
    
    // Add command to responses
    setResponses((prev: Array<{type: string, message: string, timestamp: Date, agentId?: string}>) => [...prev, {
      type: "user",
      message: cmd,
      timestamp: new Date()
    }])
    
    // Process commands
    if (!enabled) {
      setTimeout(() => {
        setResponses((prev: Array<{type: string, message: string, timestamp: Date, agentId?: string}>) => [...prev, {
          type: "error",
          message: "ElizaOS integration is currently disabled. Please enable it in System Controls.",
          timestamp: new Date()
        }])
      }, 500)
      return
    }
    
    setTimeout(() => {
      let response
      
      // Special handling for character mode toggle
      if (commandLower === "character mode on" || commandLower === "enable character mode") {
        setCharacterMode(true)
        response = {
          type: "system",
          message: `Character Agent Mode enabled. You are now talking to ${getAgentNameById(selectedAgentId)}.`,
          timestamp: new Date()
        }
      } else if (commandLower === "character mode off" || commandLower === "disable character mode") {
        setCharacterMode(false)
        response = {
          type: "system",
          message: "Character Agent Mode disabled. You are now using standard ElizaOS commands.",
          timestamp: new Date()
        }
      } else if (commandLower.startsWith("switch agent") || commandLower.startsWith("use agent")) {
        const agentName = cmd.split(" ").slice(2).join(" ").trim()
        const agentId = getAgentIdByName(agentName)
        
        if (agentId) {
          setSelectedAgentId(agentId)
          setCharacterMode(true)
          response = {
            type: "system",
            message: `Agent switched to ${getAgentNameById(agentId)}. Character Mode enabled.`,
            timestamp: new Date()
          }
        } else {
          response = {
            type: "error",
            message: `Agent "${agentName}" not found. Available agents: Max Alpha, Prudence Capital, Techie Trend, Macro Vision, Sentiment Sage.`,
            timestamp: new Date()
          }
        }
      } else if (characterMode) {
        // In character mode, send to character agent
        response = {
          type: "response",
          message: generateCharacterResponse(selectedAgentId, cmd),
          timestamp: new Date(),
          agentId: selectedAgentId
        }
      } else if (commandLower === "help") {
        response = {
          type: "system",
          message: `Available commands:
- status: Check system status
- analyze [market]: Analyze a specific market
- optimize [strategy]: Optimize a trading strategy
- forecast [market] [timeframe]: Generate market forecast
- risk [adjust] [parameter] [value]: Adjust risk parameters
- agents: List all available trading agents
- performance: Show system performance metrics
- character mode on/off: Enable/disable character agent mode
- switch agent [name]: Switch to a specific character agent`,
          timestamp: new Date()
        }
      } else if (commandLower === "status") {
        response = {
          type: "response",
          message: `System Status:
Trading Status: Active
Connected Exchanges: 2
Active Strategies: 8
Recent Win Rate: 62.5%
CPU Utilization: 23%
Memory Usage: 1.2GB
Last Error: None (All systems operational)`,
          timestamp: new Date()
        }
      } else if (commandLower.startsWith("analyze")) {
        const market = commandLower.split(" ")[1] || "btc"
        response = {
          type: "response",
          message: `Analysis for ${market.toUpperCase()}:
Trend: Bullish (4H timeframe)
Support levels: $27,850, $26,920
Resistance levels: $28,350, $29,100
Volume: Increasing (+12% from average)
Volatility: Medium (23.5%)
Recommendation: Consider long positions with tight stops`,
          timestamp: new Date()
        }
      } else if (commandLower.startsWith("optimize")) {
        const strategy = commandLower.split(" ")[1] || "momentum"
        response = {
          type: "response",
          message: `Optimizing ${strategy} strategy:
Parameter tuning in progress...
Testing 243 parameter combinations
Optimizing for Sharpe ratio
Best combination found:
- lookback_period: 14
- signal_threshold: 0.75
- position_sizing: dynamic
- take_profit: 3.2%
Performance improvement: +18.5%`,
          timestamp: new Date()
        }
      } else if (commandLower.startsWith("forecast")) {
        const parts = commandLower.split(" ")
        const market = parts[1] || "eth"
        const timeframe = parts[2] || "1d"
        response = {
          type: "response",
          message: `${timeframe.toUpperCase()} Forecast for ${market.toUpperCase()}:
AI Confidence: High (82%)
Expected Range: $1,850 - $1,950
Probable Direction: Upward consolidation
Key Events: FOMC meeting (Wed), Options expiry (Fri)
Trading Volume Forecast: Above average
Volatility Forecast: Increasing toward Friday`,
          timestamp: new Date()
        }
      } else if (commandLower.startsWith("risk")) {
        const parts = commandLower.split(" ")
        if (parts.length < 4) {
          response = {
            type: "error",
            message: "Invalid syntax. Use: risk adjust [parameter] [value]",
            timestamp: new Date()
          }
        } else {
          response = {
            type: "response",
            message: `Risk parameter adjusted:
Parameter: ${parts[2]}
New value: ${parts[3]}
Applied to: All active strategies
Previous value: ${Number(parts[3]) - 1.5}
Change takes effect immediately`,
            timestamp: new Date()
          }
        }
      } else if (commandLower === "agents") {
        response = {
          type: "response",
          message: `Available Trading Agents:
1. Momentum_BTC_Agent (active)
2. Volatility_ETH_Agent (active)
3. Breakout_TOTAL_Agent (active)
4. Support_Resistance_BTC_Agent (active)
5. Sentiment_BTC_Agent (idle)
6. Correlation_ETH_BTC_Agent (active)
7. Ichimoku_BTC_Agent (idle)
8. MACD_ETH_Agent (active)

Character Agents:
- Max Alpha (Aggressive trading style)
- Prudence Capital (Conservative approach)
- Techie Trend (Technical analysis focus)
- Macro Vision (Global economic perspective)
- Sentiment Sage (Market psychology specialist)

Use "switch agent [name]" to interact with a character agent.`,
          timestamp: new Date()
        }
      } else if (commandLower === "performance") {
        response = {
          type: "response",
          message: `Performance Metrics:
- Win Rate: 62.3%
- Average Win: 3.2%
- Average Loss: 1.8%
- Profit Factor: 2.14
- Sharpe Ratio: 1.65
- Sortino Ratio: 2.41
- Max Drawdown: 8.3%
- Recovery Factor: 3.2
- Total Profit (30d): +18.7%`,
          timestamp: new Date()
        }
      } else {
        response = {
          type: "error",
          message: `Command not recognized: "${cmd}". Type 'help' for available commands.`,
          timestamp: new Date()
        }
      }
      
      setResponses((prev: Array<{type: string, message: string, timestamp: Date, agentId?: string}>) => [...prev, response])
    }, 800)
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim()) {
      handleCommand(command.trim())
    }
  }
  
  const getAgentNameById = (agentId: string): string => {
    const agentMap: {[key: string]: string} = {
      "max_alpha_001": "Max Alpha",
      "prudence_capital_001": "Prudence Capital",
      "techie_trend_001": "Techie Trend",
      "macro_vision_001": "Macro Vision",
      "sentiment_sage_001": "Sentiment Sage"
    }
    return agentMap[agentId] || "Unknown Agent"
  }
  
  const getAgentIdByName = (name: string): string | null => {
    const nameLower = name.toLowerCase()
    const agentMap: {[key: string]: string} = {
      "max alpha": "max_alpha_001",
      "prudence capital": "prudence_capital_001",
      "techie trend": "techie_trend_001",
      "macro vision": "macro_vision_001",
      "sentiment sage": "sentiment_sage_001"
    }
    
    // Try exact match first
    if (agentMap[nameLower]) {
      return agentMap[nameLower]
    }
    
    // Try partial match
    for (const [key, value] of Object.entries(agentMap)) {
      if (key.includes(nameLower) || nameLower.includes(key)) {
        return value
      }
    }
    
    return null
  }
  
  // Generate character-based responses
  const generateCharacterResponse = (agentId: string, message: string): string => {
    const messageLower = message.toLowerCase()
    
    // Simulated character responses based on agent personality
    switch(agentId) {
      case "max_alpha_001":
        if (messageLower.includes("market") || messageLower.includes("outlook")) {
          return "The markets are primed for aggressive positioning right now! BTC is showing a classic breakout pattern with increasing volume. I'm particularly bullish on momentum plays in the crypto space.\n\nWhen others see risk, I see opportunity.";
        } else if (messageLower.includes("risk")) {
          return "Risk? Fortune favors the bold, my friend! But being smart about it, I'm scaling into positions with clear invalidation levels. Current market volatility is creating perfect momentum entries with 3:1 reward-to-risk setups.";
        } else {
          return "I'm seeing multiple high-conviction setups right now. The key is jumping on momentum early and riding the wave! Let me know if you want specific trade ideas or setups to analyze.\n\nLet's ride this momentum to the moon! 🚀";
        }
        
      case "prudence_capital_001":
        if (messageLower.includes("market") || messageLower.includes("outlook")) {
          return "Current market conditions warrant caution. While we're seeing positive price action, underlying fundamentals remain mixed. I'm particularly concerned about diminishing volume on recent advances.\n\nMarkets reward discipline, not excitement.";
        } else if (messageLower.includes("risk")) {
          return "In this environment, risk management should be your primary focus. I recommend position sizes no larger than 2% of capital per trade, with clearly defined stop losses. The current volatility regime suggests tighter risk controls than usual.";
        } else {
          return "I'm closely monitoring key support levels and defensive sectors. While others chase momentum, preservation of capital remains paramount. Consider maintaining adequate cash reserves for upcoming opportunities.\n\nA small profit is preferable to a large loss.";
        }
        
      case "techie_trend_001":
        if (messageLower.includes("market") || messageLower.includes("outlook")) {
          return "My analysis shows a confluence of technical factors: The 50-day EMA has crossed above the 200-day with expanding volume profiles. RSI momentum is positive at 63.4 without reaching overbought conditions. Current market structure suggests 78.2% probability of continued upside.\n\nLet the math guide your decisions, not emotions.";
        } else if (messageLower.includes("risk")) {
          return "Quantitatively, market risk metrics show VIX term structure in a normal contango, with realized volatility at 18.3% vs. implied at 22.1%. This volatility risk premium suggests options are slightly overpriced. My algorithms indicate optimal position sizing at 1.5 standard deviations from mean exposure.";
        } else {
          return "Based on algorithmic pattern recognition, we're seeing a constructive market setup with positive sector rotation. My statistical models show improving breadth metrics and decreasing correlation across asset classes.\n\nStatistical edge beats intuition every time.";
        }
        
      case "macro_vision_001":
        if (messageLower.includes("market") || messageLower.includes("outlook")) {
          return "The broader macro landscape is being shaped by central bank policy divergence. While the Fed maintains a restrictive stance, emerging market central banks have begun easing cycles. This is creating notable capital flow shifts that typically precede major market rotations.\n\nMarkets are conversations between policy and reality.";
        } else if (messageLower.includes("risk")) {
          return "From a global perspective, risk is concentrating in sovereign debt markets and currency volatility. The dollar strength has put pressure on emerging economies with dollar-denominated debt. Monitor credit spreads carefully as they often lead equity market turns.";
        } else {
          return "I'm closely watching the interplay between fiscal policy, monetary conditions, and commodity markets. The recent shift in global manufacturing PMIs suggests we're entering a new phase of the economic cycle, with implications for sector leadership.\n\nCentral banks write the first draft of market narratives.";
        }
        
      case "sentiment_sage_001":
        if (messageLower.includes("market") || messageLower.includes("outlook")) {
          return "Market psychology is reaching interesting extremes. Retail sentiment indicators show excessive optimism, while institutional positioning remains cautious. This divergence typically resolves with higher volatility. The narrative is shifting from inflation fears to growth optimism.\n\nWhen everyone is thinking the same thing, no one is really thinking.";
        } else if (messageLower.includes("risk")) {
          return "The greatest risk right now is narrative exhaustion. The current market story has been embraced too widely without sufficient skepticism. Option positioning shows overwhelming preference for calls over puts – a contrarian signal that has historically preceded market pullbacks.";
        } else {
          return "I'm detecting growing complacency in market sentiment metrics. Social media chatter shows increasing references to 'easy money' and 'can't lose' opportunities – classic signs of late-stage bull markets. However, we're not yet at euphoric extremes.\n\nThe crowd is right in the trend, wrong at both ends.";
        }
        
      default:
        return "I'm analyzing the current market conditions and will provide insights based on my expertise. What specific aspects of the market would you like me to focus on?";
    }
  }
  
  // Get agent avatar
  const getAgentAvatar = (agentId: string | undefined): React.ReactNode => {
    if (!agentId) return <Bot className="h-4 w-4 mr-1 text-blue-400" />;
    
    // Return different icons for different agents
    switch(agentId) {
      case "max_alpha_001":
        return <span className="flex items-center"><Bot className="h-4 w-4 mr-1 text-green-400" /> Max</span>;
      case "prudence_capital_001":
        return <span className="flex items-center"><Bot className="h-4 w-4 mr-1 text-purple-400" /> Prudence</span>;
      case "techie_trend_001":
        return <span className="flex items-center"><Bot className="h-4 w-4 mr-1 text-cyan-400" /> Techie</span>;
      case "macro_vision_001":
        return <span className="flex items-center"><Bot className="h-4 w-4 mr-1 text-yellow-400" /> Macro</span>;
      case "sentiment_sage_001":
        return <span className="flex items-center"><Bot className="h-4 w-4 mr-1 text-pink-400" /> Sage</span>;
      default:
        return <Bot className="h-4 w-4 mr-1 text-blue-400" />;
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Character Agent Selector */}
      {enabled && (
        <div className="mb-3">
          <CharacterAgentSelector
            onSelectAgent={setSelectedAgentId}
            selectedAgentId={selectedAgentId}
          />
        </div>
      )}
      
      <div className="flex flex-col h-96 bg-slate-900 border border-slate-800 rounded-lg">
        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {responses.map((response: {type: string, message: string, timestamp: Date, agentId?: string}, index: number) => (
              <div key={index} className={`flex ${response.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg ${
                  response.type === 'user' 
                    ? 'bg-blue-600 text-white ml-auto'
                    : response.type === 'error'
                      ? 'bg-red-950 text-red-200 border border-red-800'
                      : response.type === 'system'
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}>
                  {response.type !== 'user' && (
                    <div className="flex items-center mb-1">
                      {response.type === 'error' ? (
                        <AlertCircle className="h-4 w-4 mr-1 text-red-400" />
                      ) : response.type === 'system' ? (
                        <Terminal className="h-4 w-4 mr-1 text-slate-400" />
                      ) : (
                        getAgentAvatar(response.agentId)
                      )}
                      <span className="text-xs font-medium">
                        {response.type === 'error' ? 'Error' : response.type === 'system' ? 'System' : 
                          response.agentId ? getAgentNameById(response.agentId) : 'ElizaOS'}
                      </span>
                      <span className="text-xs ml-auto text-slate-500">
                        {`${response.timestamp.getHours().toString().padStart(2, '0')}:${response.timestamp.getMinutes().toString().padStart(2, '0')}`}
                      </span>
                    </div>
                  )}
                  <div className={`text-sm whitespace-pre-wrap ${response.type === 'user' ? 'text-white' : ''}`}>
                    {response.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        </div>
        
        {/* Status indicator */}
        {characterMode && (
          <div className="px-4 py-1.5 bg-blue-900/20 border-t border-blue-800/30 flex items-center">
            <Bot className="h-3.5 w-3.5 text-blue-400 mr-1.5" />
            <span className="text-xs text-blue-400">
              Character Agent Mode: <span className="font-semibold">{getAgentNameById(selectedAgentId)}</span>
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-auto text-xs h-6 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 px-2"
              onClick={() => setCharacterMode(false)}
            >
              Disable
            </Button>
          </div>
        )}
        
        {/* Input area */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 rounded-b-lg">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input 
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={enabled 
                ? characterMode 
                  ? `Ask ${getAgentNameById(selectedAgentId)}...` 
                  : "Enter command or query..." 
                : "ElizaOS integration is disabled"}
              disabled={!enabled}
              className="flex-1 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!enabled || !command.trim()}
              className={`rounded-full ${!enabled ? 'bg-slate-800 text-slate-600' : ''}`}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
