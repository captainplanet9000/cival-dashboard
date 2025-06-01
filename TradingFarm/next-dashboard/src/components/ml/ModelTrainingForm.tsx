"use client"

import React from "react"
const { useState } = React
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/components/ui/icons"

export interface ModelTrainingFormProps {
  onModelTrained?: (data: any) => void
}

export function ModelTrainingForm({ onModelTrained }: ModelTrainingFormProps) {
  const [loading, setLoading] = useState(false)
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState("lstm")
  const [asset, setAsset] = useState("")
  const [timeframe, setTimeframe] = useState("1d")
  const [trainTestSplit, setTrainTestSplit] = useState(80)
  const [features, setFeatures] = useState<string[]>(["price", "volume"])
  const [useAdvancedFeatures, setUseAdvancedFeatures] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // In a real implementation, this would call an API to start model training
      const modelData = {
        modelName,
        modelType,
        asset,
        timeframe,
        trainTestSplit,
        features,
        useAdvancedFeatures,
        status: "training",
        startedAt: new Date().toISOString(),
        estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000).toISOString() // +30 min
      }
      
      if (onModelTrained) {
        onModelTrained(modelData)
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.error("Error training model:", error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Train New Model</CardTitle>
        <CardDescription>
          Create and train a custom machine learning model
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full gap-5">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="modelName">Model Name</Label>
              <Input 
                id="modelName" 
                placeholder="My Price Prediction Model" 
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="modelType">Model Type</Label>
              <Select value={modelType} onValueChange={setModelType} required>
                <SelectTrigger id="modelType">
                  <SelectValue placeholder="Select model type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="lstm">LSTM Neural Network</SelectItem>
                  <SelectItem value="gru">GRU Neural Network</SelectItem>
                  <SelectItem value="xgboost">XGBoost</SelectItem>
                  <SelectItem value="randomforest">Random Forest</SelectItem>
                  <SelectItem value="arima">ARIMA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="asset">Target Asset</Label>
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
                <Label htmlFor="timeframe">Data Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe} required>
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                    <SelectItem value="1w">1 Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="trainTestSplit">Train/Test Split: {trainTestSplit}%/{100-trainTestSplit}%</Label>
              </div>
              <Slider
                id="trainTestSplit"
                defaultValue={[80]}
                max={95}
                min={50}
                step={5}
                onValueChange={(value) => setTrainTestSplit(value[0])}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="advancedFeatures"
                checked={useAdvancedFeatures}
                onCheckedChange={setUseAdvancedFeatures}
              />
              <Label htmlFor="advancedFeatures">Include advanced technical indicators as features</Label>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={loading || !modelName || !asset}>
              {loading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Starting Training...
                </>
              ) : (
                "Train Model"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ModelTrainingForm
