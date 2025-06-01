"use client"

import React from "react"
const { useState } = React
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/ui/icons"

export interface ModelPredictionFormProps {
  onPredict?: (data: any) => void
}

export function ModelPredictionForm({ onPredict }: ModelPredictionFormProps) {
  const [loading, setLoading] = useState(false)
  const [asset, setAsset] = useState("")
  const [timeframe, setTimeframe] = useState("1d")
  const [predictionType, setPredictionType] = useState("price")
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // In a real implementation, this would call the ML prediction API
      const predictionData = {
        asset,
        timeframe,
        predictionType,
        timestamp: new Date().toISOString(),
        result: Math.random() > 0.5 ? "bullish" : "bearish",
        confidence: (Math.random() * 100).toFixed(2)
      }
      
      if (onPredict) {
        onPredict(predictionData)
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("Error making prediction:", error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Prediction</CardTitle>
        <CardDescription>
          Use machine learning models to predict market movements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="asset">Asset</Label>
              <Select value={asset} onValueChange={setAsset} required>
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="SOL">Solana (SOL)</SelectItem>
                  <SelectItem value="AVAX">Avalanche (AVAX)</SelectItem>
                  <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="timeframe">Prediction Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe} required>
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="1w">1 Week</SelectItem>
                  <SelectItem value="1m">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="predictionType">Prediction Type</Label>
              <Select value={predictionType} onValueChange={setPredictionType} required>
                <SelectTrigger id="predictionType">
                  <SelectValue placeholder="Select prediction type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="price">Price Direction</SelectItem>
                  <SelectItem value="volatility">Volatility</SelectItem>
                  <SelectItem value="support">Support/Resistance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={loading || !asset}>
              {loading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Generate Prediction"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ModelPredictionForm
