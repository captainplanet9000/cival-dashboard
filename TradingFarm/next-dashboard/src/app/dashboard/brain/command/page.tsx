'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandCenter } from '@/components/ai/command-center';
import { Brain } from 'lucide-react';

export default function CommandCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Command Center</h1>
        <p className="text-muted-foreground">
          Interact with ElizaOS AI to manage your trading operations and access intelligence
        </p>
      </div>
      
      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader>
          <div className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            <CardTitle>ElizaOS Command Console</CardTitle>
          </div>
          <CardDescription>
            Use natural language to control your trading systems, query data, and receive market intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommandCenter />
        </CardContent>
      </Card>
    </div>
  );
}
