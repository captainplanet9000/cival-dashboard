"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PlusCircle, 
  ListTree, 
  ActivitySquare, 
  Bot, 
  Pause, 
  Play, 
  UsersRound, 
  LineChart, 
  Cpu,
  Workflow,
  Zap,
  TimerReset
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFarmManagement } from './farm-management-provider';
import { TRADING_EVENTS } from '@/constants/socket-events';

// Custom event for farm command shortcuts
export const FARM_COMMAND_EVENTS = {
  SHORTCUT_CLICKED: 'farmCommandShortcutClicked',
};

// Event emitter for command shortcuts
export const emitCommandShortcut = (command: string) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('shortcutClicked', {
      detail: { command }
    });
    window.dispatchEvent(event);
  }
};

export interface FarmCommandShortcutsProps {
  className?: string;
}

export function FarmCommandShortcuts({ className }: FarmCommandShortcutsProps) {
  const { farmData, initialized, loading, error } = useFarmManagement();
  
  const COMMAND_SHORTCUTS = [
    {
      category: "Farm Management",
      commands: [
        { label: "Create Farm", command: "create farm", icon: <PlusCircle className="h-4 w-4 mr-2" /> },
        { label: "List Farms", command: "list farms", icon: <ListTree className="h-4 w-4 mr-2" /> },
        { label: "Farm Status", command: "farm status", icon: <ActivitySquare className="h-4 w-4 mr-2" /> },
        { label: "BossMan Status", command: "bossman status", icon: <Bot className="h-4 w-4 mr-2" /> }
      ]
    },
    {
      category: "Farm Operations",
      commands: [
        { label: "Pause All", command: "pause all farms", icon: <Pause className="h-4 w-4 mr-2" /> },
        { label: "Activate All", command: "activate all farms", icon: <Play className="h-4 w-4 mr-2" /> },
        { label: "Agent Overview", command: "list agents", icon: <UsersRound className="h-4 w-4 mr-2" /> },
        { label: "Performance", command: "show farm performance", icon: <LineChart className="h-4 w-4 mr-2" /> }
      ]
    },
    {
      category: "Advanced",
      commands: [
        { label: "Configure Farm", command: "configure farm", icon: <Cpu className="h-4 w-4 mr-2" /> },
        { label: "Workflow Status", command: "workflow status", icon: <Workflow className="h-4 w-4 mr-2" /> },
        { label: "Quick Deploy", command: "deploy strategy", icon: <Zap className="h-4 w-4 mr-2" /> },
        { label: "Reset Metrics", command: "reset farm metrics", icon: <TimerReset className="h-4 w-4 mr-2" /> }
      ]
    }
  ];

  // Emit the shortcut command event
  const handleShortcutClick = (command: string) => {
    emitCommandShortcut(command);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Command Shortcuts</CardTitle>
        <CardDescription>Quick access to common farm commands</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[360px] px-4">
          {COMMAND_SHORTCUTS.map((category, index) => (
            <div key={index} className="mb-6">
              <h3 className="text-sm font-medium mb-2 px-2">{category.category}</h3>
              <div className="grid grid-cols-2 gap-2">
                {category.commands.map((cmd, cmdIndex) => (
                  <Button
                    key={cmdIndex}
                    variant="outline"
                    className="justify-start h-auto py-2"
                    onClick={() => handleShortcutClick(cmd.command)}
                  >
                    {cmd.icon}
                    <span className="text-xs">{cmd.label}</span>
                  </Button>
                ))}
              </div>
              {index < COMMAND_SHORTCUTS.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
