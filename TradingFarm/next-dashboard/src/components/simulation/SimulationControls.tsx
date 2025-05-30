"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Play, Pause, SkipForward, RotateCcw, Clock, CalendarRange, BarChart2, 
  Settings, Info, ChevronRight, ChevronLeft, FastForward, Timer
} from "lucide-react";

interface SimulationControlsProps {
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onDataSourceChange: (source: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  isRunning: boolean;
  currentSpeed: number;
  currentDataSource: string;
  currentTimeframe: string;
}

export function SimulationControls({
  onStart,
  onPause,
  onReset,
  onSpeedChange,
  onDataSourceChange,
  onTimeframeChange,
  isRunning,
  currentSpeed,
  currentDataSource,
  currentTimeframe
}: SimulationControlsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Available data sources
  const dataSources = [
    { value: "historical", label: "Historical Data" },
    { value: "synthetic", label: "Synthetic Data" },
    { value: "mixed", label: "Mixed (Historical + Synthetic)" },
    { value: "custom", label: "Custom Scenario" }
  ];

  // Available timeframes
  const timeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Simulation Controls</CardTitle>
        <CardDescription>
          Configure and control the market simulation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-2">
          <Button
            variant={isRunning ? "outline" : "default"}
            size="icon"
            onClick={isRunning ? onPause : onStart}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" disabled={!isRunning}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Skip forward 50 candles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" disabled={!isRunning}>
                  <FastForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Run to completion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="simulation-speed" className="flex items-center">
                <Timer className="h-4 w-4 mr-2" />
                <span>Simulation Speed</span>
              </Label>
              <span className="text-sm text-muted-foreground">{currentSpeed}x</span>
            </div>
            <Slider
              id="simulation-speed"
              min={1}
              max={100}
              step={1}
              value={[currentSpeed]}
              onValueChange={(value) => onSpeedChange(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-source" className="flex items-center">
                <BarChart2 className="h-4 w-4 mr-2" />
                <span>Data Source</span>
              </Label>
              <Select value={currentDataSource} onValueChange={onDataSourceChange}>
                <SelectTrigger id="data-source">
                  <SelectValue placeholder="Data Source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Timeframe</span>
              </Label>
              <Select value={currentTimeframe} onValueChange={onTimeframeChange}>
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((timeframe) => (
                    <SelectItem key={timeframe.value} value={timeframe.value}>
                      {timeframe.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <span className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </span>
            {isAdvancedOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          {isAdvancedOpen && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-noise" className="flex items-center gap-2">
                  <span>Add Market Noise</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add random noise to simulate market volatility</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Switch id="enable-noise" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-news" className="flex items-center gap-2">
                  <span>Include News Events</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Simulate news events that impact the market</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Switch id="include-news" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="realistic-slippage" className="flex items-center gap-2">
                  <span>Simulate Slippage</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Simulate realistic order execution with slippage</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Switch id="realistic-slippage" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="record-simulation" className="flex items-center gap-2">
                  <span>Record Simulation</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save simulation results for later analysis</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Switch id="record-simulation" />
              </div>

              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Scenario
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
