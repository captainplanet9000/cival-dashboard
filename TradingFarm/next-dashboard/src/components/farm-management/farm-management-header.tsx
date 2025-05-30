"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface FarmManagementHeaderProps {
  connected: boolean;
  simulationMode: boolean;
  onToggleSimulation: () => void;
}

export function FarmManagementHeader({ 
  connected, 
  simulationMode, 
  onToggleSimulation 
}: FarmManagementHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Farm Management</h2>
        <div className="flex items-center space-x-2 ml-6">
          <Switch 
            id="simulation-mode" 
            checked={simulationMode} 
            onCheckedChange={onToggleSimulation} 
          />
          <Label htmlFor="simulation-mode">Simulation Mode</Label>
        </div>
      </div>
      <Badge 
        variant={connected ? "outline" : "destructive"} 
        className="ml-auto"
      >
        {connected ? "Connected" : "Disconnected"}
      </Badge>
    </div>
  );
}
