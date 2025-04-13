'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CommandConsole } from '@/components/elizaos/command-console';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Bot, Database, PlusCircle, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

// Mock data for farms
const MOCK_FARMS = [
  { id: 1, name: 'Crypto Trading Farm', type: 'crypto' },
  { id: 2, name: 'Stock Trading Farm', type: 'stock' },
  { id: 3, name: 'DeFi Yield Farm', type: 'defi' },
];

export default function CommandConsolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Get farmId from URL or default to the first farm
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    searchParams.get('farmId') || '1'
  );
  
  // Console settings
  const [consoleHeight, setConsoleHeight] = useState<'compact' | 'normal' | 'full'>('full');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  
  // Select a different farm
  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    
    // Update URL with the new farmId
    const params = new URLSearchParams(searchParams.toString());
    params.set('farmId', farmId);
    
    router.push(`/dashboard/command?${params.toString()}`);
  };
  
  // Save current console as a conversation
  const handleSaveConversation = () => {
    // This would save the current conversation to the database
    // For now, just show a toast
    toast({
      title: 'Conversation Saved',
      description: 'Your conversation has been saved and can be referenced later.',
    });
  };
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Bot className="mr-2 h-7 w-7 text-primary" />
            ElizaOS Command Console
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your trading farm using conversational AI commands
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Button onClick={handleSaveConversation}>
            <Save className="mr-2 h-4 w-4" />
            Save Conversation
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Farm Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Trading Farm</CardTitle>
              <CardDescription>Choose which farm to interact with</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedFarmId} onValueChange={handleFarmChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a farm" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_FARMS.map(farm => (
                    <SelectItem key={farm.id} value={String(farm.id)}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-4">
                <Link href="/dashboard/farms">
                  <Button variant="outline" size="sm" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Farm
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          {/* Console Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Console Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Console Height</label>
                <Tabs 
                  value={consoleHeight} 
                  onValueChange={(value) => setConsoleHeight(value as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="compact">Compact</TabsTrigger>
                    <TabsTrigger value="normal">Normal</TabsTrigger>
                    <TabsTrigger value="full">Full</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-scroll"
                  checked={autoScroll}
                  onChange={() => setAutoScroll(!autoScroll)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="auto-scroll" className="text-sm font-medium">
                  Auto-scroll to new messages
                </label>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Commands */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Commands</CardTitle>
              <CardDescription>Common operations for this farm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" onClick={() => {}}>
                Show current positions
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" onClick={() => {}}>
                Show farm performance
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" onClick={() => {}}>
                List active agents
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" onClick={() => {}}>
                Search knowledge base
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-9">
          {/* Main Console */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Farm: {MOCK_FARMS.find(f => String(f.id) === selectedFarmId)?.name || `Farm ${selectedFarmId}`}
              </CardTitle>
              <CardDescription>
                Use natural language to manage your trading operations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CommandConsole 
                farmId={selectedFarmId} 
                height={consoleHeight}
                autoScroll={autoScroll}
                className="border-0 rounded-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
