/*
  Trading Farm Dashboard: ElizaOS Terminal
  -----------------------------------------------------
  - Feature Highlights:
    1. Focused ElizaOS AI Terminal integration
    2. Mobile & Desktop responsive design
    3. Real-time command processing
    4. Clean, modern UI with shadcn components
*/
'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ElizaTerminal } from '@/components/eliza/ElizaTerminal';

/**
 * Dashboard Page with ElizaOS Terminal
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-auto" data-component-name="DashboardPage">
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="flex flex-row items-center justify-between mb-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold tracking-tight">ElizaOS Terminal</h1>
            <Badge variant="outline" className="ml-2 bg-primary/10">
              <Bot className="mr-1 h-3 w-3" /> AI Powered
            </Badge>
          </div>
          <ThemeToggle />
        </div>
        
        {/* ElizaOS Terminal - Full screen responsive implementation */}
        <div className="flex-1 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
          <ElizaTerminal />
        </div>
      </div>
    </div>
  );
}
