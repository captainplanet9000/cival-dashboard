"use client";

import { ElizaTerminal } from "@/components/eliza/ElizaTerminal";
import { Card } from "@/components/ui/card";

export default function ElizaTerminalPage() {
  return (
    <div className="container mx-auto px-4 py-6 flex-1 flex flex-col h-[calc(100vh-4rem)]" data-component-name="DashboardPage">
      <div className="flex flex-row items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">ElizaOS Terminal</h1>
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground ml-2 bg-primary/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-bot mr-1 h-3 w-3">
            <path d="M12 8V4H8"></path>
            <rect width="16" height="12" x="4" y="8" rx="2"></rect>
            <path d="M2 14h2"></path>
            <path d="M20 14h2"></path>
            <path d="M15 13v2"></path>
            <path d="M9 13v2"></path>
          </svg>
          AI Powered
        </div>
      </div>
      
      <div className="flex-1 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <ElizaTerminal />
      </div>
    </div>
  );
}
