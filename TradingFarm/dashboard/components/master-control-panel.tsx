"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ElizaOSCommandConsole } from "./elizaos-command-console"
import {
  Power,
  AlertCircle,
  Clock,
  Percent,
  DollarSign,
  ShieldCheck,
  Settings,
  Activity,
  Share2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart4,
  Database,
  Network,
  BrainCircuit
} from "lucide-react"

export interface MasterControlPanelProps {
  autoTradingEnabled?: boolean
  elizaosIntegrationEnabled?: boolean
  riskManagerEnabled?: boolean
  onAutoTradingToggle?: (enabled: boolean) => void
  onElizaosIntegrationToggle?: (enabled: boolean) => void
  onRiskManagerToggle?: (enabled: boolean) => void
}

export interface Exchange {
  id: string
  name: string
  connected: boolean
  health: string
}

export function MasterControlPanel({
  autoTradingEnabled: initialAutoTradingEnabled = false,
  elizaosIntegrationEnabled: initialElizaosIntegrationEnabled = true,
  riskManagerEnabled: initialRiskManagerEnabled = true,
  onAutoTradingToggle,
  onElizaosIntegrationToggle,
  onRiskManagerToggle
}: MasterControlPanelProps) {
  // Local state management with callbacks to parent
  const [autoTradingEnabled, setAutoTradingEnabled] = React.useState(initialAutoTradingEnabled)
  const [elizaosIntegrationEnabled, setElizaosIntegrationEnabled] = React.useState(initialElizaosIntegrationEnabled)
  const [riskManagerEnabled, setRiskManagerEnabled] = React.useState(initialRiskManagerEnabled)
  
  const [maxDrawdown, setMaxDrawdown] = React.useState(15)
  const [positionSizing, setPositionSizing] = React.useState(5)
  const [stopLossType, setStopLossType] = React.useState("trailing")
  
  const [exchanges, setExchanges] = React.useState<Exchange[]>([
    { id: "binance", name: "Binance", connected: true, health: "good" },
    { id: "coinbase", name: "Coinbase", connected: true, health: "good" },
    { id: "kraken", name: "Kraken", connected: false, health: "offline" },
    { id: "kucoin", name: "KuCoin", connected: true, health: "degraded" }
  ])
  
  // Handle toggle changes with callback to parent
  const handleAutoTradingToggle = (value: boolean) => {
    setAutoTradingEnabled(value)
    onAutoTradingToggle?.(value)
  }
  
  const handleElizaosIntegrationToggle = (value: boolean) => {
    setElizaosIntegrationEnabled(value)
    onElizaosIntegrationToggle?.(value)
  }
  
  const handleRiskManagerToggle = (value: boolean) => {
    setRiskManagerEnabled(value)
    onRiskManagerToggle?.(value)
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Controls Card */}
        <Card className="app-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-500 text-xs uppercase font-medium">System Controls</CardDescription>
            <CardTitle className="text-xl font-semibold text-gray-900">Farm Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Power className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Auto-Trading</div>
                    <div className="text-gray-500 text-sm">Run strategies automatically</div>
                  </div>
                </div>
                <Switch 
                  checked={autoTradingEnabled} 
                  onCheckedChange={handleAutoTradingToggle}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <BrainCircuit className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">ElizaOS Integration</div>
                    <div className="text-gray-500 text-sm">AI-enhanced trading</div>
                  </div>
                </div>
                <Switch 
                  checked={elizaosIntegrationEnabled} 
                  onCheckedChange={handleElizaosIntegrationToggle}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 p-2 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Risk Manager</div>
                    <div className="text-gray-500 text-sm">Protect your capital</div>
                  </div>
                </div>
                <Switch 
                  checked={riskManagerEnabled} 
                  onCheckedChange={handleRiskManagerToggle}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Risk Management Card */}
        <Card className="app-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-500 text-xs uppercase font-medium">Risk Management</CardDescription>
            <CardTitle className="text-xl font-semibold text-gray-900">Trading Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-500">Max Drawdown</Label>
                  <span className="text-sm font-medium text-gray-900">{maxDrawdown}%</span>
                </div>
                <Slider
                  value={[maxDrawdown]}
                  min={5}
                  max={50}
                  step={1}
                  onValueChange={(value: number[]) => setMaxDrawdown(value[0])}
                  className="mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-500">Position Sizing</Label>
                  <span className="text-sm font-medium text-gray-900">{positionSizing}%</span>
                </div>
                <Slider
                  value={[positionSizing]}
                  min={1}
                  max={25}
                  step={1}
                  onValueChange={(value: number[]) => setPositionSizing(value[0])}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">Stop Loss Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={stopLossType === "fixed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStopLossType("fixed")}
                    className={stopLossType === "fixed" ? "bg-blue-600" : "text-gray-700 border-gray-200"}
                  >
                    Fixed
                  </Button>
                  <Button 
                    variant={stopLossType === "trailing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStopLossType("trailing")}
                    className={stopLossType === "trailing" ? "bg-blue-600" : "text-gray-700 border-gray-200"}
                  >
                    Trailing
                  </Button>
                  <Button 
                    variant={stopLossType === "smart" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStopLossType("smart")}
                    className={stopLossType === "smart" ? "bg-blue-600" : "text-gray-700 border-gray-200"}
                  >
                    Smart
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Exchange Connections Card */}
        <Card className="app-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-500 text-xs uppercase font-medium">Exchange Connections</CardDescription>
            <CardTitle className="text-xl font-semibold text-gray-900">API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exchanges.map((exchange: Exchange) => (
                <div key={exchange.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${exchange.connected ? (exchange.health === "good" ? "bg-green-100" : "bg-amber-100") : "bg-red-100"}`}>
                      {exchange.connected ? (
                        exchange.health === "good" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        )
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="font-medium text-gray-900">{exchange.name}</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`border-gray-200 hover:bg-gray-50 ${exchange.connected ? "text-gray-700" : "text-blue-600"}`}
                  >
                    {exchange.connected ? "Settings" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* ElizaOS Terminal Card */}
      <Card className="app-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-gray-500 text-xs uppercase font-medium">AI Command Center</CardDescription>
              <CardTitle className="text-xl font-semibold text-gray-900">ElizaOS Terminal</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 text-xs font-medium rounded-full ${elizaosIntegrationEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                AI {elizaosIntegrationEnabled ? "Active" : "Inactive"}
              </div>
            </div>
          </div>
          <CardDescription>Interact with ElizaOS AI through natural language</CardDescription>
        </CardHeader>
        <CardContent>
          <ElizaOSCommandConsole enabled={elizaosIntegrationEnabled} />
        </CardContent>
      </Card>
    </div>
  )
}
