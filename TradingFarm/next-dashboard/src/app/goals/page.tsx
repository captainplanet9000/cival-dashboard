/**
 * Goals Dashboard Page
 * Main page for managing trading goals with ElizaOS agents
 */
import React from 'react';
import Link from 'next/link';
import { GoalsDashboard } from '@/components/goals/GoalsDashboard';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Target, Bot } from 'lucide-react';

export const metadata = {
  title: 'Trading Farm - Goals Dashboard',
  description: 'Manage trading goals and objectives with ElizaOS agents',
};

export default function GoalsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="Trading Goals"
        description="Create and manage goal-based trading objectives powered by ElizaOS"
        actions={
          <Link href="/goals/create">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>New Goal</span>
            </Button>
          </Link>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <GoalsDashboard />
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium">About Trading Goals</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Trading goals allow you to set specific trading objectives and leverage ElizaOS agents to achieve them automatically.
            </p>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <div className="rounded-full h-5 w-5 bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs text-primary">1</span>
                </div>
                <span>Create specific asset acquisition targets</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full h-5 w-5 bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs text-primary">2</span>
                </div>
                <span>Assign intelligent ElizaOS agents to execute strategies</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full h-5 w-5 bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs text-primary">3</span>
                </div>
                <span>Monitor execution progress and performance</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full h-5 w-5 bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs text-primary">4</span>
                </div>
                <span>Achieve autonomous trading with defined objectives</span>
              </li>
            </ul>
            
            <div className="mt-6 pt-6 border-t">
              <Link href="/docs/trading-goals">
                <Button variant="outline" size="sm" className="w-full">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium">ElizaOS Integration</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Trading goals are powered by ElizaOS intelligent agents that can analyze markets, execute trades, and optimize for your objectives.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Agent Marketplace</span>
                </div>
                <Link href="/agents">
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Farm Coordination</span>
                </div>
                <Link href="/farms">
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">Knowledge Base</span>
                </div>
                <Link href="/knowledge">
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
